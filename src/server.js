require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");

// Route imports
const authRoutes = require("./routes/auth");
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const analyticsRoutes = require("./routes/analyticsRoutes");
const shopStatusRoutes = require("./routes/shopStatus"); // ← NEW (only addition)

const app = express();

connectDB();

// Security
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://dieselcafe.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ── Rate Limiters ──────────────────────────────────────────────────────────────

// Strict limiter — login attempts only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/logo', express.json({ limit: '5mb' })); // logo upload needs more space
app.use(express.json({ limit: '10kb' }));                  // everything else stays strict

// Light limiter — public customer routes only (menu browsing, order placement)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply limiters ONLY where needed
app.use("/api/auth/login", authLimiter);   // strict — login only
app.use("/api/menu", publicLimiter); // customers browsing menu
// NOTE: /api/orders, /api/analytics, /api/shop-status get NO limiter
//       — they're all protected by JWT auth middleware already

// app.use("/api/", limiter);
app.use("/api/auth/login", authLimiter);
app.use(express.json({ limit: "10kb" }));
app.use(mongoSanitize());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes (everything identical to original, one new line added)
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/shop-status", shopStatusRoutes); // ← NEW

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
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
