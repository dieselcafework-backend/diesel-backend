const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getExpenseAnalytics,
} = require('../controllers/expenseController');

const router = express.Router();

// All expense routes are admin-only
router.get('/analytics', protect, getExpenseAnalytics); // GET before /:id to avoid conflict
router.get('/',          protect, getExpenses);
router.post('/',         protect, createExpense);
router.put('/:id',       protect, updateExpense);
router.delete('/:id',    protect, deleteExpense);

module.exports = router;
