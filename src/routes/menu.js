const express = require('express');
const MenuItem = require('../models/Menu');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /menu — public
router.get('/', async (req, res) => {
  try {
    const { superCategory, available } = req.query;
    const filter = {};

    if (superCategory && superCategory !== 'All Items') {
      filter.superCategory = superCategory;
    }
    if (available === 'true') {
      filter.available = true;
    }

    const items = await MenuItem.find(filter).sort({ superCategory: 1, subCategory: 1, name: 1 });
    res.json(items);
  } catch (err) {
    console.error('Get menu error:', err);
    res.status(500).json({ message: 'Failed to fetch menu.' });
  }
});

// GET /menu/:id — public
router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch item.' });
  }
});

// POST /menu — admin only
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
    console.error('Create menu item error:', err);
    res.status(500).json({ message: 'Failed to create menu item.' });
  }
});

// PUT /menu/:id — admin only
router.put('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json(item);
  } catch (err) {
    console.error('Update menu item error:', err);
    res.status(500).json({ message: 'Failed to update item.' });
  }
});

// DELETE /menu/:id — admin only
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    res.json({ message: 'Item deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete item.' });
  }
});

module.exports = router;
