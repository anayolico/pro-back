const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { initializeTransaction, verifyTransaction, verifyWebhookSignature } = require('../services/paystack');
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
 * Helper to get project details directly from the database source_codes table
 */
async function resolveProjectDetails(projectId) {
  try {
    const list = await getTableData('source_codes');
    if (Array.isArray(list) && list.length > 0) {
      const match = list.find(p => String(p.id) === String(projectId) || p.slug === projectId);
      if (match) {
        return {
          id: match.id,
          title: match.title,
          filename: match.filename,
          price: Number(match.price) || 0,
          download_link: match.download_link || match.downloadLink || ''
        };
      }
    }
  } catch (e) {
    console.error('[DB Error in resolveProjectDetails]:', e.message);
  }

  return null;
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
      if (!project) {
        return res.status(404).json({ success: false, error: 'Source code project not found in database.' });
      }
      finalAmountInKobo = (project.price || 15000) * 100; // NGN to Kobo
      referencePrefix = 'CB_SRC';
      metadata = {
        type: 'source_code',
        projectId: project.id,
        projectTitle: project.title,
        filename: project.filename,
        download_link: project.download_link,
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
      const downloadUrl = project?.download_link || metadata.download_link || metadata.downloadLink || '';

      return res.json({
        success: true,
        verified: true,
        type: 'source_code',
        projectTitle: project?.title || metadata.projectTitle || 'Source Code Package',
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
    const reference = data.reference;
    const amount = (data.amount || 0) / 100;

    console.log(`[Paystack Webhook] Verified payment of ₦${amount} (Ref: ${reference})`);
  }
});

/**
 * 4. GET /api/download/source-code (Secure Redirect to Google Drive or Local ZIP)
 */
router.get('/source-code', (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(401).send('<h1>401 Unauthorized</h1><p>Missing download token.</p>');
  }

  jwt.verify(token, DOWNLOAD_SECRET, async (err, decoded) => {
    if (err || !decoded || typeof decoded === 'string') {
      return res.status(403).send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #0c0f17; color: #fff;">
          <h2 style="color: #f87171;">Download Link Expired or Invalid</h2>
          <p style="color: #94a3b8;">For your security, download links expire after 24 hours.</p>
          <p style="color: #94a3b8;">Please reply to your order confirmation email or contact <a href="mailto:acnwa1234@gmail.com" style="color: #17a2b8;">acnwa1234@gmail.com</a> with your order reference to refresh your download link.</p>
        </div>
      `);
    }

    // Direct redirect to database Google Drive link
    const project = await resolveProjectDetails(decoded.projectId);
    const driveLink = project?.download_link || decoded.download_link;
    if (driveLink && driveLink !== '#' && driveLink.startsWith('http')) {
      return res.redirect(driveLink);
    }

    const filename = decoded.filename || 'source-code.zip';
    const filePath = path.join(STORAGE_DIR, filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.download(filePath, filename);
    }

    return res.status(404).send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #0c0f17; color: #fff;">
        <h2 style="color: #f87171;">Download Link Unavailable</h2>
        <p style="color: #94a3b8;">Please contact <a href="mailto:acnwa1234@gmail.com" style="color: #17a2b8;">acnwa1234@gmail.com</a> with Reference: ${decoded.reference}.</p>
      </div>
    `);
  });
});

module.exports = router;
