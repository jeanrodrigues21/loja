const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileName = req.file.filename;
    const filePath = req.file.path;
    const fileUrl = `/uploads/${fileName}`;

    // Save image metadata to database
    const [result] = await db.query(
      'INSERT INTO images (user_id, file_name, file_path, url, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, fileName, filePath, fileUrl, req.file.mimetype, req.file.size]
    );

    const [images] = await db.query(
      'SELECT * FROM images WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: { image: images[0] }
    });
  } catch (error) {
    // Clean up file if database operation fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    next(error);
  }
};

const getUserImages = async (req, res, next) => {
  try {
    const [images] = await db.query(
      'SELECT * FROM images WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: { images }
    });
  } catch (error) {
    next(error);
  }
};

const deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get image details
    const [images] = await db.query(
      'SELECT * FROM images WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = images[0];

    // Delete file from filesystem
    try {
      await fs.unlink(image.file_path);
    } catch (unlinkError) {
      console.error('Error deleting file:', unlinkError);
    }

    // Delete from database
    await db.query(
      'DELETE FROM images WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
  getUserImages,
  deleteImage
};