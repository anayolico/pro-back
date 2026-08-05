# 🚀 Portfolio Express Backend & Admin Dashboard

This is the lightweight custom **Express.js API** and **Admin Dashboard** powering the portfolio site. It manages project lists, technical stack tags, work experience timelines, core strengths, contact inbox messages, and CV data.

---

## 🌟 Key Features

- **Express REST API:** Clean public read and protected write endpoints under `/api`.
- **Admin Authentication:** Stateless JWT token authorization. Credentials are read dynamically from env variables.
- **Admin Dashboard:** Served directly at `/admin`, built with a dark glassmorphic responsive design.
- **Database Architecture:** Neon PostgreSQL integrations with automatic DB initialization (creates tables if missing on startup).
- **Email Dispatching:** Sends automated HTML notifications via the official `resend` SDK when contact inquiries are made.
- **Media Uploads:** Integrates Cloudinary to upload project screenshots directly from the admin panel.

---

## 🛠️ Step-by-Step Setup

1. **Clone & Navigate:**
   ```bash
   cd backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy `.env.example` to create `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in your database credentials, authentication keys, and integration credentials.

4. **Run Locally:**
   - Development Mode (with hot-reloading):
     ```bash
     npm run dev
     ```
   - Production Mode:
     ```bash
     npm start
     ```

---

## ⚙️ Environment Variables Reference

| Variable | Description | Example Value |
|---|---|---|
| `PORT` | Local server port | `1337` |
| `FRONTEND_URL` | CORS allowed origin for frontend | `https://anayolico.name.ng` |
| `ADMIN_USERNAME` | Admin panel login username | `anayolico` |
| `ADMIN_PASSWORD` | Admin panel login password | `YourSecurePassword` |
| `JWT_SECRET` | Secret key for signing auth tokens | `random_secret_string` |
| `DATABASE_URL` | Connection string for Neon PostgreSQL | `postgresql://user:pass@host/db?sslmode=require` |
| `DATABASE_SSL` | Force SSL database connection | `true` |
| `RESEND_API_KEY` | Resend mail API authorization key | `re_xxx` |
| `RESEND_DEFAULT_FROM` | Verified domain sender address | `sender@yourdomain.com` |
| `CONTACT_RECEIVER_EMAIL` | Inbox destination email address | `your_inbox@gmail.com` |
| `CLOUDINARY_NAME` | Cloudinary Cloud Name | `cloud_name` |
| `CLOUDINARY_KEY` | Cloudinary API Key | `api_key` |
| `CLOUDINARY_SECRET` | Cloudinary API Secret | `api_secret` |

---

## 📡 API Endpoints

### Public Read Endpoints
- `GET /` - API status verification page (returns live info & active links).
- `GET /health` - API server health statistics.
- `GET /api/health` - Health check alias.
- `GET /api/projects` - Retrieve showcase projects list.
- `GET /api/skills` - Retrieve skills list.
- `GET /api/experiences` - Retrieve work experience timeline.
- `GET /api/strengths` - Retrieve core strengths list.
- `GET /api/cv` - Retrieve executive CV JSON data.

### Protected Admin Endpoints (Require `Authorization: Bearer <token>`)
- `POST /api/auth/login` - Authenticate admin credentials and generate JWT.
- `GET /api/auth/me` - Validate active token session.
- `PUT /api/cv` - Update CV page data.
- `POST /api/projects` / `PUT /api/projects/:id` / `DELETE /api/projects/:id` - CRUD operations.
- `POST /api/skills` / `PUT /api/skills/:id` / `DELETE /api/skills/:id` - CRUD operations.
- `POST /api/experiences` / `PUT /api/experiences/:id` / `DELETE /api/experiences/:id` - CRUD operations.
- `POST /api/strengths` / `PUT /api/strengths/:id` / `DELETE /api/strengths/:id` - CRUD operations.
- `GET /api/contacts` / `DELETE /api/contacts/:id` - View and delete contact inquiries inbox messages.

---

## 🚀 Deployment (Render)

1. Connect your backend git repo to Render as a **Web Service**.
2. Set the build and start configurations:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add the keys from `.env.example` in **Environment Variables** in the Render settings tab.
4. Render automatically deploys and binds the health check routes to keep the instance active.
