// Middleware para verificar autenticação
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado'
    });
  }
  next();
}

// Middleware para adicionar informações do usuário à requisição
function addUserInfo(req, res, next) {
  if (req.session.user) {
    req.user = req.session.user;
  }
  next();
}

module.exports = {
  requireAuth,
  addUserInfo
};