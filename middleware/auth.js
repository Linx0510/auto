const userRepository = require('../repositories/userRepository');

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
  }

  next();
};

const requireClient = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  if (req.session.user.role !== 'client') {
    return res.status(403).json({ error: 'Доступ только для клиентов' });
  }

  next();
};

const updateUserSession = async (req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  try {
    const result = await userRepository.selectSessionFieldsById(req.session.user.id);

    if (result.rowCount > 0) {
      req.session.user = result.rows[0];
    } else {
      delete req.session.user;
    }
  } catch (error) {
    console.error('Ошибка обновления сессии:', error);
  }

  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireClient,
  updateUserSession
};
