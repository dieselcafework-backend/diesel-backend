/**
 * middleware/shopStatus.js
 *
 * Blocks public routes with 403 when the café is closed.
 * CustomerMenu.jsx already handles 403 on /api/menu → shows closed screen.
 *
 * Uses a 10-second in-memory cache so MongoDB isn't hit on every request.
 */

const Admin = require('../models/Admin');

let _cachedStatus = null;   // true = open, false = closed
let _lastFetched  = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

const requireShopOpen = async (req, res, next) => {
  try {
    const now = Date.now();

    // Refresh cache if stale or empty
    if (_cachedStatus === null || now - _lastFetched > CACHE_TTL_MS) {
      const admin   = await Admin.findOne({}).select('isOpen').lean();
      _cachedStatus = admin ? admin.isOpen : true; // fail-open if no admin doc exists
      _lastFetched  = now;
    }

    if (!_cachedStatus) {
      return res.status(403).json({
        message:    'The café is currently closed. Please visit again later.',
        shopClosed: true,
      });
    }

    next();
  } catch (err) {
    // Fail open — never block customers because of a DB error
    console.error('[shopStatus middleware] error:', err.message);
    next();
  }
};

/**
 * requireShopOpen.bust()
 * Call this immediately after updating isOpen in the DB so the next
 * customer request picks up the fresh status without waiting for cache TTL.
 */
requireShopOpen.bust = () => {
  _cachedStatus = null;
  _lastFetched  = 0;
};

module.exports = requireShopOpen;
