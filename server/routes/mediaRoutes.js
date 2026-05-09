const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const db = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function getMediaType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Only jpg, png, gif, mp4, mov, mp3, wav, ogg, and webm files are allowed.'));
    }

    cb(null, true);
  }
});

function deleteUploadedFile(file) {
  if (!file) return;

  fs.unlink(file.path, (error) => {
    if (error) {
      console.error('Failed to delete uploaded file:', error);
    }
  });
}

router.post('/upload', requireAuth, upload.single('media'), async (req, res) => {
  try {
    const { itemId } = req.body;
    const file = req.file;

    if (!itemId) {
      deleteUploadedFile(file);
      return res.status(400).json({ error: 'itemId is required.' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No media file was uploaded.' });
    }

    const mediaType = getMediaType(file.mimetype);

    if (!mediaType) {
      deleteUploadedFile(file);
      return res.status(400).json({ error: 'Unsupported media type.' });
    }

    if (mediaType === 'image' && file.size > 5 * 1024 * 1024) {
      deleteUploadedFile(file);
      return res.status(400).json({ error: 'Images must be under 5MB.' });
    }

    const [items] = await db.query(
      'SELECT id FROM hyper_items WHERE id = ? AND user_id = ?',
      [itemId, req.session.userId]
    );

    if (items.length === 0) {
      deleteUploadedFile(file);
      return res.status(404).json({ error: 'HyperList item not found.' });
    }

    const fileUrl = `/uploads/${file.filename}`;

    const [result] = await db.query(
      `INSERT INTO item_media
        (item_id, user_id, original_name, stored_name, mime_type, media_type, file_size, file_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        req.session.userId,
        file.originalname,
        file.filename,
        file.mimetype,
        mediaType,
        file.size,
        fileUrl
      ]
    );

    const [newMedia] = await db.query(
      `SELECT id, item_id, original_name, stored_name, mime_type, media_type, file_size, file_url, created_at
       FROM item_media
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.session.userId]
    );

    res.status(201).json(newMedia[0]);
  } catch (error) {
    deleteUploadedFile(req.file);
    console.error('Media upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload media.' });
  }
});

router.get('/item/:itemId', requireAuth, async (req, res) => {
  try {
    const [items] = await db.query(
      'SELECT id FROM hyper_items WHERE id = ? AND user_id = ?',
      [req.params.itemId, req.session.userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'HyperList item not found.' });
    }

    const [media] = await db.query(
      `SELECT id, item_id, original_name, stored_name, mime_type, media_type, file_size, file_url, created_at
       FROM item_media
       WHERE item_id = ? AND user_id = ?
       ORDER BY created_at DESC`,
      [req.params.itemId, req.session.userId]
    );

    res.json(media);
  } catch (error) {
    console.error('Get item media error:', error);
    res.status(500).json({ error: 'Failed to fetch media.' });
  }
});

module.exports = router;