const express = require('express');
const bcrypt = require('bcryptjs');
const { allQuery, runQuery, getQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Middleware para verificar se é admin
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores.'
    });
  }
  next();
}

// Dashboard administrativo
router.get('/admin/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Estatísticas gerais
    const totalUsers = await allQuery('SELECT COUNT(*) as count FROM users WHERE role != "admin"');
    const totalServices = await allQuery('SELECT COUNT(*) as count FROM services');
    const totalExpenses = await allQuery('SELECT COUNT(*) as count FROM expenses');
    
    // Usuários recentes
    const recentUsers = await allQuery(
      'SELECT id, username, name, email, created_at FROM users WHERE role != "admin" ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers[0].count,
        totalServices: totalServices[0].count,
        totalExpenses: totalExpenses[0].count
      },
      recentUsers
    });
  } catch (error) {
    console.error('Erro no dashboard admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar dashboard administrativo'
    });
  }
});

// Listar usuários
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await allQuery(
      'SELECT id, username, name, email, role, created_at FROM users WHERE role != "admin" ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários'
    });
  }
});

// Criar usuário
router.post('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, senha e nome são obrigatórios'
      });
    }

    // Verificar se username já existe
    const existingUser = await getQuery('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username já existe'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await runQuery(
      'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, name, email || '', 'user']
    );

    const newUser = await getQuery(
      'SELECT id, username, name, email, role, created_at FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: newUser
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário'
    });
  }
});

// Excluir usuário
router.delete('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Verificar se o usuário existe e não é admin
    const user = await getQuery('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir administradores'
      });
    }

    await runQuery('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir usuário'
    });
  }
});

// Obter configurações do sistema
router.get('/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await allQuery('SELECT setting_key, setting_value FROM system_settings');
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });

    res.json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter configurações'
    });
  }
});

// Atualizar configurações do sistema
router.put('/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { part1_name, part2_name } = req.body;

    if (!part1_name || !part2_name) {
      return res.status(400).json({
        success: false,
        message: 'Nomes das partes são obrigatórios'
      });
    }

    await runQuery(
      'UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
      [part1_name, 'part1_name']
    );

    await runQuery(
      'UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
      [part2_name, 'part2_name']
    );

    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso'
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