const https = require('https');
const crypto = require('crypto');
const dns = require('dns');

// DNS resolver configured for rapid fallback
const dnsResolver = new dns.Resolver();
try {
  dnsResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

/**
 * Paystack Service Helper
 * High-speed datacenter communication with https://api.paystack.co
 */

const PAYSTACK_HOST = 'api.paystack.co';

function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || '';
  return key.trim();
}

/**
 * Perform HTTPS requests to Paystack API with reliable DNS resolution
 */
function paystackRequest({ method, path, data = null }) {
  const secretKey = getPaystackSecretKey();

  return new Promise((resolve, reject) => {
    if (!secretKey) {
      return reject(new Error('PAYSTACK_SECRET_KEY is not configured on the backend server.'));
    }

    const payload = data ? JSON.stringify(data) : null;

    dnsResolver.resolve4(PAYSTACK_HOST, (err, addresses) => {
      const targetHost = (!err && addresses && addresses.length > 0) ? addresses[0] : PAYSTACK_HOST;
      const isIp = /^[0-9.]+$/.test(targetHost);

      const headers = {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CaleByte-Technologies-Portfolio/1.0'
      };

      if (payload) {
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const options = {
        hostname: targetHost,
        port: 443,
        path,
        method,
        headers,
        timeout: 15000
      };

      if (isIp) {
        options.headers['Host'] = PAYSTACK_HOST;
        options.servername = PAYSTACK_HOST;
      }

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => { responseBody += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.status === true) {
              resolve(parsed.data || parsed);
            } else {
              const errorMsg = parsed.message || `Paystack request failed with status ${res.statusCode}`;
              reject(new Error(errorMsg));
            }
          } catch (parseErr) {
            reject(new Error(`Failed to parse Paystack response: ${responseBody.slice(0, 150)}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Paystack request timed out after 15 seconds.'));
      });

      req.on('error', (reqErr) => {
        reject(reqErr);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

/**
 * Initialize a transaction server-to-server (Method 3)
 */
async function initializeTransaction({ email, amountInKobo, reference, callbackUrl, metadata = {} }) {
  if (!email) throw new Error('Customer email is required.');
  if (!amountInKobo || amountInKobo < 10000) { // minimum 100 NGN = 10,000 kobo
    throw new Error('Amount must be at least 100 NGN (10,000 kobo).');
  }

  const payload = {
    email: email.trim(),
    amount: Math.round(amountInKobo),
    reference: reference || `CB_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    callback_url: callbackUrl,
    metadata
  };

  return paystackRequest({
    method: 'POST',
    path: '/transaction/initialize',
    data: payload
  });
}

/**
 * Verify a transaction by reference
 */
async function verifyTransaction(reference) {
  if (!reference) throw new Error('Transaction reference is required.');
  return paystackRequest({
    method: 'GET',
    path: `/transaction/verify/${encodeURIComponent(reference)}`
  });
}

/**
 * Verify Paystack Webhook HMAC SHA512 signature
 */
function verifyWebhookSignature(signature, rawBody) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature || !rawBody) return false;

  try {
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  } catch (err) {
    console.error('[Paystack Signature Error]', err);
    return false;
  }
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  getPaystackSecretKey
};
