/**
 * routes/payments.js
 *
 * POST /api/payments/create-order  → creates Razorpay order, returns ID + amount
 * POST /api/payments/verify        → verifies signature, creates Order in DB
 *
 * Only used for takeaway orders. Dine-in orders bypass this entirely.
 *
 * Install razorpay package:
 *   npm install razorpay
 *
 * Add to .env:
 *   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
 *   RAZORPAY_KEY_SECRET=your_secret_here
 */

const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const Order    = require('../models/Order');

const router = express.Router();

// ── Lazily initialise Razorpay so missing keys don't crash server on boot ─────
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured in .env');
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ── Generate daily pickup token T-001, T-002 … ────────────────────────────────
const generatePickupToken = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await Order.countDocuments({
    orderType: 'takeaway',
    createdAt: { $gte: today },
  });
  return `T-${String(count + 1).padStart(3, '0')}`;
};

// ── POST /api/payments/create-order ──────────────────────────────────────────
// Frontend calls this first to get a Razorpay order ID
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100), // convert ₹ → paise
      currency: 'INR',
      receipt:  `dc_${Date.now()}`,
    });

    res.json({
      id:       order.id,
      amount:   order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error('[payments/create-order]', err.message);
    res.status(500).json({ message: err.message || 'Failed to create payment order.' });
  }
});

// ── POST /api/payments/verify ─────────────────────────────────────────────────
// Called after Razorpay payment succeeds on the frontend
// Verifies HMAC signature → creates the Order in MongoDB
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderData,           // { customerName, phoneNumber, note, items }
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderData) {
      return res.status(400).json({ message: 'Missing payment verification fields.' });
    }

    // ── Verify HMAC-SHA256 signature ──────────────────────────────────────────
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    // ── Payment genuine — create the order ───────────────────────────────────
    const totalAmount = orderData.items.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );

    const pickupToken = await generatePickupToken();

    const order = new Order({
      customerName:    orderData.customerName,
      phoneNumber:     orderData.phoneNumber || '',
      tableNumber:     'Takeaway',
      orderType:       'takeaway',
      note:            orderData.note || '',
      items:           orderData.items,
      totalAmount,
      paymentStatus:   'paid',
      paymentId:       razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      pickupToken,
    });

    await order.save();

    res.status(201).json({ order, pickupToken });
  } catch (err) {
    console.error('[payments/verify]', err.message);
    res.status(500).json({ message: 'Payment verified but order creation failed. Contact support.' });
  }
});

module.exports = router;
