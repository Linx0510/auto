/**
 * Основной роутер `/api`. Важно: `require('./routes/api')` в Node загружает именно этот файл.
 * Файл `routes/api/index.js` при том же имени каталога не используется до явной смены импорта в server.js.
 */
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const bcrypt = require('bcrypt');
const config = require('../config');
const userRepository = require('../repositories/userRepository');
const galleryRepository = require('../repositories/galleryRepository');
const serviceRepository = require('../repositories/serviceRepository');
const { sendPasswordResetEmail } = require('../services/mailService');
const { query } = require('../database/database');
const { requireAdmin } = require('../middleware/auth');
const { galleryUploadSingle } = require('../middleware/uploadGallery');
const { mapGalleryRows } = require('../utils/galleryUrls');
const { resolveGalleryUploadFilePath } = require('../utils/safeGalleryFilePath');
const { galleryListPublic } = require('./handlers/galleryListPublic');
const { parseServicePayload } = require('../utils/servicePayload');
const carCatalogRepository = require('../repositories/carCatalogRepository');
const requestRepository = require('../repositories/requestRepository');
const { validateRequestCarPayload } = require('../services/requestCarValidation');

const ALLOWED_USER_ROLES = ['admin', 'client'];

function safeUnlinkGalleryFile(image_url) {
  const full = resolveGalleryUploadFilePath(image_url, config.paths.uploads);
  if (!full) {
    return;
  }
  fs.unlink(full, () => {});
}

const router = express.Router();

