const DeliveryZone = require('../models/DeliveryZone');

async function listZones(req, res, next) {
  try {
    const zones = await DeliveryZone.find({ business: req.businessId }).sort({ createdAt: 1 });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
}

async function createZone(req, res, next) {
  try {
    const { name, fee, estimatedTime, isPickup } = req.body;
    if (!name || fee === undefined) return res.status(400).json({ error: 'name and fee are required' });
    const zone = await DeliveryZone.create({ business: req.businessId, name, fee, estimatedTime, isPickup: !!isPickup });
    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
}

async function updateZone(req, res, next) {
  try {
    const allowed = ['name', 'fee', 'estimatedTime', 'isPickup', 'isActive'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    const zone = await DeliveryZone.findOneAndUpdate({ _id: req.params.id, business: req.businessId }, updates, { new: true });
    if (!zone) return res.status(404).json({ error: 'Delivery zone not found' });
    res.json({ zone });
  } catch (err) {
    next(err);
  }
}

async function deleteZone(req, res, next) {
  try {
    await DeliveryZone.findOneAndDelete({ _id: req.params.id, business: req.businessId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listZones, createZone, updateZone, deleteZone };
