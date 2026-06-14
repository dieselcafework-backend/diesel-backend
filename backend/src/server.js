require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const paymentRoutes = require('./routes/payments');
const authRoutes = require("./routes/auth");
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const analyticsRoutes = require("./routes/analyticsRoutes");
const shopStatusRoutes = require("./routes/shopStatus");
const pushRoutes = require('./routes/push');
const expenseRoutes = require('./routes/expenseRoutes');
const couponRoutes = require("./routes/couponRoutes");

const app = express();

connectDB();

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
//
// CSP directive breakdown:
//   defaultSrc    — block everything not explicitly listed below
//   scriptSrc     — allow own scripts + Razorpay checkout (required for payment UI)
//   styleSrc      — allow own styles + Google Fonts CDN + inline styles (React uses these)
//   fontSrc       — allow Google Fonts binary files
//   imgSrc        — allow own images + data: URIs (base64 logo stored in DB)
//   connectSrc    — allow fetch/XHR to own API (Render backend URL) + localhost dev
//   frameSrc      — block iframes entirely (Razorpay opens a popup, not iframe)
//   objectSrc     — block Flash/plugins entirely
//   upgradeInsecureRequests — auto-upgrade http:// links to https:// in production
//
// X-Frame-Options  : SAMEORIGIN  — prevents clickjacking from other origins
// X-Content-Type   : nosniff     — prevents MIME-type sniffing attacks
// Referrer-Policy  : strict-origin-when-cross-origin — leaks minimal referrer info
// Permissions-Policy: disables camera, mic, geolocation APIs the app never uses

const BACKEND_URL = process.env.BACKEND_URL || 'https://diesel-backend-zl8a.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dieselcafe.netlify.app';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com", "https://cdn.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          BACKEND_URL,
          "https://api.razorpay.com",
          "https://lumberjack.razorpay.com",
          ...(process.env.NODE_ENV !== 'production' ? ["http://localhost:5173", "http://localhost:3000"] : []),
        ],
        frameSrc: ["https://api.razorpay.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Permissions-Policy header (helmet doesn't have a built-in setter, add manually)
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://dieselcafe.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.error('CORS blocked:', origin);
    return callback(new Error(`CORS: ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.set('trust proxy', 1);

// ── Rate Limiters ─────────────────────────────────────────────────────────────
//
// Three tiers:
//   globalLimiter  — catch-all safety net on every /api route (1000 req/15 min)
//   publicLimiter  — menu browsing; unauthenticated, high-volume (300 req/15 min)
//   authLimiter    — login brute-force protection (10 req/15 min)
//   writeLimiter   — order creation, coupon apply, expense submit (60 req/15 min)
//
// Order matters: specific limiters below override the global for their routes
// because express-rate-limit tracks each middleware instance separately.

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/menu", publicLimiter);
app.use("/api/orders", writeLimiter);
app.use("/api/coupons", writeLimiter);
app.use("/api/expenses", writeLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
//
// IMPORTANT ORDER — must stay exactly like this:
//
// 1. Razorpay webhook FIRST with express.raw() — Razorpay sends raw bytes and
//    verifies an HMAC over the raw body. If express.json() runs first it
//    re-serialises the body, changing the byte sequence and breaking signature
//    verification every time (silent security failure).
//
// 2. Logo route with 5mb limit SECOND — base64 images can be up to ~2MB.
//
// 3. General express.json() with 10kb limit LAST — applies to all other routes.
//    10kb is generous for any JSON API payload in this app.

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/auth/logo', express.json({ limit: '5mb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/payments', paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/shop-status", shopStatusRoutes);
app.use('/api/push', pushRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/expenses", expenseRoutes);

// Health check — allowedOrigins removed (was leaking server config)
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
