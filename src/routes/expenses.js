const express = require('express');
const { allQuery, runQuery, getQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Listar despesas ativas (não fechadas)
router.get('/expenses', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const expenses = await allQuery(
      'SELECT * FROM expenses WHERE user_id = ? AND (status IS NULL OR status = "active") ORDER BY date DESC',
      [userId]
    );

    res.json({
      success: true,
      expenses
    });
  } catch (error) {
    console.error('Erro ao buscar despesas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar despesas'
    });
  }
});

// Criar despesa
router.post('/expenses', requireAuth, async (req, res) => {
  try {
    const { description, amount, date } = req.body;
    const userId = req.session.user.id;

    if (!description || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    const result = await runQuery(
      'INSERT INTO expenses (description, amount, date, status, user_id) VALUES (?, ?, ?, ?, ?)',
      [description, parseFloat(amount), date, 'active', userId]
    );

    const newExpense = await getQuery(
      'SELECT * FROM expenses WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Despesa criada com sucesso',
      expense: newExpense
    });
  } catch (error) {
    console.error('Erro ao criar despesa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar despesa'
    });
  }
});

// Excluir despesa
router.delete('/expenses/:id', requireAuth, async (req, res) => {
  try {
    const expenseId = req.params.id;
    const userId = req.session.user.id;

    // Verificar se a despesa pertence ao usuário e está ativa
    const expense = await getQuery(
      'SELECT * FROM expenses WHERE id = ? AND user_id = ? AND (status IS NULL OR status = "active")',
      [expenseId, userId]
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Despesa não encontrada ou já foi fechada'
      });
    }

    await runQuery(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [expenseId, userId]
    );

    res.json({
      success: true,
      message: 'Despesa excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir despesa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir despesa'
    });
  }
});

module.exports = router;