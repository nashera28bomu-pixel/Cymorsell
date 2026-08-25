const { Order } = require('../models/Order');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');

// Simple monotonic-ish sequence based on total order count.
// Collisions are avoided with a unique index + retry.
async function generateOrderNumber() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await Order.countDocuments();
    const candidate = `CYM-${1000 + count + attempt}`;
    const exists = await Order.exists({ orderNumber: candidate });
    if (!exists) return candidate;
  }
  return `CYM-${Date.now()}`;
}

async function generateInvoiceNumber() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await Invoice.countDocuments();
    const candidate = `INV-${String(1000 + count + attempt).padStart(7, '0')}`;
    const exists = await Invoice.exists({ invoiceNumber: candidate });
    if (!exists) return candidate;
  }
  return `INV-${Date.now()}`;
}

async function generateReceiptNumber() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await Receipt.countDocuments();
    const candidate = `RCT-${String(1000 + count + attempt).padStart(7, '0')}`;
    const exists = await Receipt.exists({ receiptNumber: candidate });
    if (!exists) return candidate;
  }
  return `RCT-${Date.now()}`;
}

module.exports = { generateOrderNumber, generateInvoiceNumber, generateReceiptNumber };
