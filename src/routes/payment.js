const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { initializeTransaction, verifyTransaction, verifyWebhookSignature } = require('../services/paystack');
const { sendSourceCodeDeliveryEmail, sendSupportThankYouEmail, sendAdminPaymentAlert } = require('../services/email');
const { getTableData } = require('../db');

const router = express.Router();

const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || process.env.JWT_SECRET || 'calebyte_jwt_secure_download_2026';
const STORAGE_DIR = path.join(__dirname, '../../storage/codebases');

// Ensure storage folder exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Helper to get backend base URL
 */
function getBackendBaseUrl(req) {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL.replace(/\/$/, '');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

/**
 * Helper to get frontend return URL
 */
function getFrontendUrl() {
  const front = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://anayolico.name.ng';
  return front.replace(/\/$/, '');
}

/**
 * Helper to map projects & prices
 */
async function resolveProjectDetails(projectId) {
  const defaultMap = {
    '1': { id: '1', title: 'CaleByte AI Agent Source Code', filename: 'calebyte-ai.zip', price: 15000 },
    'calebyte-ai': { id: '1', title: 'CaleByte AI Agent Source Code', filename: 'calebyte-ai.zip', price: 15000 },
    '2': { id: '2', title: 'Browser Cookie & Key Decryption Engine', filename: 'Browser Decryption.zip', price: 15000 },
    'cookie-decryption': { id: '2', title: 'Browser Cookie & Key Decryption Engine', filename: 'Browser Decryption.zip', price: 15000 }
  };

  try {
    const list = await getTableData('source_codes');
    if (Array.isArray(list) && list.length > 0) {
      const match = list.find(p => String(p.id) === String(projectId) || p.slug === projectId);
      if (match) {
        return {
          id: match.id,
          title: match.title || 'Source Code Package',
          filename: match.filename || `project-${match.id}.zip`,
          price: Number(match.price) || 15000
        };
      }
    }
  } catch (e) {}

  return defaultMap[projectId] || {
    id: projectId || 'custom',
    title: 'CaleByte Source Code Package',
    filename: 'source-code.zip',
    price: 15000
  };
}

/**
 * 1. POST /api/paystack/initialize (Method 3: Server-to-Server Initialization)
 */
router.post('/initialize', async (req, res) => {
  try {
    const { email, amount, type, projectId, name } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const frontendUrl = getFrontendUrl();
    const isSourceCode = type === 'source_code';

    let finalAmountInKobo = 0;
    let metadata = {};
    let referencePrefix = 'CB';

    if (isSourceCode) {
      const project = await resolveProjectDetails(projectId);
      finalAmountInKobo = project.price * 100; // NGN to Kobo
      referencePrefix = 'CB_SRC';
      metadata = {
        type: 'source_code',
        projectId: project.id,
        projectTitle: project.title,
        filename: project.filename,
        buyerEmail: email.trim(),
        priceNgn: project.price,
        custom_fields: [
          { display_name: 'Product', variable_name: 'product_name', value: project.title },
          { display_name: 'Order Type', variable_name: 'order_type', value: 'Source Code Marketplace' }
        ]
      };
    } else {
      // Support donation
      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount < 100) {
        return res.status(400).json({ success: false, error: 'Support amount must be at least ₦100.' });
      }
      finalAmountInKobo = Math.round(parsedAmount * 100);
      referencePrefix = 'CB_SUP';
      metadata = {
        type: 'support',
        supporterName: (name && name.trim()) || 'Generous Supporter',
        supporterEmail: email.trim(),
        amountNgn: parsedAmount,
        custom_fields: [
          { display_name: 'Supporter Name', variable_name: 'supporter_name', value: (name && name.trim()) || 'Supporter' },
          { display_name: 'Donation Type', variable_name: 'donation_type', value: 'Portfolio Developer Support' }
        ]
      };
    }

    const uniqueRef = `${referencePrefix}_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
    const callbackUrl = `${frontendUrl}/checkout-success?reference=${uniqueRef}`;

    const paystackResponse = await initializeTransaction({
      email: email.trim(),
      amountInKobo: finalAmountInKobo,
      reference: uniqueRef,
      callbackUrl,
      metadata
    });

    return res.json({
      success: true,
      authorizationUrl: paystackResponse.authorization_url,
      reference: paystackResponse.reference || uniqueRef
    });
  } catch (err) {
    console.error('[Payment Initialize Error]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Could not initialize payment with Paystack.'
    });
  }
});

/**
 * 2. GET /api/paystack/verify/:reference
 */
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  if (!reference) {
    return res.status(400).json({ success: false, error: 'Transaction reference is missing.' });
  }

  try {
    const tx = await verifyTransaction(reference);

    if (tx.status !== 'success') {
      return res.status(400).json({
        success: false,
        verified: false,
        message: tx.gateway_response || 'Payment was not completed successfully.'
      });
    }

    const metadata = tx.metadata || {};
    const isSourceCode = metadata.type === 'source_code';
    const backendBase = getBackendBaseUrl(req);

    if (isSourceCode) {
      const project = await resolveProjectDetails(metadata.projectId);
      const token = jwt.sign(
        {
          reference: tx.reference,
          projectId: project.id,
          projectTitle: project.title,
          filename: project.filename,
          email: tx.customer?.email || metadata.buyerEmail,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        },
        DOWNLOAD_SECRET
      );

      const downloadUrl = `${backendBase}/api/download/source-code?token=${token}`;

      return res.json({
        success: true,
        verified: true,
        type: 'source_code',
        projectTitle: project.title,
        amount: (tx.amount || 0) / 100,
        email: tx.customer?.email || metadata.buyerEmail,
        reference: tx.reference,
        downloadUrl
      });
    } else {
      // Support confirmation
      return res.json({
        success: true,
        verified: true,
        type: 'support',
        supporterName: metadata.supporterName || 'Supporter',
        amount: (tx.amount || 0) / 100,
        email: tx.customer?.email || metadata.supporterEmail,
        reference: tx.reference
      });
    }
  } catch (err) {
    console.error('[Payment Verify Error]', err.message);
    return res.status(500).json({
      success: false,
      verified: false,
      error: err.message || 'Verification could not be processed.'
    });
  }
});

/**
 * 3. POST /api/paystack/webhook (Automated Fulfillment Fail-Safe)
 */
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  // @ts-ignore - rawBody is attached by express.json verify callback in server.js
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!verifyWebhookSignature(signature, rawBody)) {
    console.warn('[Webhook Warning] Invalid Paystack signature received.');
    return res.sendStatus(401);
  }

  // Acknowledge Paystack immediately to prevent retries
  res.sendStatus(200);

  const eventData = req.body;
  if (eventData && eventData.event === 'charge.success') {
    const data = eventData.data || {};
    const metadata = data.metadata || {};
    const reference = data.reference;
    const email = data.customer?.email || metadata.buyerEmail || metadata.supporterEmail;
    const amount = (data.amount || 0) / 100;
    const backendBase = process.env.BACKEND_URL || 'https://calebyte-tech.onrender.com';

    console.log(`[Paystack Webhook] Verified payment of ₦${amount} (Ref: ${reference})`);

    try {
      if (metadata.type === 'source_code') {
        const project = await resolveProjectDetails(metadata.projectId);
        const token = jwt.sign(
          {
            reference,
            projectId: project.id,
            projectTitle: project.title,
            filename: project.filename,
            email,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
          },
          DOWNLOAD_SECRET
        );

        const downloadUrl = `${backendBase}/api/download/source-code?token=${token}`;

        // Send customer delivery email
        await sendSourceCodeDeliveryEmail({
          email,
          projectTitle: project.title,
          downloadUrl,
          reference,
          amount
        });

        // Send Caleb notification
        await sendAdminPaymentAlert({
          type: 'source_code',
          amount,
          email,
          reference,
          details: project.title
        });
      } else if (metadata.type === 'support') {
        // Send supporter thank you
        await sendSupportThankYouEmail({
          email,
          supporterName: metadata.supporterName,
          amount,
          reference
        });

        // Send Caleb donation alert
        await sendAdminPaymentAlert({
          type: 'support',
          amount,
          email,
          reference,
          details: `Donation from ${metadata.supporterName || 'Supporter'}`
        });
      }
    } catch (deliveryErr) {
      console.error('[Webhook Fulfillment Error]', deliveryErr.message);
    }
  }
});

/**
 * 4. GET /api/download/source-code (Secure Token-Protected ZIP Download)
 */
router.get('/source-code', (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(401).send('<h1>401 Unauthorized</h1><p>Missing download token.</p>');
  }

  jwt.verify(token, DOWNLOAD_SECRET, (err, decoded) => {
    if (err || !decoded || typeof decoded === 'string') {
      return res.status(403).send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #0c0f17; color: #fff;">
          <h2 style="color: #f87171;">Download Link Expired or Invalid</h2>
          <p style="color: #94a3b8;">For your security, download links expire after 24 hours.</p>
          <p style="color: #94a3b8;">Please reply to your order confirmation email or contact <a href="mailto:acnwa1234@gmail.com" style="color: #17a2b8;">acnwa1234@gmail.com</a> with your order reference to refresh your download link.</p>
        </div>
      `);
    }

    const filename = decoded.filename || 'source-code.zip';
    const filePath = path.join(STORAGE_DIR, filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.download(filePath, filename);
    }

    // Graceful fallback if file is not yet dropped into storage folder
    const fallbackReadme = `
========================================================================
           ${decoded.projectTitle || 'CaleByte Technologies Codebase'}
========================================================================
Order Reference: ${decoded.reference}
Purchased by:    ${decoded.email}
Delivered by:    CaleByte Technologies (Caleb Anayolico)

Thank you for purchasing!
Your codebase download package is being synchronized. 
If your download does not start automatically, please email:
acnwa1234@gmail.com with Reference: ${decoded.reference}

Official Developer Portfolio: https://anayolico.name.ng
========================================================================
    `.trim();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${decoded.projectId || 'calebyte'}-order-receipt.txt"`);
    return res.send(fallbackReadme);
  });
});

module.exports = router;
