/**
 * Development seed data. Never run automatically in production.
 * Usage: npm run seed
 * Or trigger the equivalent HTTP endpoint below during local mobile-only dev
 * (see server.js `/api/dev/seed` — only enabled when NODE_ENV !== 'production').
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Category = require('../models/Category');
const DeliveryZone = require('../models/DeliveryZone');
const PaymentSettings = require('../models/PaymentSettings');

async function seed({ standalone = true } = {}) {
  if (standalone) await connectDB();

  const email = 'demo@cymorsell.test';
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await User.hashPassword('DemoPass123!');
    user = await User.create({ name: 'Demo Owner', email, passwordHash });
  }

  let business = await Business.findOne({ slug: 'best-shoes-kenya' });
  if (!business) {
    business = await Business.create({
      owner: user._id,
      name: 'Best Shoes Kenya',
      slug: 'best-shoes-kenya',
      description: 'Quality footwear for every occasion, delivered across Kenya.',
      phone: '0712345678',
      email: 'hello@bestshoeskenya.test',
      location: 'Nairobi',
      address: 'Moi Avenue, Nairobi',
      openingHours: 'Mon-Sat 8am-6pm',
      setupStep: 7,
      isSetupComplete: true,
    });
    user.business = business._id;
    await user.save();
    await PaymentSettings.findOneAndUpdate(
      { business: business._id },
      { mpesaNumber: '0712345678', mpesaName: 'Best Shoes Kenya' },
      { upsert: true }
    );
  }

  const category = await Category.findOneAndUpdate(
    { business: business._id, name: 'Running Shoes' },
    { $setOnInsert: { business: business._id, name: 'Running Shoes' } },
    { upsert: true, new: true }
  );

  const products = [
    { name: 'RunFlex Pro', price: 3200, stock: 8, description: 'Premium running shoe for daily training and casual use.' },
    { name: 'TrailBlazer X', price: 4500, stock: 5, description: 'Rugged trail runner with reinforced grip.' },
    { name: 'CityWalk Classic', price: 2500, stock: 12, description: 'Everyday comfort sneaker.' },
  ];
  for (const p of products) {
    await Product.findOneAndUpdate(
      { business: business._id, name: p.name },
      { $setOnInsert: { ...p, business: business._id, category: category._id, variations: [{ type: 'size', options: ['39', '40', '41', '42', '43', '44'] }] } },
      { upsert: true }
    );
  }

  await DeliveryZone.findOneAndUpdate(
    { business: business._id, name: 'Nairobi' },
    { $setOnInsert: { business: business._id, name: 'Nairobi', fee: 200, estimatedTime: 'Same day' } },
    { upsert: true }
  );
  await DeliveryZone.findOneAndUpdate(
    { business: business._id, name: 'Kiambu' },
    { $setOnInsert: { business: business._id, name: 'Kiambu', fee: 300, estimatedTime: '1-2 days' } },
    { upsert: true }
  );
  await DeliveryZone.findOneAndUpdate(
    { business: business._id, name: 'Pickup' },
    { $setOnInsert: { business: business._id, name: 'Pickup', fee: 0, isPickup: true } },
    { upsert: true }
  );

  console.log('[seed] Demo login: demo@cymorsell.test / DemoPass123!');
  console.log('[seed] Seed complete.');
  if (standalone) await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
