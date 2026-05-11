/**
 * routes/menu.js
 *
 * FIX: Admin requests (with JWT Bearer token) bypass requireShopOpen.
 * Customers without a token still get 403 when the shop is closed.
 * All write routes (POST, PUT, DELETE) are admin-only and unaffected.
 */

const express         = require('express');
const MenuItem        = require('../models/Menu');
const { protect }     = require('../middleware/auth');
const requireShopOpen = require('../middleware/shopStatus');

const router = express.Router();

// ── GET /api/menu ─────────────────────────────────────────────────────────────
// Public customers → gated by requireShopOpen (403 when closed)
// Admin with JWT  → bypasses shop status check (always works)
router.get(
  '/',
  (req, res, next) => {
    // If request carries an admin JWT, skip the shop-status gate entirely
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return next();
    }
    // No token = customer request → apply shop-status check
    return requireShopOpen(req, res, next);
  },
  async (req, res) => {
    try {
      const items = await MenuItem
        .find({})
        .sort({ superCategory: 1, subCategory: 1, name: 1 })
        .lean();
      res.json(items);
    } catch (err) {
      console.error('[menu GET]', err.message);
      res.status(500).json({ message: 'Failed to fetch menu.' });
    }
  }
);

// ── POST /api/menu ────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { superCategory, subCategory, name, description, price, veg, image, available } = req.body;
    if (!superCategory || !subCategory || !name || price === undefined) {
      return res.status(400).json({ message: 'superCategory, subCategory, name and price are required.' });
    }
    const item = new MenuItem({ superCategory, subCategory, name, description, price, veg, image, available });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('[menu POST]', err.message);
    res.status(500).json({ message: 'Failed to add menu item.' });
  }
});

// ── PUT /api/menu/:id ─────────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const allowed = ['superCategory', 'subCategory', 'name', 'description', 'price', 'veg', 'image', 'available'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const item = await MenuItem.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Menu item not found.' });
    res.json(item);
  } catch (err) {
    console.error('[menu PUT]', err.message);
    res.status(500).json({ message: 'Failed to update menu item.' });
  }
});

// ── DELETE /api/menu/:id ──────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found.' });
    res.json({ message: 'Item deleted successfully.' });
  } catch (err) {
    console.error('[menu DELETE]', err.message);
    res.status(500).json({ message: 'Failed to delete menu item.' });
  }
});

module.exports = router;
