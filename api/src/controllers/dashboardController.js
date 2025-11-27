const db = require('../config/database');

const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get active services
    const [activeServices] = await db.query(
      'SELECT * FROM services WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
      [userId, 'active']
    );

    // Calculate total revenue from active services
    const [revenueData] = await db.query(
      'SELECT COALESCE(SUM(price), 0) as total FROM services WHERE user_id = ? AND status = ?',
      [userId, 'active']
    );
    const totalRevenue = parseFloat(revenueData[0].total);

    // Calculate total expenses
    const [expensesData] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND status = ?',
      [userId, 'active']
    );
    const totalExpenses = parseFloat(expensesData[0].total);

    // Get withdrawals by part type
    const [withdrawalsData] = await db.query(
      'SELECT part_type, COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? GROUP BY part_type',
      [userId]
    );

    const withdrawals = {
      part1: 0,
      part2: 0
    };

    withdrawalsData.forEach(w => {
      if (w.part_type === 'part1') withdrawals.part1 = parseFloat(w.total);
      if (w.part_type === 'part2') withdrawals.part2 = parseFloat(w.total);
    });

    // Get today's appointments
    const today = new Date().toISOString().split('T')[0];
    const [todaysAppointments] = await db.query(
      'SELECT * FROM appointments WHERE user_id = ? AND date = ? ORDER BY time ASC',
      [userId, today]
    );

    res.json({
      success: true,
      data: {
        activeServicesCount: activeServices.length,
        totalRevenue,
        totalExpenses,
        totalProfit: totalRevenue - totalExpenses,
        withdrawals,
        services: activeServices,
        todaysAppointments
      }
    });
  } catch (error) {
    next(error);
  }
};

const getServiceHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all services
    const [allServices] = await db.query(
      'SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Calculate total revenue from all services
    const [revenueData] = await db.query(
      'SELECT COALESCE(SUM(price), 0) as total FROM services WHERE user_id = ?',
      [userId]
    );
    const totalRevenue = parseFloat(revenueData[0].total);

    // Calculate total expenses
    const [expensesData] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?',
      [userId]
    );
    const totalExpenses = parseFloat(expensesData[0].total);

    // Get services count by status
    const [statusData] = await db.query(
      'SELECT status, COUNT(*) as count FROM services WHERE user_id = ? GROUP BY status',
      [userId]
    );

    const servicesByStatus = {};
    statusData.forEach(item => {
      servicesByStatus[item.status] = parseInt(item.count);
    });

    res.json({
      success: true,
      data: {
        totalServices: allServices.length,
        totalRevenue,
        totalExpenses,
        totalBalance: totalRevenue - totalExpenses,
        servicesByStatus,
        services: allServices
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getServiceHistory
};