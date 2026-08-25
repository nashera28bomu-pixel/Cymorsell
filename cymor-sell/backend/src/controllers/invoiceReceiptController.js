const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');

async function getInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, business: req.businessId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

async function getReceipt(req, res, next) {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, business: req.businessId });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ receipt });
  } catch (err) {
    next(err);
  }
}

module.exports = { getInvoice, getReceipt };
