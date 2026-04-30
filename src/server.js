import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Resend } from 'resend';

const app = express();
const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || '0.0.0.0';
const resendApiKey = process.env.RESEND_API_KEY || '';
const hasResendApiKey =
  resendApiKey && !resendApiKey.includes('your_api_key_here');
const resend = hasResendApiKey ? new Resend(resendApiKey) : null;

const defaultClientOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://my-portfolio-beryl-two-rfjdabbgrm.vercel.app',
];
const allowedOrigins = (process.env.CLIENT_ORIGIN || defaultClientOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const contactToEmail = process.env.CONTACT_TO_EMAIL || 'acnwa1234@gmail.com';
const resendFromEmail =
  process.env.RESEND_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rateLimitWindowMs = 15 * 60 * 1000;
const maxMessagesPerWindow = 5;
const requestCounts = new Map();

app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.use(express.json({ limit: '20kb' }));

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[char];
  });
}

function validateContactPayload(payload) {
  const fullName = cleanString(payload.fullName);
  const email = cleanString(payload.email);
  const description = cleanString(payload.description);
  const errors = {};

  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length < 3) {
    errors.fullName = 'Full name must be at least 3 characters';
  } else if (fullName.length > 100) {
    errors.fullName = 'Full name must be 100 characters or fewer';
  }

  if (!email) {
    errors.email = 'Email is required';
  } else if (!emailPattern.test(email) || email.length > 254) {
    errors.email = 'Invalid email address';
  }

  if (!description) {
    errors.description = 'Description is required';
  } else if (description.length < 10) {
    errors.description = 'At least 10 characters required';
  } else if (description.length > 5000) {
    errors.description = 'Description must be 5000 characters or fewer';
  }

  return {
    values: { fullName, email, description },
    errors,
  };
}

function contactRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = requestCounts.get(ip);

  if (!current || current.resetAt <= now) {
    requestCounts.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    next();
    return;
  }

  if (current.count >= maxMessagesPerWindow) {
    res.status(429).json({
      message: 'Too many contact requests. Please try again later.',
    });
    return;
  }

  current.count += 1;
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/contact', contactRateLimit, async (req, res) => {
  const { values, errors } = validateContactPayload(req.body || {});

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      message: 'Please fix the highlighted fields.',
      errors,
    });
    return;
  }

  if (!resend) {
    res.status(500).json({
      message: 'Email service is not configured.',
    });
    return;
  }

  const safeName = escapeHtml(values.fullName);
  const safeEmail = escapeHtml(values.email);
  const safeDescription = escapeHtml(values.description).replace(/\n/g, '<br>');
  const subject = `New portfolio message from ${values.fullName}`;

  try {
    const { data, error } = await resend.emails.send({
      from: resendFromEmail,
      to: [contactToEmail],
      subject,
      replyTo: values.email,
      html: `
        <h2>New portfolio contact message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Message:</strong></p>
        <p>${safeDescription}</p>
      `,
      text: [
        'New portfolio contact message',
        `Name: ${values.fullName}`,
        `Email: ${values.email}`,
        '',
        values.description,
      ].join('\n'),
    });

    if (error) {
      console.error('Resend error:', error);
      res.status(502).json({
        message: 'The email provider could not send this message.',
      });
      return;
    }

    res.status(200).json({
      message: 'Message sent successfully.',
      id: data?.id,
    });
  } catch (error) {
    console.error('Contact endpoint error:', error);
    res.status(500).json({
      message: 'Something went wrong while sending your message.',
    });
  }
});

app.use((err, _req, res, _next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ message: 'This origin is not allowed.' });
    return;
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Unexpected server error.' });
});

app.listen(port, host, () => {
  console.log(`Portfolio backend listening on http://${host}:${port}`);
});
