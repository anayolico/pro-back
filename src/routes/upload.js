const express = require('express');
const multer = require('multer');
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/upload
 * Protected route for uploading project images directly to Cloudinary.
 * Accepts form-data with file under 'file' or 'image' field.
 */
router.post('/', authenticateToken, upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    const file = files[0];

    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
      return res.status(500).json({ error: 'Cloudinary environment variables are missing on server.' });
    }

    // Stream buffer to Cloudinary uploader
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'portfolio_projects',
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]', error);
          return res.status(500).json({ error: error.message || 'Error uploading image to Cloudinary.' });
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
