const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const requireShopOpen = require('../middleware/shopStatus');
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const router = express.Router();

// ── Write limiter — POST /orders only (customer order creation) ───────────────
// Applied here at router level so it only affects POST, not admin GET polling.
// 120 req/15 min = enough for a busy café without being exploitable.
const { rateLimit } = require('express-rate-limit');
const orderWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { message: 'Too many orders placed. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── VAPID setup ───────────────────────────────────────────────────────────────
const cafeConfig = require('../config/cafeConfig');

webpush.setVapidDetails(
  `mailto:${cafeConfig.cafe.vapidEmail}`,
  cafeConfig.env.vapidPublicKey,
  cafeConfig.env.vapidPrivateKey
);

// ── Send push notification to all subscribed admin devices ───────────────────
const sendOrderPush = async (order) => {
  try {
    const subs = await PushSubscription.find({});
    if (!subs.length) return;

    const payload = JSON.stringify({
      title: '🛎️ New Order — ' + (order.orderType === 'takeaway' ? 'Takeaway' : `Table ${order.tableNumber}`),
      body: `${order.orderType === 'takeaway' ? '🥡 Takeaway' : `🪑 Table ${order.tableNumber}`} · ${order.customerName} · ₹${order.totalAmount}`,
      orderId: String(order._id),
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      )
    );

    // Clean up expired / invalid subscriptions automatically
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const code = result.reason?.statusCode;
        if (code === 404 || code === 410) {
          PushSubscription.deleteOne({ endpoint: subs[i].endpoint }).catch(() => { });
        }
      }
    });
  } catch (err) {
    console.error('Push notification error:', err);
  }
};

// ── Generate daily pickup token T-001, T-002… ─────────────────────────────────
const generatePickupToken = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await Order.countDocuments({
    orderType: 'takeaway',
    createdAt: { $gte: today },
  });
  return `T-${String(count + 1).padStart(3, '0')}`;
};

// ── POST /orders — public ─────────────────────────────────────────────────────
router.post('/', orderWriteLimiter, requireShopOpen, async (req, res) => {
  try {
    const {
      customerName, tableNumber, items, note,
      orderType, phoneNumber, utrNumber,
      paymentMethod,
      couponCode, discountAmount, originalAmount, // ← coupon fields
    } = req.body;

    if (!customerName || !tableNumber || !items || items.length === 0) {
      return res.status(400).json({ message: 'customerName, tableNumber and items are required.' });
    }

    const isTakeaway = orderType === 'takeaway';

    // Takeaway requires phone always
    if (isTakeaway) {
      if (!phoneNumber || phoneNumber.trim().length < 10) {
        return res.status(400).json({ message: 'Valid phone number is required for takeaway.' });
      }
      // UTR only required for manual UPI/card payments — NOT for Razorpay
      const isRazorpay = paymentMethod === 'razorpay';
      if (!isRazorpay) {
        if (!utrNumber || utrNumber.trim().length < 6) {
          return res.status(400).json({ message: 'UTR/Transaction ID is required for takeaway.' });
        }
      }
    }

    // If a coupon was applied, trust the frontend's discounted totalAmount.
    // Otherwise recalculate from items to prevent tampering.
    const hasCoupon = couponCode && typeof discountAmount === 'number' && discountAmount > 0;
    const computedTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalAmount = hasCoupon
      ? Math.max(0, computedTotal - discountAmount)  // server-verified discount
      : computedTotal;

    const pickupToken = isTakeaway ? await generatePickupToken() : '';

    // Validate paymentMethod — default to 'upi' for takeaway if not provided
    const validMethods = ['upi', 'debit-card', 'credit-card', 'razorpay'];
    const resolvedPaymentMethod = isTakeaway
      ? (validMethods.includes(paymentMethod) ? paymentMethod : 'upi')
      : 'not_required';

    const order = new Order({
      customerName,
      phoneNumber: phoneNumber || '',
      tableNumber: isTakeaway ? 'Takeaway' : tableNumber,
      orderType: isTakeaway ? 'takeaway' : 'dine-in',
      items,
      totalAmount,
      note: note || '',
      paymentStatus: isTakeaway ? 'pending_verification' : 'not_required',
      utrNumber: isTakeaway ? utrNumber.trim() : '',
      paymentMethod: resolvedPaymentMethod,
      pickupToken,
      // ── Coupon ────────────────────────────────────────────────────────────
      couponCode:     hasCoupon ? couponCode.trim().toUpperCase() : '',
      discountAmount: hasCoupon ? discountAmount : 0,
      originalAmount: hasCoupon ? computedTotal : 0,
    });

    await order.save();

    // Fire push to all admin devices — non-blocking, won't delay the response
    sendOrderPush(order).catch(() => { });

    res.status(201).json(order);
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// ── GET /orders — admin only ──────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { date, status, orderType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (orderType && ['dine-in', 'takeaway'].includes(orderType)) {
      filter.orderType = orderType;
    }
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
});

