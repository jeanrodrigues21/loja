const express = require('express');
const { allQuery, runQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Fechar período
router.post('/periods/close', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Calcular totais do período atual (apenas serviços e despesas ativas)
    const servicesResult = await allQuery(
      'SELECT COUNT(*) as count, SUM(price) as total FROM services WHERE user_id = ? AND status = "active"',
      [userId]
    );

    const expensesResult = await allQuery(
      'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND status IS NULL OR status = "active"',
      [userId]
    );

    const totalServices = servicesResult[0]?.count || 0;
    const totalValue = servicesResult[0]?.total || 0;
    const totalExpenses = expensesResult[0]?.total || 0;
    const netTotal = totalValue - totalExpenses;

    // Salvar período fechado
    const periodResult = await runQuery(
      `INSERT INTO closed_periods 
       (total_services, total_value, total_expenses, net_total, period_start, period_end, user_id) 
       VALUES (?, ?, ?, ?, date('now', '-30 days'), date('now'), ?)`,
      [totalServices, totalValue, totalExpenses, netTotal, userId]
    );

    // Marcar serviços como concluídos
    await runQuery(
      'UPDATE services SET status = "completed" WHERE user_id = ? AND status = "active"',
      [userId]
    );

    // Marcar despesas como fechadas (adicionar coluna status se não existir)
    await runQuery(
      'UPDATE expenses SET status = "closed" WHERE user_id = ? AND (status IS NULL OR status = "active")',
      [userId]
    );

    res.json({
      success: true,
      message: 'Período fechado com sucesso',
      period: {
        id: periodResult.id,
        total_services: totalServices,
        total_value: totalValue,
        total_expenses: totalExpenses,
        net_total: netTotal
      }
    });
  } catch (error) {
    console.error('Erro ao fechar período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fechar período'
    });
  }
});

// Listar períodos fechados
router.get('/periods', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const periods = await allQuery(
      'SELECT * FROM closed_periods WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      periods
    });
  } catch (error) {
    console.error('Erro ao buscar períodos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar períodos'
    });
  }
});

module.exports = router;