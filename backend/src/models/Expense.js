const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Inventory Purchase',
        'Operations',
        'Maintenance',
        'Marketing',
        'Salary',
        'Utilities',
        'Miscellaneous',
      ],
    },
    vendor: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'],
      default: 'Cash',
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // ── Optional recurring fields ─────────────────────────────────────────
    recurring: {
      type: Boolean,
      default: false,
    },
    recurrenceType: {
      type: String,
      enum: ['monthly', 'weekly', ''],
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
