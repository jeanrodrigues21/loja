const { supabase } = require('../config/database');

const getAllServices = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('services')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: services, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

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

    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: { service }
    });
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { description, vehicle, price } = req.body;

    const { data: newService, error } = await supabase
      .from('services')
      .insert([{
        description,
        vehicle,
        price: parseFloat(price),
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
      message: 'Service created successfully',
      data: { service: newService }
    });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, vehicle, price, status } = req.body;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (vehicle !== undefined) updateData.vehicle = vehicle;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (status !== undefined) updateData.status = status;

    const { data: updatedService, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service: updatedService }
    });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw new Error(error.message);
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
