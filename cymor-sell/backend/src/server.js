const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const env = require('./config/env');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const csvRoutes = require('./routes/csvRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'cymor-sell-backend', time: new Date().toISOString() }));

// Browser-triggerable seed endpoint for mobile-only development workflows
// (no local terminal available). Disabled in production.
if (env.NODE_ENV !== 'production') {
  app.get('/api/dev/seed', async (req, res) => {
    try {
      const seed = require('./scripts/seed');
      await seed({ standalone: false });
      res.json({ message: 'Seed complete. Demo login: demo@cymorsell.test / DemoPass123!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`[server] Cymor Sell backend running on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Set the main management bot's webhook on boot (no-op if token not configured).
  try {
    const { initMainBotWebhook } = require('./telegram/mainBot');
    await initMainBotWebhook();
  } catch (err) {
    console.error('[server] failed to initialize main bot webhook:', err.message);
  }

  process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received, shutting down');
    server.close(() => process.exit(0));
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[server] failed to start:', err);
    process.exit(1);
  });
}

module.exports = app;
