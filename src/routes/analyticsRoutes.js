// routes/analyticsRoutes.js
// ─────────────────────────────────────────────────────────────────────────
//  Analytics API routes. All endpoints require admin JWT.
// ─────────────────────────────────────────────────────────────────────────

const express = require("express");
const { protect } = require("../middleware/auth");
const { getSalesAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

// All analytics routes are admin-protected
router.use(protect);

/**
 * GET /api/analytics/sales
 * Query params:
 *   ?year=2025   → filter by year (defaults to current year)
 *
 * Returns: summary KPIs, monthlyData, weeklyData, topItems, availableYears
 */
router.get("/sales", getSalesAnalytics);

module.exports = router;
