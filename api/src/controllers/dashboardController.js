const { supabase } = require('../config/database');

const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: activeServices, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (servicesError) {
      throw new Error(servicesError.message);
    }

    const { data: revenueData } = await supabase
      .from('services')
      .select('price')
      .eq('user_id', userId)
      .eq('status', 'active');

    const totalRevenue = revenueData?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'active');

    const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    const { data: withdrawalsData } = await supabase
      .from('withdrawals')
      .select('amount, part_type')
      .eq('user_id', userId);

    const withdrawals = {
      part1: 0,
      part2: 0
    };

    withdrawalsData?.forEach(w => {
      if (w.part_type === 'part1') withdrawals.part1 += w.amount || 0;
      if (w.part_type === 'part2') withdrawals.part2 += w.amount || 0;
    });

    const today = new Date().toISOString().split('T')[0];
    const { data: todaysAppointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('time', { ascending: true });

    res.json({
      success: true,
      data: {
        activeServicesCount: activeServices?.length || 0,
        totalRevenue,
        totalExpenses,
        totalProfit: totalRevenue - totalExpenses,
        withdrawals,
        services: activeServices || [],
        todaysAppointments: todaysAppointments || []
      }
    });
  } catch (error) {
    next(error);
  }
};

const getServiceHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: allServices, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (servicesError) {
      throw new Error(servicesError.message);
    }

    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId);

    const totalRevenue = allServices?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;
    const totalExpenses = allExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    const servicesByStatus = {};
    allServices?.forEach(service => {
      const status = service.status || 'unknown';
      servicesByStatus[status] = (servicesByStatus[status] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalServices: allServices?.length || 0,
        totalRevenue,
        totalExpenses,
        totalBalance: totalRevenue - totalExpenses,
        servicesByStatus,
        services: allServices || []
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
