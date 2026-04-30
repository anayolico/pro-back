# Portfolio Backend

Small Express backend for the portfolio contact form. It sends messages with Resend.

## Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Update `.env` with your real Resend API key before sending email.

For production, use a verified sender domain in `RESEND_FROM_EMAIL`.

## Render deploy

Create a Render Web Service with these settings:

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Set these environment variables in Render:

- `CLIENT_ORIGIN`: your frontend URL, for example `https://my-portfolio-beryl-two-rfjdabbgrm.vercel.app`
- `RESEND_API_KEY`: your real Resend API key
- `RESEND_FROM_EMAIL`: your verified sender, for example `Portfolio Contact <hello@yourdomain.com>`
- `CONTACT_TO_EMAIL`: the inbox that should receive contact messages
