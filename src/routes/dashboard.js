const express = require('express');
const { allQuery, getQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Buscar apenas serviços ativos (não fechados)
    const activeServices = await allQuery(
      'SELECT * FROM services WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 100',
      [userId]
    );

    // Contar serviços ativos
    const activeServicesCount = activeServices.length;

    // Calcular receita total apenas de serviços ativos
    const revenueResult = await allQuery(
      'SELECT SUM(price) as total FROM services WHERE user_id = ? AND status = "active"',
      [userId]
    );
    const totalRevenue = revenueResult[0]?.total || 0;

    // Calcular despesas totais apenas de despesas ativas (não fechadas)
    const expensesResult = await allQuery(
      'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND (status IS NULL OR status = "active")',
      [userId]
    );
    const totalExpenses = expensesResult[0]?.total || 0;

    // Calcular lucro
    const totalProfit = totalRevenue - totalExpenses;

    // Buscar retiradas
    const withdrawalsResult = await allQuery(
      'SELECT SUM(amount) as total, part_type FROM withdrawals WHERE user_id = ? GROUP BY part_type',
      [userId]
    );

    const withdrawals = {
      part1: 0,
      part2: 0
    };

    withdrawalsResult.forEach(w => {
      if (w.part_type === 'part1') withdrawals.part1 = w.total || 0;
      if (w.part_type === 'part2') withdrawals.part2 = w.total || 0;
    });

    // Buscar nomes das partes
    const part1Name = await getQuery('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['part1_name']);
    const part2Name = await getQuery('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['part2_name']);

    // Buscar agendamentos de hoje
    const today = new Date().toISOString().split('T')[0];
    const todaysAppointments = await allQuery(
      'SELECT * FROM appointments WHERE user_id = ? AND date = ? ORDER BY time',
      [userId, today]
    );

    res.json({
      success: true,
      activeServicesCount,
      totalRevenue,
      totalExpenses,
      totalProfit,
      withdrawals,
      partNames: {
        part1: part1Name?.setting_value || 'Instalador',
        part2: part2Name?.setting_value || 'Oficina'
      },
      services: activeServices,
      todaysAppointments
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar dashboard'
    });
  }
});

// Obter configurações das partes
router.get('/part-names', requireAuth, async (req, res) => {
  try {
    const part1Name = await getQuery('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['part1_name']);
    const part2Name = await getQuery('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['part2_name']);

    res.json({
      success: true,
      partNames: {
        part1: part1Name?.setting_value || 'Instalador',
        part2: part2Name?.setting_value || 'Oficina'
      }
    });
  } catch (error) {
    console.error('Erro ao buscar nomes das partes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configurações'
    });
  }
});

module.exports = router;