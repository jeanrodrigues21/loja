const { supabase } = require('../config/database');

const getAllExpenses = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: expenses, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

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

    const { data: newExpense, error } = await supabase
      .from('expenses')
      .insert([{
        description,
        amount: parseFloat(amount),
        date,
        status: 'active',
        user_id: req.user.id
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: { expense: newExpense }
    });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw new Error(error.message);
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
