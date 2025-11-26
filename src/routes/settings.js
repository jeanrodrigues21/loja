const express = require('express');
const bcrypt = require('bcryptjs');
const { getQuery, runQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Atualizar configurações do usuário
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.session.user.id;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios'
      });
    }

    let updateQuery = 'UPDATE users SET name = ?, email = ?';
    let params = [name, email];

    // Se uma nova senha foi fornecida, incluir na atualização
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      params.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    await runQuery(updateQuery, params);

    // Buscar dados atualizados do usuário
    const updatedUser = await getQuery(
      'SELECT id, username, name, email FROM users WHERE id = ?',
      [userId]
    );

    // Atualizar sessão
    req.session.user = updatedUser;

    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configurações'
    });
  }
});

module.exports = router;