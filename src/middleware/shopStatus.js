const Admin = require('../models/Admin');

const requireShopOpen = async (req, res, next) => {
  try {
    const admin = await Admin.findOne().select('isOpen');
    // If no admin doc found yet, fail open (don't block)
    if (!admin || admin.isOpen) return next();
    return res.status(403).json({ message: 'Shop is currently closed' });
  } catch (err) {
    console.error('[shopStatus] Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = requireShopOpen;