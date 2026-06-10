const express = require('express');
const reviewRepository = require('../../repositories/reviewRepository');

const router = express.Router();

router.get('/reviews', async (req, res) => {
  try {
    const result = await reviewRepository.listApprovedRecent(10);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
