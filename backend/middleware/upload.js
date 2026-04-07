// ============================================
// middleware/upload.js — Multer File Upload
// Using memoryStorage so images are stored in
// DB as Base64 instead of local disk (Railway
// ephemeral filesystem has no persistent disk)
// ============================================

const multer = require('multer');

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage: multer.memoryStorage(), // store in RAM buffer, not disk
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

module.exports = upload;
