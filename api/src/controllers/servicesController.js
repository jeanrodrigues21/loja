const db = require('../config/database');

const getAllServices = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM services WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [services] = await db.query(query, params);

    res.json({
      success: true,
      data: { services }
    });
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: { service: services[0] }
    });
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { description, vehicle, price } = req.body;

    const [result] = await db.query(
      'INSERT INTO services (description, vehicle, price, status, user_id) VALUES (?, ?, ?, ?, ?)',
      [description, vehicle, parseFloat(price), 'active', req.user.id]
    );

    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service: services[0] }
    });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, vehicle, price, status } = req.body;

    const updates = [];
    const values = [];

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (vehicle !== undefined) {
      updates.push('vehicle = ?');
      values.push(vehicle);
    }

    if (price !== undefined) {
      updates.push('price = ?');
      values.push(parseFloat(price));
    }

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id, req.user.id);

    const [result] = await db.query(
      `UPDATE services SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service: services[0] }
    });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM services WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};