const express = require('express');
const bcrypt = require('bcrypt');
const config = require('../../config');
const userRepository = require('../../repositories/userRepository');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const existingUser = await userRepository.findIdByEmail(email);

    if (existingUser.rowCount > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);
    const insertedUser = await userRepository.insertClientUser({
      email,
      passwordHash: hashedPassword,
      full_name,
      phone: phone || ''
    });

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

    const result = await userRepository.findByEmail(email);
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

router.get('/user-info', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  res.json(req.session.user);
});

module.exports = router;
