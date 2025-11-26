const express = require('express');
const { allQuery, runQuery, getQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Listar apenas serviços ativos
router.get('/services', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const services = await allQuery(
      'SELECT * FROM services WHERE user_id = ? AND status = "active" ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      services
    });
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar serviços'
    });
  }
});

// Criar serviço
router.post('/services', requireAuth, async (req, res) => {
  try {
    const { description, vehicle, price } = req.body;
    const userId = req.session.user.id;

    if (!description || !vehicle || !price) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    const result = await runQuery(
      'INSERT INTO services (description, vehicle, price, status, user_id) VALUES (?, ?, ?, ?, ?)',
      [description, vehicle, parseFloat(price), 'active', userId]
    );

    const newService = await getQuery(
      'SELECT * FROM services WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Serviço criado com sucesso',
      service: newService
    });
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar serviço'
    });
  }
});

// Excluir serviço
router.delete('/services/:id', requireAuth, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.session.user.id;

    // Verificar se o serviço pertence ao usuário e está ativo
    const service = await getQuery(
      'SELECT * FROM services WHERE id = ? AND user_id = ? AND status = "active"',
      [serviceId, userId]
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Serviço não encontrado ou já foi fechado'
      });
    }

    await runQuery(
      'DELETE FROM services WHERE id = ? AND user_id = ?',
      [serviceId, userId]
    );

    res.json({
      success: true,
      message: 'Serviço excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir serviço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir serviço'
    });
  }
});

module.exports = router;