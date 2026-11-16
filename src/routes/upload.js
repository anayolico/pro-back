const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { authenticateToken } = require('./auth');

const router = express.Router();

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Configure Multer memory storage (file buffers in RAM)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit for images & audio
});

/**
 * POST /api/upload
 * Protected route for uploading project images or background audio.
 * Uploads to Cloudinary when configured, or falls back to local /uploads/.
 */
router.post('/', authenticateToken, upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    const file = files[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
      const uploadsDir = path.join(__dirname, '../../public/uploads');
      fs.mkdirSync(uploadsDir, { recursive: true });
      const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      fs.writeFileSync(path.join(uploadsDir, safeName), file.buffer);
      return res.json({
        success: true,
        url: `/uploads/${safeName}`,
        public_id: safeName
      });
    }

    const folder = req.query.folder || req.body?.folder || (file.mimetype?.startsWith('audio/') ? 'portfolio_music' : 'portfolio_projects');

    // Stream buffer to Cloudinary uploader
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]', error);
          return res.status(500).json({ error: error.message || 'Error uploading file to Cloudinary.' });
        }
        return res.json({
          success: true,
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    uploadStream.end(file.buffer);
  } catch (err) {
    console.error('[Upload Exception]', err);
    return res.status(500).json({ error: 'Server error uploading file.' });
  }
});

module.exports = router;
