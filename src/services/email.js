const https = require('https');
const { Resolver } = require('dns');

const dnsResolver = new Resolver();
try {
  dnsResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

/**
 * Low-level Resend HTTPS sender with DNS fallback.
 */
async function sendResendEmail({ from, to, replyTo, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  return new Promise((resolve) => {
    dnsResolver.resolve4('api.resend.com', (err, addresses) => {
      const targetHost = (!err && addresses && addresses.length > 0) ? addresses[0] : 'api.resend.com';
      const isIp = /^[0-9.]+$/.test(targetHost);

      const payloadObj = {
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      };
      if (replyTo) payloadObj.reply_to = replyTo;

      const payload = JSON.stringify(payloadObj);

      const options = {
        hostname: targetHost,
        port: 443,
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      if (isIp) {
        options.headers['Host'] = 'api.resend.com';
        options.servername = 'api.resend.com';
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ data: json, error: null });
            } else {
              resolve({ data: null, error: json });
            }
          } catch (e) {
            resolve({ data: null, error: { message: body } });
          }
        });
      });

      req.on('error', (reqErr) => {
        resolve({ data: null, error: { message: reqErr.message } });
      });

      req.write(payload);
      req.end();
    });
  });
}

/**
 * Send an email via Resend with automatic fallback to onboarding@resend.dev
 * if the custom domain sender is unverified.
 */
async function sendEmailWithFallback({ to, replyTo, subject, html }) {
  const customFrom = process.env.RESEND_DEFAULT_FROM || 'anayolico@anayolico.name.ng';
  let result = await sendResendEmail({
    from: customFrom,
    to,
    replyTo,
    subject,
    html
  });

  if (result.error && customFrom !== 'onboarding@resend.dev') {
    console.warn('[Resend Fallback] Custom sender failed, retrying with onboarding@resend.dev:', result.error?.message || result.error);
    result = await sendResendEmail({
      from: 'onboarding@resend.dev',
      to,
      replyTo,
      subject,
      html
    });
  }

  return result;
}

module.exports = { sendResendEmail, sendEmailWithFallback };
