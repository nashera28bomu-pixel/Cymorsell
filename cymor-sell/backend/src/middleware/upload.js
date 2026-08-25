const multer = require('multer');

// Files are held in memory then streamed to Cloudinary - never written to disk,
// never stored as binary in MongoDB.
const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
  }
  cb(null, true);
};

const csvFilter = (req, file, cb) => {
  const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
  if (!allowed.includes(file.mimetype) && !file.originalname.endsWith('.csv')) {
    return cb(new Error('Only CSV files are allowed'));
  }
  cb(null, true);
};

const uploadImage = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadCsv = multer({ storage, fileFilter: csvFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { uploadImage, uploadCsv };
