// controllers/analyticsController.js
// ─────────────────────────────────────────────────────────────────────────
//  All sales analytics queries live here. Uses MongoDB aggregation
//  pipelines for efficiency — no data pulled into JS to crunch.
//
//  IMPORTANT: We query status === "served" (the final success state
//  in this project's Order schema). Adjust if your flow differs.
// ─────────────────────────────────────────────────────────────────────────

const Order = require("../models/Order");

// ─── Helper: month name array (MongoDB $month returns 1-based index) ──────
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ─── Helper: weekday name array (MongoDB $dayOfWeek: 1=Sun … 7=Sat) ──────
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * GET /api/analytics/sales?year=2025
 *
 * Returns a single JSON object with all analytics data:
 *   - summary       → KPI cards (yearly totals, averages)
 *   - monthlyData   → Jan–Dec revenue + order count
 *   - weeklyData    → Sun–Sat revenue + order count
 *   - topItems      → Top 5 best-selling menu items by quantity
 *   - recentGrowth  → Last 4 weeks revenue (for trend indicator)
 */
const getSalesAnalytics = async (req, res) => {
  try {
    // ── Year selection: default to current year ───────────────────────────
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    // Date boundaries for the requested year
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd   = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    // Shared match stage: only "served" orders in the target year
    const baseMatch = {
      $match: {
        status:    "served",
        createdAt: { $gte: yearStart, $lt: yearEnd },
      },
    };

    // ── Run all aggregations in parallel for speed ────────────────────────
    const [summaryResult, monthlyRaw, weeklyRaw, topItemsRaw, allYearsRaw] =
      await Promise.all([

        // 1. SUMMARY — single document with yearly totals
        Order.aggregate([
          baseMatch,
          {
            $group: {
              _id:          null,
              totalRevenue: { $sum: "$totalAmount" },
              totalOrders:  { $sum: 1 },
              avgOrderValue:{ $avg: "$totalAmount" },
              maxOrder:     { $max: "$totalAmount" },
            },
          },
        ]),

        // 2. MONTHLY DATA — revenue + orders for each month of the year
        Order.aggregate([
          baseMatch,
          {
            $group: {
              _id:     { $month: "$createdAt" }, // 1–12
              revenue: { $sum: "$totalAmount" },
              orders:  { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // 3. WEEKLY DATA — revenue + orders grouped by day of week
        Order.aggregate([
          baseMatch,
          {
            $group: {
              _id:     { $dayOfWeek: "$createdAt" }, // 1=Sun … 7=Sat
              revenue: { $sum: "$totalAmount" },
              orders:  { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // 4. TOP ITEMS — unwind items array, group by item name
        Order.aggregate([
          baseMatch,
          { $unwind: "$items" },
          {
            $group: {
              _id:      "$items.name",
              quantity: { $sum: "$items.quantity" },
              revenue:  { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id:      0,
              name:     "$_id",
              quantity: 1,
              revenue:  1,
            },
          },
        ]),

        // 5. ALL YEARS available (for the year picker dropdown)
        Order.aggregate([
          { $match: { status: "served" } },
          {
            $group: {
              _id: { $year: "$createdAt" },
            },
          },
          { $sort: { _id: -1 } },
          { $project: { _id: 0, year: "$_id" } },
        ]),
      ]);

    // ── Shape summary ─────────────────────────────────────────────────────
    const summary = summaryResult[0] || {
      totalRevenue:  0,
      totalOrders:   0,
      avgOrderValue: 0,
      maxOrder:      0,
    };

    // ── Shape monthly data: fill in all 12 months (0 if no orders) ────────
    const monthMap = new Map(monthlyRaw.map((m) => [m._id, m]));
    const monthlyData = MONTH_NAMES.map((name, i) => {
      const monthNum = i + 1;
      const found    = monthMap.get(monthNum);
      return {
        month:   name,
        revenue: found?.revenue ?? 0,
        orders:  found?.orders  ?? 0,
      };
    });

    // Best month calculation
    const bestMonth = monthlyData.reduce(
      (best, m) => (m.revenue > best.revenue ? m : best),
      { month: "—", revenue: 0 }
    );

    // ── Shape weekly data: fill all 7 days ────────────────────────────────
    const weekMap = new Map(weeklyRaw.map((d) => [d._id, d]));
    const weeklyData = WEEKDAY_NAMES.map((name, i) => {
      const dayNum = i + 1; // MongoDB: 1=Sun
      const found  = weekMap.get(dayNum);
      return {
        day:     name,
        revenue: found?.revenue ?? 0,
        orders:  found?.orders  ?? 0,
      };
    });

    // ── Available years list (ensure current year is always included) ──────
    const availableYears = allYearsRaw.map((y) => y.year);
    if (!availableYears.includes(year)) availableYears.unshift(year);

    // ── Send response ─────────────────────────────────────────────────────
    res.json({
      year,
      availableYears,
      summary: {
        totalRevenue:  Math.round(summary.totalRevenue),
        totalOrders:   summary.totalOrders,
        avgOrderValue: Math.round(summary.avgOrderValue || 0),
        maxOrder:      Math.round(summary.maxOrder || 0),
        bestMonth:     bestMonth.month,
        bestMonthRevenue: Math.round(bestMonth.revenue),
      },
      monthlyData,
      weeklyData,
      topItems: topItemsRaw,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Failed to load analytics data" });
  }
};

module.exports = { getSalesAnalytics };
