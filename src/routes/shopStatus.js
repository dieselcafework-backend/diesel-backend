/**
 * routes/shopStatus.js
 *
 * GET   /api/shop-status  → public  — returns { isOpen: bool }
 * PATCH /api/shop-status  → admin only — toggles isOpen on Admin document
 *
 * The isOpen field already exists on the Admin model:
 *   isOpen: { type: Boolean, default: true }
 */

const express         = require('express');
const Admin           = require('../models/Admin');
const { protect }     = require('../middleware/auth');
const requireShopOpen = require('../middleware/shopStatus');

const router = express.Router();

// ── GET /api/shop-status ──────────────────────────────────────────────────────
// Public — ShopToggle component reads this on mount
router.get('/', async (req, res) => {
  try {
    const admin  = await Admin.findOne({}).select('isOpen').lean();
    const isOpen = admin ? admin.isOpen : true;
    res.json({ isOpen });
  } catch (err) {
    console.error('[shopStatus GET]', err.message);
    res.status(500).json({ message: 'Failed to fetch shop status.' });
  }
});

// ── PATCH /api/shop-status ────────────────────────────────────────────────────
// Admin only — called by ShopToggle when admin clicks the button
router.patch('/', protect, async (req, res) => {
  try {
    const { isOpen } = req.body;

    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ message: '`isOpen` must be a boolean.' });
    }

    const admin = await Admin.findOneAndUpdate(
      {},
      { isOpen },
      { new: true }
    ).select('isOpen');

    if (!admin) {
      return res.status(404).json({ message: 'Admin document not found.' });
    }

    // Bust the in-memory cache so the next customer request reflects this immediately
    requireShopOpen.bust();

    res.json({
      isOpen:  admin.isOpen,
      message: `Shop is now ${admin.isOpen ? 'OPEN ✅' : 'CLOSED 🔒'}`,
    });
  } catch (err) {
    console.error('[shopStatus PATCH]', err.message);
    res.status(500).json({ message: 'Failed to update shop status.' });
  }
});

module.exports = router;
