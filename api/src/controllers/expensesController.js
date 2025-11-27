const db = require('../config/database');

const getAllExpenses = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY date DESC';

    const [expenses] = await db.query(query, params);

    res.json({
      success: true,
      data: { expenses }
    });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const { description, amount, date } = req.body;

    const [result] = await db.query(
      'INSERT INTO expenses (description, amount, date, status, user_id) VALUES (?, ?, ?, ?, ?)',
      [description, parseFloat(amount), date, 'active', req.user.id]
    );

    const [expenses] = await db.query(
      'SELECT * FROM expenses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: { expense: expenses[0] }
    });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExpenses,
  createExpense,
  deleteExpense
};