// ── GET /orders/track/:id — public ───────────────────────────────────────────
router.get('/track/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({
      status: order.status,
      totalAmount: order.totalAmount,
      orderType: order.orderType,
      pickupToken: order.pickupToken,
      paymentStatus: order.paymentStatus,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to track order.' });
  }
});

// ── GET /orders/history — admin only ─────────────────────────────────────────
// Query params: from=YYYY-MM-DD&to=YYYY-MM-DD&orderType=dine-in|takeaway&status=...
router.get('/history', protect, async (req, res) => {
  try {
    const { from, to, status, orderType } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: '`from` and `to` date params are required.' });
    }

    const start = new Date(from); start.setHours(0, 0, 0, 0);
    const end   = new Date(to);   end.setHours(23, 59, 59, 999);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    if (start > end) {
      return res.status(400).json({ message: '`from` must be before or equal to `to`.' });
    }

    const filter = { createdAt: { $gte: start, $lte: end } };
    if (status) filter.status = status;
    if (orderType && ['dine-in', 'takeaway'].includes(orderType)) {
      filter.orderType = orderType;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    // Summary stats for the range
    const nonCancelled  = orders.filter(o => o.status !== 'cancelled');
    const totalRevenue  = nonCancelled.reduce((sum, o) => sum + o.totalAmount, 0);
    const takeawayRevenue = nonCancelled
      .filter(o => o.orderType === 'takeaway')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // ── NEW: payment method breakdown for the period ──────────────────────
    const paymentBreakdown = { Cash: 0, UPI: 0, Card: 0, Unrecorded: 0 };
    nonCancelled.forEach((o) => {
      if ((o.orderType || 'dine-in') === 'dine-in') {
        if (o.dineInPaymentMethod === 'Cash') paymentBreakdown.Cash += o.totalAmount;
        else if (o.dineInPaymentMethod === 'UPI') paymentBreakdown.UPI += o.totalAmount;
        else if (o.dineInPaymentMethod === 'Card') paymentBreakdown.Card += o.totalAmount;
        else paymentBreakdown.Unrecorded += o.totalAmount;
      } else {
        if (o.paymentMethod === 'upi' || o.paymentMethod === 'razorpay') paymentBreakdown.UPI += o.totalAmount;
        else if (o.paymentMethod === 'debit-card' || o.paymentMethod === 'credit-card') paymentBreakdown.Card += o.totalAmount;
        else paymentBreakdown.Unrecorded += o.totalAmount;
      }
    });

    // ── Counts needed by frontend summary cards ────────────────────────────
    const dineInCount   = nonCancelled.filter((o) => (o.orderType || 'dine-in') === 'dine-in').length;
    const takeawayCount = nonCancelled.filter((o) => o.orderType === 'takeaway').length;

    // ── Top items in period (frontend expects this) ────────────────────────
    const itemMap = {};
    nonCancelled.forEach((o) => {
      o.items.forEach((it) => {
        if (!itemMap[it.name]) itemMap[it.name] = { qty: 0, revenue: 0 };
        itemMap[it.name].qty     += it.quantity;
        itemMap[it.name].revenue += it.price * it.quantity;
      });
    });
    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));

    res.json({
      from,
      to,
      orders,
      // 'summary' wraps everything the frontend's history card UI expects
      summary: {
        totalOrders:   orders.length,
        totalSales:    totalRevenue,
        dineInCount,
        takeawayCount,
        dineInSales:   totalRevenue - takeawayRevenue,
        takeawaySales: takeawayRevenue,
        paymentBreakdown,
        topItems,
      },
    });
  } catch (err) {
    console.error('Order history error:', err);
    res.status(500).json({ message: 'Failed to fetch order history.' });
  }
});

