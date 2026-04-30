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
