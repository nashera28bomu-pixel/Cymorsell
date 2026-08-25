const PaymentSettings = require('../models/PaymentSettings');

async function getSettings(req, res, next) {
  try {
    let settings = await PaymentSettings.findOne({ business: req.businessId });
    if (!settings) settings = await PaymentSettings.create({ business: req.businessId });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const allowed = ['mpesaNumber', 'mpesaName', 'bankName', 'bankAccountName', 'bankAccountNumber', 'otherInstructions', 'notes'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

    const settings = await PaymentSettings.findOneAndUpdate({ business: req.businessId }, updates, {
      new: true,
      upsert: true,
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
