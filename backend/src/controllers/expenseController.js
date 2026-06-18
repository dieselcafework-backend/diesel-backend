const Expense = require('../models/Expense');
const Order   = require('../models/Order');

// ── IST timezone helper (same pattern as orders.js) ───────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const istDateStringBounds = (dateStr) => ({
  start: new Date(`${dateStr}T00:00:00+05:30`),
  end:   new Date(`${dateStr}T23:59:59.999+05:30`),
});

const istPeriodBounds = (period) => {
  const nowUTC  = Date.now();
  const nowIST  = nowUTC + IST_OFFSET_MS;
  const istMidnight = nowIST - (nowIST % (24 * 60 * 60 * 1000));

  const todayStart = new Date(istMidnight - IST_OFFSET_MS);
  const todayEnd   = new Date(istMidnight - IST_OFFSET_MS + 24 * 60 * 60 * 1000);

  switch (period) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'week': {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 6);
      return { start: weekStart, end: todayEnd };
    }
    case 'month': {
      const monthStart = new Date(todayStart);
      monthStart.setDate(1);
      return { start: monthStart, end: todayEnd };
    }
    case 'year': {
      const yearStart = new Date(todayStart);
      yearStart.setMonth(0, 1);
      return { start: yearStart, end: todayEnd };
    }
    default:
      return { start: new Date(0), end: todayEnd };
  }
};

// ── POST /api/expenses — create ───────────────────────────────────────────────
const createExpense = async (req, res) => {
  try {
    const { title, amount, category, vendor, notes, paymentMethod, expenseDate, recurring, recurrenceType } = req.body;
    if (!title || !amount || !category) {
      return res.status(400).json({ message: 'title, amount and category are required.' });
    }
    const expense = await Expense.create({
      title, amount, category,
      vendor:        vendor        || '',
      notes:         notes         || '',
      paymentMethod: paymentMethod || 'Cash',
      expenseDate:   expenseDate   ? new Date(expenseDate) : new Date(),
      recurring:     recurring     || false,
      recurrenceType: recurrenceType || '',
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ message: 'Failed to create expense.' });
  }
};

// ── GET /api/expenses — list with filters ─────────────────────────────────────
// Query params: period, category, from, to, search
const getExpenses = async (req, res) => {
  try {
    const { period, category, from, to, search } = req.query;
    const filter = {};

    // Date filter
    if (from && to) {
      const { start } = istDateStringBounds(from);
      const { end }   = istDateStringBounds(to);
      filter.expenseDate = { $gte: start, $lte: end };
    } else if (period && period !== 'all') {
      const { start, end } = istPeriodBounds(period);
      filter.expenseDate = { $gte: start, $lte: end };
    }

    // Category filter
    if (category && category !== 'all') filter.category = category;

    // Search filter
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: re }, { vendor: re }, { notes: re }];
    }

    const expenses = await Expense.find(filter).sort({ expenseDate: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ message: 'Failed to fetch expenses.' });
  }
};

// ── PUT /api/expenses/:id — update ───────────────────────────────────────────
const updateExpense = async (req, res) => {
  try {
    const { title, amount, category, vendor, notes, paymentMethod, expenseDate, recurring, recurrenceType } = req.body;
    const updates = {};
    if (title         !== undefined) updates.title         = title;
    if (amount        !== undefined) updates.amount        = amount;
    if (category      !== undefined) updates.category      = category;
    if (vendor        !== undefined) updates.vendor        = vendor;
    if (notes         !== undefined) updates.notes         = notes;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (expenseDate   !== undefined) updates.expenseDate   = new Date(expenseDate);
    if (recurring     !== undefined) updates.recurring     = recurring;
    if (recurrenceType !== undefined) updates.recurrenceType = recurrenceType;

    const expense = await Expense.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json(expense);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ message: 'Failed to update expense.' });
  }
};

// ── DELETE /api/expenses/:id ──────────────────────────────────────────────────
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json({ message: 'Expense deleted.' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Failed to delete expense.' });
  }
};

