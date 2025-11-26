const express = require('express');
const { allQuery, runQuery, getQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Listar agendamentos
router.get('/appointments', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const appointments = await allQuery(
      'SELECT * FROM appointments WHERE user_id = ? ORDER BY date DESC, time DESC',
      [userId]
    );

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar agendamentos'
    });
  }
});

// Criar agendamento
router.post('/appointments', requireAuth, async (req, res) => {
  try {
    const { date, time, client, service } = req.body;
    const userId = req.session.user.id;

    if (!date || !time || !client || !service) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    const result = await runQuery(
      'INSERT INTO appointments (date, time, client, service, user_id) VALUES (?, ?, ?, ?, ?)',
      [date, time, client, service, userId]
    );

    const newAppointment = await getQuery(
      'SELECT * FROM appointments WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso',
      appointment: newAppointment
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar agendamento'
    });
  }
});

// Excluir agendamento
router.delete('/appointments/:id', requireAuth, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.session.user.id;

    // Verificar se o agendamento pertence ao usuário
    const appointment = await getQuery(
      'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
      [appointmentId, userId]
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    await runQuery(
      'DELETE FROM appointments WHERE id = ? AND user_id = ?',
      [appointmentId, userId]
    );

    res.json({
      success: true,
      message: 'Agendamento excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir agendamento'
    });
  }
});

module.exports = router;