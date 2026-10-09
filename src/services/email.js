const https = require('https');
const dns = require('dns');

const dnsResolver = new dns.Resolver();
try {
  dnsResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

/**
 * Resend Email Dispatcher Helper
 * @param {Object} options
 * @param {string} [options.from] - Sender email address (optional, defaults to RESEND_DEFAULT_FROM)
 * @param {string|string[]} options.to - Recipient email address or list of addresses
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - Email HTML content
 */
async function sendEmail({ from = undefined, to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email Warning] RESEND_API_KEY is not configured. Email skipped.');
    return { skipped: true };
  }

  const senderEmail = from || process.env.RESEND_DEFAULT_FROM || 'CaleByte Technologies <onboarding@resend.dev>';
  const recipients = Array.isArray(to) ? to : [to];

  return new Promise((resolve) => {
    dnsResolver.resolve4('api.resend.com', (err, addresses) => {
      const targetHost = (!err && addresses && addresses.length > 0) ? addresses[0] : 'api.resend.com';
      const isIp = /^[0-9.]+$/.test(targetHost);

      const payload = JSON.stringify({
        from: senderEmail,
        to: recipients,
        subject,
        html
      });

      const options = {
        hostname: targetHost,
        port: 443,
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 10000
      };

      if (isIp) {
        options.headers['Host'] = 'api.resend.com';
        options.servername = 'api.resend.com';
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Email Sent] Successfully delivered to ${recipients.join(', ')}`);
            resolve({ success: true });
          } else {
            console.warn(`[Email Notice] Resend status ${res.statusCode}: ${body.slice(0, 150)}`);
            resolve({ success: false, status: res.statusCode });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, timeout: true });
      });

      req.on('error', (err) => {
        console.warn('[Email Notice] Network error delivering email:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(payload);
      req.end();
    });
  });
}

/**
 * Send automated source code purchase delivery email
 * @param {Object} options
 * @param {string} options.email
 * @param {string} options.projectTitle
 * @param {string} options.downloadUrl
 * @param {string} options.reference
 * @param {number} [options.amount=15000]
 */
async function sendSourceCodeDeliveryEmail({ email, projectTitle, downloadUrl, reference, amount = 15000 }) {
  const formattedAmount = (amount || 15000).toLocaleString();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0f17; color: #f6f5f2; margin: 0; padding: 24px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #151923; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; }
        .header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 24px; }
        .logo-text { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .logo-teal { color: #17A2B8; }
        .badge { display: inline-block; background-color: rgba(23,162,184,0.15); color: #17A2B8; border: 1px solid rgba(23,162,184,0.3); border-radius: 9999px; padding: 6px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 12px; }
        .content { padding: 28px 0; }
        .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
        .btn-box { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #17A2B8; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 20px rgba(23,162,184,0.35); }
        .info-card { background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 18px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #A0AEC0; }
        .footer { text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; font-size: 12px; color: #718096; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-text">Cale<span class="logo-teal">Byte</span> Technologies</div>
          <div class="badge">Payment Verified • ₦${formattedAmount}</div>
        </div>
        <div class="content">
          <div class="title">Your Source Code is Ready for Download</div>
          <p style="color: #A0AEC0; line-height: 1.6;">Thank you for your purchase! Below is your secure, direct access link to the full production codebase for <strong>${projectTitle}</strong>.</p>
          
          <div class="btn-box">
            <a href="${downloadUrl}" class="btn" target="_blank">Download ZIP Codebase</a>
          </div>

          <div class="info-card">
            <div><strong>Order Reference:</strong> ${reference}</div>
            <div><strong>Package:</strong> Complete Source Code, Assets & Documentation</div>
            <div><strong>Link Expiration:</strong> Valid for 24 hours. (If expired, reply to this email for instant renewal)</div>
          </div>

          <p style="color: #A0AEC0; font-size: 13px;">If you have any questions or need setup guidance, feel free to reach out directly at <a href="mailto:acnwa1234@gmail.com" style="color: #17A2B8;">acnwa1234@gmail.com</a>.</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} CaleByte Technologies. Built by Caleb Anayolico.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Your Source Code Download: ${projectTitle} — CaleByte Technologies`,
    html
  });
}

/**
 * Send automated donation thank-you receipt email
 * @param {Object} options
 * @param {string} options.email
 * @param {string} [options.supporterName='Supporter']
 * @param {number} [options.amount=2000]
 * @param {string} options.reference
 */
async function sendSupportThankYouEmail({ email, supporterName = 'Supporter', amount = 2000, reference }) {
  const formattedAmount = (amount || 2000).toLocaleString();
  const displayName = supporterName || 'Supporter';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0f17; color: #f6f5f2; margin: 0; padding: 24px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #151923; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; }
        .header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 24px; }
        .logo-text { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .logo-teal { color: #17A2B8; }
        .badge { display: inline-block; background-color: rgba(106,90,205,0.15); color: #8a7ee8; border: 1px solid rgba(106,90,205,0.3); border-radius: 9999px; padding: 6px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 12px; }
        .content { padding: 28px 0; }
        .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
        .info-card { background-color: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 18px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #A0AEC0; }
        .footer { text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; font-size: 12px; color: #718096; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-text">Cale<span class="logo-teal">Byte</span> Technologies</div>
          <div class="badge">Generous Contribution • ₦${formattedAmount}</div>
        </div>
        <div class="content">
          <div class="title">Thank You for Your Generous Support, ${displayName}!</div>
          <p style="color: #A0AEC0; line-height: 1.6;">Your contribution of <strong>₦${formattedAmount}</strong> means a tremendous deal. It directly fuels new open-source software, cloud architectures, and developer tooling at CaleByte Technologies.</p>

          <div class="info-card">
            <div><strong>Supporter:</strong> ${displayName}</div>
            <div><strong>Contribution:</strong> ₦${formattedAmount}</div>
            <div><strong>Reference:</strong> ${reference}</div>
            <div><strong>Status:</strong> Completed & Acknowledged</div>
          </div>

          <p style="color: #A0AEC0; font-size: 13px;">Thank you for backing independent software engineering. You can follow my latest updates on <a href="https://anayolico.name.ng" style="color: #17A2B8;">anayolico.name.ng</a>.</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} CaleByte Technologies. Built by Caleb Anayolico.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Thank You for Supporting CaleByte Technologies, ${displayName}!`,
    html
  });
}

/**
 * Send admin alert to Caleb's personal inbox
 */
async function sendAdminPaymentAlert({ type, amount, email, reference, details }) {
  const adminEmail = process.env.CONTACT_RECEIVER_EMAIL || process.env.SUPPORT_NOTIFICATION_EMAIL || 'acnwa1234@gmail.com';
  const subject = type === 'source_code'
    ? `💰 New Source Code Sale (₦${(amount || 0).toLocaleString()}) — ${details}`
    : `🎉 New Support Donation (₦${(amount || 0).toLocaleString()}) — ${details}`;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; background: #0c0f17; color: #fff; border-radius: 12px;">
      <h2>${subject}</h2>
      <p><strong>Customer Email:</strong> ${email}</p>
      <p><strong>Amount:</strong> ₦${(amount || 0).toLocaleString()}</p>
      <p><strong>Reference:</strong> ${reference}</p>
      <p><strong>Details:</strong> ${details}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    html
  });
}

module.exports = {
  sendEmail,
  sendSourceCodeDeliveryEmail,
  sendSupportThankYouEmail,
  sendAdminPaymentAlert
};
