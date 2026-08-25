const Business = require('../models/Business');
const User = require('../models/User');
const PaymentSettings = require('../models/PaymentSettings');
const { logActivity } = require('../services/activityLogService');

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createBusiness(req, res, next) {
  try {
    if (req.user.business) {
      return res.status(409).json({ error: 'This account already has a business' });
    }
    const { name, description, phone, email, location, address, openingHours } = req.body;
    if (!name) return res.status(400).json({ error: 'Business name is required' });

    let slug = slugify(name);
    let suffix = 0;
    while (await Business.exists({ slug: suffix ? `${slug}-${suffix}` : slug })) {
      suffix += 1;
    }
    if (suffix) slug = `${slug}-${suffix}`;

    const business = await Business.create({
      owner: req.user._id,
      name,
      slug,
      description,
      phone,
      email,
      location,
      address,
      openingHours,
      setupStep: 2,
    });

    await PaymentSettings.create({ business: business._id });

    req.user.business = business._id;
    await req.user.save();

    await logActivity({ business: business._id, actor: req.user._id, action: 'BUSINESS_CREATED' });

    res.status(201).json({ business });
  } catch (err) {
    next(err);
  }
}

async function getMyBusiness(req, res, next) {
  try {
    const business = await Business.findById(req.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json({ business });
  } catch (err) {
    next(err);
  }
}

async function updateBusiness(req, res, next) {
  try {
    const allowed = [
      'name', 'description', 'phone', 'email', 'location', 'address', 'openingHours',
      'telegramContact', 'website', 'socialLinks', 'salesAgent', 'invoiceBranding', 'setupStep',
      'isSetupComplete',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const business = await Business.findByIdAndUpdate(req.businessId, updates, { new: true });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json({ business });
  } catch (err) {
    next(err);
  }
}

async function updateLogo(req, res, next) {
  try {
    const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const business = await Business.findById(req.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });

    if (business.logo?.publicId) await deleteFromCloudinary(business.logo.publicId);

    const result = await uploadBufferToCloudinary(req.file.buffer, 'logos');
    business.logo = { url: result.secure_url, publicId: result.public_id };
    await business.save();

    res.json({ business });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBusiness, getMyBusiness, updateBusiness, updateLogo };
