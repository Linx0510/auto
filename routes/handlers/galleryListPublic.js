const galleryRepository = require('../../repositories/galleryRepository');
const { mapGalleryRows } = require('../../utils/galleryUrls');

/**
 * GET /gallery — публичный список (опционально ?limit=N).
 * Общий обработчик для routes/api.js и routes/api/gallery.js до перехода на единый mount routes/api/index.js.
 */
async function galleryListPublic(req, res) {
  try {
    const rawLimit = req.query.limit;
    let limit = null;
    if (rawLimit !== undefined && rawLimit !== '') {
      const n = Number(rawLimit);
      if (Number.isFinite(n) && n > 0) {
        limit = Math.floor(n);
      }
    }
    const result = await galleryRepository.listPublic(limit);
    res.json(mapGalleryRows(result.rows));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

module.exports = {
  galleryListPublic
};
