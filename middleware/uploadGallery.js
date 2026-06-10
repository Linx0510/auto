const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const config = require('../config');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.paths.uploads);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 16) || '.bin';
    const base = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${base}${ext}`);
  }
});

function fileFilter(_req, file, cb) {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла'));
  }
}

const uploadGalleryImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSize }
});

/** Runs single('image'); responds with 400 on multer / filter errors */
function galleryUploadSingle(req, res, next) {
  uploadGalleryImage.single('image')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Файл слишком большой' });
      return;
    }
    res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
  });
}

module.exports = {
  uploadGalleryImage,
  galleryUploadSingle
};
