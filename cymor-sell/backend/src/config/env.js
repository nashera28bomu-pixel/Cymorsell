require('dotenv').config();

function required(name, fallback = undefined) {
  const val = process.env[name] ?? fallback;
  return val;
}

module.exports = {
  NODE_ENV: required('NODE_ENV', 'development'),
  PORT: parseInt(required('PORT', '5000'), 10),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: required('JWT_EXPIRES_IN', '7d'),
  TELEGRAM_MAIN_BOT_TOKEN: required('TELEGRAM_MAIN_BOT_TOKEN'),
  ADMIN_TELEGRAM_ID: required('ADMIN_TELEGRAM_ID'),
  ADMIN_EMAIL: required('ADMIN_EMAIL'),
  ADMIN_PASSWORD_HASH: required('ADMIN_PASSWORD_HASH'),
  GEMINI_API_KEY: required('GEMINI_API_KEY'),
  CLOUDINARY_CLOUD_NAME: required('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: required('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: required('CLOUDINARY_API_SECRET'),
  FRONTEND_URL: required('FRONTEND_URL', 'http://localhost:5173'),
  BACKEND_URL: required('BACKEND_URL', 'http://localhost:5000'),
  LINK_TOKEN_SECRET: required('LINK_TOKEN_SECRET', 'dev_link_secret_change_me'),
  FORCE_MAINTENANCE: required('FORCE_MAINTENANCE', 'false') === 'true',
};
