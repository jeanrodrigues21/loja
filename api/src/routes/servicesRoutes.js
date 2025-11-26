const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/servicesController');

const router = express.Router();

router.use(authenticate);

router.get('/', getAllServices);

router.get(
  '/:id',
  [
    param('id').isInt().withMessage('Invalid service ID'),
    validate
  ],
  getServiceById
);

router.post(
  '/',
  [
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('vehicle').trim().notEmpty().withMessage('Vehicle is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    validate
  ],
  createService
);

router.put(
  '/:id',
  [
    param('id').isInt().withMessage('Invalid service ID'),
    body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
    body('vehicle').optional().trim().notEmpty().withMessage('Vehicle cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('status').optional().isIn(['active', 'completed', 'cancelled']).withMessage('Invalid status'),
    validate
  ],
  updateService
);

router.delete(
  '/:id',
  [
    param('id').isInt().withMessage('Invalid service ID'),
    validate
  ],
  deleteService
);

module.exports = router;
