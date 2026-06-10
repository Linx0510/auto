const express = require('express');
const { requireAdmin } = require('../../middleware/auth');
const requestRepository = require('../../repositories/requestRepository');
const statsRepository = require('../../repositories/statsRepository');

const router = express.Router();

router.get('/admin/requests', requireAdmin, async (req, res) => {
  try {
    const { status, start_date, end_date, car_brand_id, sort_by, sort_order } = req.query;
    const result = await requestRepository.listForAdmin({
      status,
      start_date,
      end_date,
      car_brand_id,
      sort_by,
      sort_order
    });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/admin/requests/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Статус обязателен' });
    }

    await requestRepository.updateStatus(id, status);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении заявки' });
  }
});

router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await statsRepository.fetchAdminStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
