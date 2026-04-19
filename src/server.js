require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');

const Admin = require('./models/Admin');
const MenuItem = require('./models/Menu');
const seedData = require('./seed/seedData');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'https://golden-bienenstitch-ef8519.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Increased limit to 200 to accommodate polling every 3-5 seconds
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again in a moment.' },
});
app.use(limiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/ping', (req, res) => {
  res.status(200).send('Server is alive');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

// ─── Database & Seeding ───────────────────────────────────────────────────────
async function ensureSaladSoupSeeded() {
  const existing = await MenuItem.countDocuments({ superCategory: 'Salad & Soup' });
  if (existing === 0) {
    const items = seedData.filter((i) => i.superCategory === 'Salad & Soup');
    if (items.length > 0) {
      await MenuItem.insertMany(items);
      console.log(`✅ Salad & Soup seeded: ${items.length} items added.`);
    }
  }
}

async function seedDatabase() {
  // Seed admin
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL || 'admin@dieselcafe.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      name: 'Diesel Café Admin',
    });
    await admin.save();
    console.log('✅ Admin account seeded:', admin.email);
  }

  // Seed all menu items (fresh DB)
  const menuCount = await MenuItem.countDocuments();
  if (menuCount === 0) {
    await MenuItem.insertMany(seedData);
    console.log(`✅ Menu seeded with ${seedData.length} items.`);
  } else {
    // Existing DB — patch-seed Salad & Soup if missing
    await ensureSaladSoupSeeded();
  }
}

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/diesel-cafe');
    console.log('✅ MongoDB connected.');

    await seedDatabase();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Diesel Café server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
