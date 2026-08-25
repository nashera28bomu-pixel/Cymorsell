const { uploadBufferToCloudinary } = require('../services/uploadService');

async function uploadGenericImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const result = await uploadBufferToCloudinary(req.file.buffer, 'misc');
    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadGenericImage };
