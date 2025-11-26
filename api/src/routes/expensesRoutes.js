const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const {
  getAllExpenses,
  createExpense,
  deleteExpense
} = require('../controllers/expensesController');

const router = express.Router();

router.use(authenticate);

router.get('/', getAllExpenses);

router.post(
  '/',
  [
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('date').isISO8601().withMessage('Invalid date format'),
    validate
  ],
  createExpense
);

router.delete(
  '/:id',
  [
    param('id').isInt().withMessage('Invalid expense ID'),
    validate
  ],
  deleteExpense
);

module.exports = router;
