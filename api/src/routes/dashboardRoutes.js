const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getDashboard,
  getServiceHistory
} = require('../controllers/dashboardController');

const router = express.Router();

router.use(authenticate);

router.get('/', getDashboard);
router.get('/history', getServiceHistory);

module.exports = router;
