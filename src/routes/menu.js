/**
 * routes/menu.js
 *
 * ── ONLY CHANGE vs original ──────────────────────────────────────────────────
 * Added `requireShopOpen` middleware to  GET /  (public route).
 * When the shop is closed this returns 403, which CustomerMenu.jsx already
 * handles — it checks `err.response?.status === 403` and shows the closed screen.
 * All admin routes (POST, PUT, DELETE) are untouched and work regardless of shop status.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express         = require('express');
const MenuItem        = require('../models/Menu');
const { protect }     = require('../middleware/auth');
const requireShopOpen = require('../middleware/shopStatus'); // ← NEW import

const router = express.Router();

// ── GET /api/menu ─────────────────────────────────────────────────────────────
// Public — guarded by requireShopOpen (returns 403 when closed)
router.get('/', requireShopOpen, async (req, res) => {   // ← requireShopOpen added
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
});

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
