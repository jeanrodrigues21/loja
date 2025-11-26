const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    validate
  ],
  register
);

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  login
);

router.get('/profile', authenticate, getProfile);

router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
  ],
  updateProfile
);

module.exports = router;
