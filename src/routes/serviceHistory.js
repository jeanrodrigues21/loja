const express = require('express');
const { allQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Histórico de serviços
router.get('/service-history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Buscar todos os serviços
    const services = await allQuery(
      'SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Buscar todas as despesas
    const expenses = await allQuery(
      'SELECT * FROM expenses WHERE user_id = ?',
      [userId]
    );

    // Calcular totais
    const totalServices = services.length;
    const totalRevenue = services.reduce((sum, service) => sum + (service.price || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalBalance = totalRevenue - totalExpenses;

    // Agrupar serviços por status
    const servicesByStatus = services.reduce((acc, service) => {
      const status = service.status === 'active' ? 'Ativo' : 
                    service.status === 'completed' ? 'Concluído' : 'Outros';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Mapear serviços com status em português
    const servicesWithStatus = services.map(service => ({
      ...service,
      status: service.status === 'active' ? 'Ativo' : 
              service.status === 'completed' ? 'Concluído' : 'Outros'
    }));

    res.json({
      success: true,
      totalServices,
      totalRevenue,
      totalExpenses,
      totalBalance,
      servicesByStatus,
      services: servicesWithStatus
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de serviços'
    });
  }
});

module.exports = router;