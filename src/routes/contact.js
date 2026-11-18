const express = require('express');
const { insertItem } = require('../db');
const { sendResendEmail } = require('../services/email');

const router = express.Router();

/**
 * POST /api/contact
 * Handles contact form submissions from portfolio frontend.
 * 1. Saves message to database contacts inbox.
 * 2. Sends notification email via Resend API.
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body.data || req.body;
    const { fullName, email, description } = body;

    if (!fullName || !email || !description) {
      return res.status(400).json({ error: 'Please provide full name, email, and description.' });
    }

    // 1. Save to DB inbox
    const contactEntry = await insertItem('contacts', { fullName, email, description });

    // 2. Dispatch email via Resend if key exists
    let emailSent = false;
    let emailError = null;

    if (process.env.RESEND_API_KEY) {
      try {
        const customFrom = process.env.RESEND_DEFAULT_FROM || 'anayolico@anayolico.name.ng';
        const toEmail = process.env.CONTACT_RECEIVER_EMAIL || 'acnwa1234@gmail.com';

        const emailTemplate = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #17a2b8; margin-bottom: 20px;">New Message from Portfolio Website</h2>
            <p><strong>Sender Name:</strong> ${fullName}</p>
            <p><strong>Sender Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Message Details:</strong></p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description}</div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Sent from Portfolio Contact Form</p>
          </div>
        `;

        // Attempt 1: Try configured sender
        let result = await sendResendEmail({
          from: customFrom,
          to: toEmail,
          replyTo: email,
          subject: `Portfolio Contact Form: ${fullName}`,
          html: emailTemplate
        });

        // Attempt 2: Fallback to onboarding@resend.dev if custom sender domain is unverified
        if (result.error && customFrom !== 'onboarding@resend.dev') {
          console.warn('[Resend Warning] Custom sender unverified. Retrying with onboarding@resend.dev fallback...');
          result = await sendResendEmail({
            from: 'onboarding@resend.dev',
            to: toEmail,
            replyTo: email,
            subject: `Portfolio Contact Form: ${fullName}`,
            html: emailTemplate
          });
        }

        if (result.error) {
          console.error('[Resend Error]', result.error);
          emailError = result.error.message || JSON.stringify(result.error);
        } else {
          emailSent = true;
          console.log('[Resend Success] Email dispatched successfully! ID:', result.data?.id);
        }
      } catch (err) {
        console.error('[Resend Exception]', err.message);
        emailError = err.message;
      }
    } else {
      console.log('[Resend Warning] RESEND_API_KEY not configured. Message saved in DB only.');
    }

    return res.status(200).json({
      success: true,
      message: 'Contact form submitted successfully!',
      emailSent,
      emailError,
      data: contactEntry
    });
  } catch (err) {
    console.error('[Contact POST Error]', err);
    return res.status(500).json({ error: 'Server error processing contact submission.' });
  }
});

module.exports = router;