function emitServicesUpdated(req) {
  const io = req.app.get('io');
  if (io) {
    io.to('services:public').emit('services:updated', { at: Date.now() });
  }
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rowCount > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);
    const insertedUser = await query(
      `INSERT INTO users (email, password, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, phone, role`,
      [email, hashedPassword, full_name, phone || '', 'client']
    );

    const user = insertedUser.rows[0];
    req.session.user = user;

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    delete user.password;
    req.session.user = user;

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const result = await serviceRepository.listActive();
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/admin/services', requireAdmin, async (req, res) => {
  try {
    const result = await serviceRepository.listAllForAdmin();
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/admin/services', requireAdmin, async (req, res) => {
  try {
    const parsed = parseServicePayload(req.body, { partial: false });
    if (!parsed.ok) {
      return res.status(parsed.status).json({ error: parsed.error });
    }

    const result = await serviceRepository.insert(parsed.value);

    emitServicesUpdated(req);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/admin/services/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Некорректный идентификатор' });
  }

  try {
    const parsed = parseServicePayload(req.body, { partial: true });
    if (!parsed.ok) {
      return res.status(parsed.status).json({ error: parsed.error });
    }

    const patch = parsed.value;

    if (Object.keys(patch).length === 0) {
      const existing = await serviceRepository.findById(id);
      if (existing.rowCount === 0) {
        return res.status(404).json({ error: 'Услуга не найдена' });
      }
      return res.json(existing.rows[0]);
    }

    const result = await serviceRepository.updateById(id, patch);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }

    emitServicesUpdated(req);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/admin/services/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Некорректный идентификатор' });
  }

  try {
    const result = await serviceRepository.deactivateIfActive(id);
    if (result.rowCount > 0) {
      emitServicesUpdated(req);
      return res.json({ success: true, service: result.rows[0] });
    }

    const existing = await serviceRepository.findById(id);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }

    return res.json({ success: true, alreadyInactive: true, service: existing.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, u.full_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.is_approved = TRUE
       ORDER BY r.created_at DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/reviews', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const ratingRaw = req.body ? req.body.rating : undefined;
    const rating = Number(ratingRaw);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть целым числом от 1 до 5' });
    }

    const commentRaw = req.body ? req.body.comment : undefined;
    const comment =
      typeof commentRaw === 'string'
        ? commentRaw.trim()
        : '';
    if (comment.length > 2000) {
      return res.status(400).json({ error: 'Комментарий слишком длинный (максимум 2000 символов)' });
    }

    const userId = Number(req.session.user.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'Некорректная сессия пользователя' });
    }

    const completed = await query(
      `SELECT 1
       FROM requests
       WHERE user_id = $1
         AND status = 'completed'
       LIMIT 1`,
      [userId]
    );

    if (completed.rowCount === 0) {
      return res.status(400).json({ error: 'Оставить отзыв можно после завершённой заявки' });
    }

    const inserted = await query(
      `INSERT INTO reviews (user_id, rating, comment, is_approved)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, user_id, rating, comment, is_approved, created_at`,
      [userId, rating, comment || null]
    );

    res.status(201).json({ success: true, review: inserted.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const isApproved =
      statusRaw === 'approved'
        ? true
        : statusRaw === 'pending' || statusRaw === ''
          ? false
          : null;

    if (isApproved === null) {
      return res.status(400).json({ error: 'Некорректный статус (используйте pending или approved)' });
    }

    const result = await query(
      `SELECT r.id, r.user_id, u.full_name, r.rating, r.comment, r.is_approved, r.created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.is_approved = $1
       ORDER BY r.created_at DESC
       LIMIT 200`,
      [isApproved]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.patch('/admin/reviews/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Некорректный идентификатор' });
  }

  const isApproved =
    typeof req.body?.is_approved === 'boolean'
      ? req.body.is_approved
      : null;

  if (isApproved === null) {
    return res.status(400).json({ error: 'Поле is_approved обязательно (true/false)' });
  }

  try {
    const updated = await query(
      `UPDATE reviews
       SET is_approved = $1
       WHERE id = $2
       RETURNING id, user_id, rating, comment, is_approved, created_at`,
      [isApproved, id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    res.json({ success: true, review: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/gallery', galleryListPublic);

router.get('/admin/gallery', requireAdmin, async (req, res) => {
  try {
    const result = await galleryRepository.listAllOrdered();
    res.json(mapGalleryRows(result.rows));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/admin/gallery', requireAdmin, galleryUploadSingle, async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Название обязательно' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Файл изображения обязателен' });
  }

  const description = typeof req.body.description === 'string' ? req.body.description : '';
  const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
  const image_url = `/uploads/${req.file.filename}`;

  try {
    const result = await galleryRepository.insert({
      title,
      description,
      image_url,
      category
    });
    res.status(201).json(mapGalleryRows(result.rows)[0]);
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/admin/gallery/:id', requireAdmin, galleryUploadSingle, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Некорректный идентификатор' });
  }

  try {
    const existing = await galleryRepository.findById(id);
    if (existing.rowCount === 0) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const prev = existing.rows[0];
    const patch = {};

    if (req.body.title !== undefined) {
      const t = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!t) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Название не может быть пустым' });
      }
      patch.title = t;
    }
    if (req.body.description !== undefined) {
      patch.description = typeof req.body.description === 'string' ? req.body.description : '';
    }
    if (req.body.category !== undefined) {
      patch.category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
    }

    let oldUrlForUnlink = null;
    if (req.file) {
      patch.image_url = `/uploads/${req.file.filename}`;
      oldUrlForUnlink = prev.image_url;
    }

    if (Object.keys(patch).length === 0) {
      return res.json(mapGalleryRows([prev])[0]);
    }

    const result = await galleryRepository.updateById(id, patch);
    if (result.rowCount === 0) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    if (oldUrlForUnlink) {
      safeUnlinkGalleryFile(oldUrlForUnlink);
    }

    res.json(mapGalleryRows(result.rows)[0]);
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/admin/gallery/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Некорректный идентификатор' });
  }

  try {
    const result = await galleryRepository.deleteById(id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    safeUnlinkGalleryFile(result.rows[0].image_url);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/car-brands', async (req, res) => {
  try {
    const brands = await carCatalogRepository.listBrandsWithModels();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/requests', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const {
      service_id,
      car_brand_id,
      car_model_id,
      custom_brand,
      custom_model,
      car_year,
      car_number,
      problem_description,
      appointment_date
    } = req.body;
    const user_id = req.session.user.id;

    if (!service_id) {
      return res.status(400).json({ error: 'Необходимо заполнить обязательные поля' });
    }

    const brandId = Number(car_brand_id);
    if (!Number.isInteger(brandId) || brandId < 1) {
      return res.status(400).json({ error: 'Укажите марку автомобиля' });
    }

    const brand = await carCatalogRepository.getBrandById(brandId);
    if (!brand) {
      return res.status(400).json({ error: 'Марка автомобиля не найдена' });
    }

    let model = null;
    if (car_model_id != null && car_model_id !== '') {
      const modelId = Number(car_model_id);
      if (!Number.isInteger(modelId) || modelId < 1) {
        return res.status(400).json({ error: 'Некорректная модель автомобиля' });
      }
      model = await carCatalogRepository.getModelById(modelId);
      if (!model) {
        return res.status(400).json({ error: 'Модель автомобиля не найдена' });
      }
    }

    const carValidation = validateRequestCarPayload({
      brand,
      model,
      customBrand: custom_brand,
      customModel: custom_model
    });

    if (carValidation.error) {
      return res.status(400).json({ error: carValidation.error });
    }

    const result = await requestRepository.insertRequest({
      user_id,
      service_id,
      car_model: carValidation.carModelDisplay,
      car_brand_id: carValidation.carBrandId,
      car_model_id: carValidation.carModelId,
      custom_brand: carValidation.customBrand,
      custom_model: carValidation.customModel,
      car_year: car_year || null,
      car_number: car_number || '',
      problem_description: problem_description || '',
      appointment_date: appointment_date || null,
      status: 'pending'
    });

    res.json({ success: true, requestId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

router.get('/my-requests', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const result = await requestRepository.listByUserId(req.session.user.id);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

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

    await query(
      `UPDATE requests
       SET status = $1,
           completed_at = CASE
             WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP
             ELSE completed_at
           END
       WHERE id = $2`,
      [status, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении заявки' });
  }
});

router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await userRepository.listAllForAdmin();
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.patch('/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
    }

    if (!ALLOWED_USER_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

    const existing = await userRepository.findById(id);

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const current = existing.rows[0];

    if (current.role === 'admin' && role === 'client') {
      const admins = await userRepository.countAdmins();

      if (admins.rows[0].n <= 1) {
        return res.status(400).json({ error: 'Нельзя снять последнего администратора' });
      }
    }

    await userRepository.updateRoleById(id, role);

    if (req.session.user && Number(req.session.user.id) === id) {
      const sessionRow = await userRepository.selectSessionFieldsById(id);

      if (sessionRow.rowCount > 0) {
        req.session.user = sessionRow.rows[0];
      }
    }

    const updated = await userRepository.selectSessionFieldsById(id);
    res.json({ success: true, user: updated.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const respondOk = () => res.json({ success: true });

  try {
    const emailRaw = req.body.email;
    const email =
      typeof emailRaw === 'string'
        ? emailRaw.trim().toLowerCase()
        : '';

    if (!email) {
      return respondOk();
    }

    const result = await userRepository.findByEmailNormalized(email);

    if (result.rowCount === 0) {
      return respondOk();
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + config.passwordReset.tokenTtlHours * 60 * 60 * 1000
    );

    await userRepository.setPasswordResetToken(user.id, token, expiresAt.toISOString());

    const base = config.passwordReset.publicBaseUrl.replace(/\/$/, '');
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({ to: user.email, resetUrl });

    return respondOk();
  } catch (error) {
    console.error('forgot-password:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string' || !password) {
      return res.status(400).json({ error: 'Токен и пароль обязательны' });
    }

    if (password.length < config.security.passwordMinLength) {
      return res.status(400).json({
        error: `Пароль должен быть не короче ${config.security.passwordMinLength} символов`
      });
    }

    const trimmedToken = token.trim();
    const found = await userRepository.findByValidResetToken(trimmedToken);

    if (found.rowCount === 0) {
      return res.status(400).json({ error: 'Ссылка недействительна или истекла' });
    }

    const userId = found.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    await userRepository.updatePasswordAndClearReset(userId, hashedPassword);

    res.json({ success: true });
  } catch (error) {
    console.error('reset-password:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [total, pending, completed, users, revenue] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM requests'),
      query(`SELECT COUNT(*)::int AS pending FROM requests WHERE status = 'pending'`),
      query(`SELECT COUNT(*)::int AS completed FROM requests WHERE status = 'completed'`),
      query(`SELECT COUNT(*)::int AS users FROM users WHERE role = 'client'`),
      query(
        `SELECT COALESCE(SUM(s.price), 0) AS revenue
         FROM requests r
         JOIN services s ON r.service_id = s.id
         WHERE r.status = 'completed'`
      )
    ]);

    res.json({
      total: total.rows[0].total,
      pending: pending.rows[0].pending,
      completed: completed.rows[0].completed,
      users: users.rows[0].users,
      revenue: Number(revenue.rows[0].revenue)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/user-info', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  res.json(req.session.user);
});

module.exports = router;
