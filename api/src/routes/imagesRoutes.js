const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadImage,
  getUserImages,
  deleteImage
} = require('../controllers/imagesController');

const router = express.Router();

router.use(authenticate);

router.post('/upload', upload.single('image'), uploadImage);

router.get('/', getUserImages);

router.delete(
  '/:id',
  [
    param('id').isInt().withMessage('Invalid image ID'),
    validate
  ],
  deleteImage
);

module.exports = router;
