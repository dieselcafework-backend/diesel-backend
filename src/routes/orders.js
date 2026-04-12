const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /orders — public (customer places order)
router.post('/', async (req, res) => {
  try {
    const { customerName, tableNumber, items, note } = req.body;
    if (!customerName || !tableNumber || !items || items.length === 0) {
      return res.status(400).json({ message: 'customerName, tableNumber and items are required.' });
    }
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = new Order({ customerName, tableNumber, items, totalAmount, note });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// GET /orders — admin only
router.get('/', protect, async (req, res) => {
  try {
    const { date, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
});

// GET /orders/track/:id — public (customer polls own order) — MUST be before /:id
router.get('/track/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ status: order.status, totalAmount: order.totalAmount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to track order.' });
  }
});

// GET /orders/daily-stats — admin only — MUST be before /:id
router.get('/daily-stats', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const orders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' },
    });
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    res.json({ totalSales, totalOrders, orders });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
});

// PUT /orders/:id — admin only (update status)
router.put('/:id', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ message: 'Failed to update order.' });
  }
});

// DELETE /orders — admin only (clear ALL orders, returns them first for WhatsApp export)
router.delete('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    const count = orders.length;
    await Order.deleteMany({});
    res.json({ message: `${count} order(s) deleted.`, count, deletedOrders: orders });
  } catch (err) {
    console.error('Clear orders error:', err);
    res.status(500).json({ message: 'Failed to clear orders.' });
  }
});

// DELETE /orders/:id — admin only (single order, returns it for WhatsApp export)
router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order deleted.', deletedOrder: order });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ message: 'Failed to delete order.' });
  }
});

module.exports = router;
