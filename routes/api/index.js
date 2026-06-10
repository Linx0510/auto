/**
 * Составной роутер `/api` (модули подключаются здесь).
 * Сейчас server.js монтирует `routes/api.js`, а не этот файл — см. комментарий в routes/api.js.
 * Маршруты GET/POST/PUT/DELETE услуг реализованы в `routes/api.js` (админка и публичный каталог).
 * После перевода точки входа на этот модуль поведение должно совпасть с монолитным api.js (Фаза B).
 */
const express = require('express');

const router = express.Router();

router.use(require('./auth'));
router.use(require('./reviews'));
router.use(require('./gallery'));
router.use(require('./requests'));
router.use(require('./admin'));

module.exports = router;