// ── GET /orders/daily-stats — admin only ──────────────────────────────────────
router.get('/daily-stats', protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' },
    });

    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const dineInOrders = orders.filter((o) => (o.orderType || 'dine-in') === 'dine-in').length;
    const takeawayOrders = orders.filter((o) => o.orderType === 'takeaway').length;
    const takeawaySales = orders.filter((o) => o.orderType === 'takeaway').reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingVerification = orders.filter((o) => o.paymentStatus === 'pending_verification').length;

    // ── NEW: payment method breakdown (dine-in Cash/UPI/Card + takeaway methods) ──
    const paymentBreakdown = { Cash: 0, UPI: 0, Card: 0, Unrecorded: 0 };
    orders.forEach((o) => {
      if ((o.orderType || 'dine-in') === 'dine-in') {
        if (o.dineInPaymentMethod === 'Cash') paymentBreakdown.Cash += o.totalAmount;
        else if (o.dineInPaymentMethod === 'UPI') paymentBreakdown.UPI += o.totalAmount;
        else if (o.dineInPaymentMethod === 'Card') paymentBreakdown.Card += o.totalAmount;
        else paymentBreakdown.Unrecorded += o.totalAmount;
      } else {
        // Takeaway — map existing paymentMethod to the same buckets
        if (o.paymentMethod === 'upi' || o.paymentMethod === 'razorpay') paymentBreakdown.UPI += o.totalAmount;
        else if (o.paymentMethod === 'debit-card' || o.paymentMethod === 'credit-card') paymentBreakdown.Card += o.totalAmount;
        else paymentBreakdown.Unrecorded += o.totalAmount;
      }
    });

    res.json({
      totalSales, totalOrders,
      dineInOrders, takeawayOrders, takeawaySales,
      pendingVerification,
      paymentBreakdown,   // ← NEW
      orders,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
});

// ── PUT /orders/:id — admin only ──────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const { status, paymentStatus, dineInPaymentMethod } = req.body;
    const updates = {};

    if (status) {
      const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      updates.status = status;
    }

    if (paymentStatus) {
      const validPayment = ['not_required', 'pending_verification', 'paid', 'failed'];
      if (!validPayment.includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid paymentStatus value.' });
      }
      updates.paymentStatus = paymentStatus;
    }

    // ── NEW: dine-in payment method (Cash / UPI / Card) ────────────────────
    if (dineInPaymentMethod !== undefined) {
      const validDineInMethods = ['Cash', 'UPI', 'Card', ''];
      if (!validDineInMethods.includes(dineInPaymentMethod)) {
        return res.status(400).json({ message: 'Invalid dineInPaymentMethod value.' });
      }
      updates.dineInPaymentMethod = dineInPaymentMethod;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ message: 'Failed to update order.' });
  }
});

// ── DELETE /orders — admin only (clear ALL) ───────────────────────────────────
router.delete('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    await Order.deleteMany({});
    res.json({ message: `${orders.length} order(s) deleted.`, count: orders.length, deletedOrders: orders });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear orders.' });
  }
});

// ── DELETE /orders/:id — admin only ──────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order deleted.', deletedOrder: order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete order.' });
  }
});

module.exports = router;
