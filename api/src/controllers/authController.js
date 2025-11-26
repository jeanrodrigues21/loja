const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');
const { generateToken } = require('../config/jwt');

const register = async (req, res, next) => {
  try {
    const { username, password, name, email } = req.body;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        username,
        password: hashedPassword,
        name,
        email: email || null,
        role: 'user'
      }])
      .select('id, username, name, email, role')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const token = generateToken({ userId: newUser.id, role: newUser.role });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const token = generateToken({ userId: user.id, role: user.role });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, email, role, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const updateData = { name, email };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, username, name, email, role')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