// ── GET /api/expenses/analytics — summary + category breakdown + profit ────────
// Query: period | (from + to)
const getExpenseAnalytics = async (req, res) => {
  try {
    const { period = 'month', from, to } = req.query;

    let dateFilter;
    if (from && to) {
      const { start } = istDateStringBounds(from);
      const { end }   = istDateStringBounds(to);
      dateFilter = { $gte: start, $lte: end };
    } else {
      const { start, end } = istPeriodBounds(period);
      dateFilter = { $gte: start, $lte: end };
    }

    // Always compute the 4 dashboard cards (today / week / month / year)
    const [todayBounds, weekBounds, monthBounds, yearBounds] = [
      istPeriodBounds('today'),
      istPeriodBounds('week'),
      istPeriodBounds('month'),
      istPeriodBounds('year'),
    ];

    const [
      periodExpenses,
      categoryBreakdown,
      trendRaw,
      todayTotal,
      weekTotal,
      monthTotal,
      yearTotal,
      periodSales,
      periodOrdersForPayment,
    ] = await Promise.all([

      // Total expenses for selected period
      Expense.aggregate([
        { $match: { expenseDate: dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),

      // Category breakdown for selected period
      Expense.aggregate([
        { $match: { expenseDate: dateFilter } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),

      // Daily trend for selected period (for line chart)
      Expense.aggregate([
        { $match: { expenseDate: dateFilter } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$expenseDate', timezone: '+05:30' },
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Dashboard cards
      Expense.aggregate([{ $match: { expenseDate: { $gte: todayBounds.start, $lte: todayBounds.end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { expenseDate: { $gte: weekBounds.start,  $lte: weekBounds.end  } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { expenseDate: { $gte: monthBounds.start, $lte: monthBounds.end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { expenseDate: { $gte: yearBounds.start,  $lte: yearBounds.end  } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),

      // Sales for selected period (for profit calculation)
      Order.aggregate([
        { $match: { createdAt: dateFilter, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // ── NEW: sales orders for payment-method breakdown ──────────────────
      Order.find({ createdAt: dateFilter, status: { $ne: 'cancelled' } })
        .select('totalAmount orderType dineInPaymentMethod paymentMethod'),
    ]);

    const totalExpenses = periodExpenses[0]?.total || 0;
    const totalSales    = periodSales[0]?.total    || 0;

    // ── NEW: payment method breakdown (Cash / UPI / Card / Unrecorded) ──────
    const paymentBreakdown = { Cash: 0, UPI: 0, Card: 0, Unrecorded: 0 };
    periodOrdersForPayment.forEach((o) => {
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

    res.json({
      // Period summary
      totalExpenses: Math.round(totalExpenses),
      totalSales:    Math.round(totalSales),
      totalProfit:   Math.round(totalSales - totalExpenses),
      expenseCount:  periodExpenses[0]?.count || 0,

      // Dashboard cards
      cards: {
        today:  Math.round(todayTotal[0]?.total  || 0),
        week:   Math.round(weekTotal[0]?.total   || 0),
        month:  Math.round(monthTotal[0]?.total  || 0),
        year:   Math.round(yearTotal[0]?.total   || 0),
      },

      // Category breakdown (for pie chart)
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c._id,
        total:    Math.round(c.total),
        count:    c.count,
      })),

      // Daily trend (for line chart)
      trend: trendRaw.map((t) => ({ date: t._id, total: Math.round(t.total) })),

      // Payment method breakdown (Cash / UPI / Card) — NEW
      paymentBreakdown: {
        Cash:       Math.round(paymentBreakdown.Cash),
        UPI:        Math.round(paymentBreakdown.UPI),
        Card:       Math.round(paymentBreakdown.Card),
        Unrecorded: Math.round(paymentBreakdown.Unrecorded),
      },
    });
  } catch (err) {
    console.error('Expense analytics error:', err);
    res.status(500).json({ message: 'Failed to load expense analytics.' });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getExpenseAnalytics,
};
