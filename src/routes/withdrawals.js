const express = require('express');
const { allQuery, runQuery, getQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Listar retiradas
router.get('/withdrawals', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const withdrawals = await allQuery(
      'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      withdrawals
    });
  } catch (error) {
    console.error('Erro ao buscar retiradas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar retiradas'
    });
  }
});

// Criar retirada
router.post('/withdrawals', requireAuth, async (req, res) => {
  try {
    const { amount, part_type, description } = req.body;
    const userId = req.session.user.id;

    if (!amount || !part_type) {
      return res.status(400).json({
        success: false,
        message: 'Valor e tipo da parte são obrigatórios'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor deve ser maior que zero'
      });
    }

    const result = await runQuery(
      'INSERT INTO withdrawals (amount, part_type, description, user_id) VALUES (?, ?, ?, ?)',
      [parseFloat(amount), part_type, description || '', userId]
    );

    const newWithdrawal = await getQuery(
      'SELECT * FROM withdrawals WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Retirada registrada com sucesso',
      withdrawal: newWithdrawal
    });
  } catch (error) {
    console.error('Erro ao criar retirada:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar retirada'
    });
  }
});

// Excluir retirada
router.delete('/withdrawals/:id', requireAuth, async (req, res) => {
  try {
    const withdrawalId = req.params.id;
    const userId = req.session.user.id;

    // Verificar se a retirada pertence ao usuário
    const withdrawal = await getQuery(
      'SELECT * FROM withdrawals WHERE id = ? AND user_id = ?',
      [withdrawalId, userId]
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Retirada não encontrada'
      });
    }

    await runQuery(
      'DELETE FROM withdrawals WHERE id = ? AND user_id = ?',
      [withdrawalId, userId]
    );

    res.json({
      success: true,
      message: 'Retirada excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir retirada:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir retirada'
    });
  }
});

module.exports = router;