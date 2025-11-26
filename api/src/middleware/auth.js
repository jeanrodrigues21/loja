const { verifyToken } = require('../config/jwt');
const { supabase } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is missing or invalid'
      });
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, email, role')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or invalid token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      const { data: user } = await supabase
        .from('users')
        .select('id, username, name, email, role')
        .eq('id', decoded.userId)
        .maybeSingle();

      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth
};
