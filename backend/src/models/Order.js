const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:     { type: String,  required: true },
  price:    { type: Number,  required: true },
  quantity: { type: Number,  required: true, min: 1 },
  veg:      { type: Boolean, default: true },
});

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber:  { type: String, default: '', trim: true },
    tableNumber:  { type: String, required: true, trim: true },

    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway'],
      default: 'dine-in',
    },

    items:       [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'ready', 'completed'],
      default: 'pending',
    },

    note: { type: String, default: '' },

    // ── UPI Payment fields (takeaway only) ──────────────────────────────────
    paymentStatus: {
      type: String,
      enum: [
        'not_required',         // dine-in
        'pending_verification', // takeaway — UTR submitted, admin must verify
        'paid',                 // admin verified
        'failed',               // marked failed by admin
      ],
      default: 'not_required',
    },

    // UTR = Unique Transaction Reference — transaction ID from payment app
    utrNumber: { type: String, default: '', trim: true },

    // ── NEW: which payment method customer used ──────────────────────────────
    paymentMethod: {
      type: String,
      enum: ['upi', 'debit-card', 'credit-card', 'not_required'],
      default: 'not_required',
    },

    // Daily pickup token e.g. "T-001"
    pickupToken: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
