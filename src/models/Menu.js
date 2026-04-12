const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    superCategory: {
      type: String,
      required: true,
      enum: ['Meals', 'Snacks', 'Salad & Soup', 'Beverages', 'All Items'],
    },
    subCategory: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    veg: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop',
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
