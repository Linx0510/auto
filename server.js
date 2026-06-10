require('dotenv').config();

const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
fs.mkdirSync(config.paths.uploads, { recursive: true });
const db = require('./database/database');
const apiRoutes = require('./routes/api');
const { updateUserSession } = require('./middleware/auth');

const app = express();
const PORT = config.server.port;

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: config.server.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: isProduction,
    maxAge: config.server.sessionMaxAge
  }
}));

app.use(updateUserSession);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const normalized = String(filePath).replace(/\\/g, '/');
    const isUploads = normalized.includes('/public/uploads/');
    const longCacheExts = new Set([
      '.css', '.js', '.mjs', '.cjs',
      '.woff', '.woff2', '.ttf', '.otf', '.eot',
      '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico'
    ]);

    if (isUploads) {
      // Uploads can be replaced; avoid long caching to show updated photos.
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (longCacheExts.has(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else {
      // Avoid long-lived cache on HTML and other mutable assets.
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.use('/api', apiRoutes);
app.use('/api/ai', require('./routes/ai'));

const server = http.createServer(app);
const io = new Server(server);
app.set('io', io);

io.on('connection', (socket) => {
  if (socket.handshake.query.servicesPublic === '1') {
    socket.join('services:public');
  }
});

app.get('/', (req, res) => {
  res.render('index.html', { user: req.session.user });
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }

  res.render('login.html');
});

app.get('/reset-password', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  res.render('reset-password.html', { token });
});

app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }

  res.render('admin.html', { user: req.session.user });
});

app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.render('profile.html', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

db.initDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
  });



function buildCarModelDisplay({
  brandName,
  modelName,
  customBrand,
  customModel,
  brandIsOther,
  modelIsOther
}) {
  const brand = brandIsOther ? customBrand : brandName;
  const model = modelIsOther ? customModel : modelName;
  return [brand, model].filter(Boolean).join(' ').trim();
}

function validateRequestCarPayload({ brand, model, customBrand, customModel }) {
  if (!brand) {
    return { error: 'Укажите марку автомобиля' };
  }

  const trimmedCustomBrand = customBrand ? String(customBrand).trim() : '';
  const trimmedCustomModel = customModel ? String(customModel).trim() : '';

  // Проверка для марки "Другая"
  if (brand.is_other) {
    if (!trimmedCustomBrand) {
      return { error: 'Укажите марку автомобиля вручную' };
    }
    if (!trimmedCustomModel) {
      return { error: 'Укажите модель автомобиля вручную' };
    }
    if (trimmedCustomBrand.length > 100) {
      return { error: 'Название марки не должно превышать 100 символов' };
    }
    if (trimmedCustomModel.length > 100) {
      return { error: 'Название модели не должно превышать 100 символов' };
    }

    return {
      carBrandId: brand.id,
      carModelId: model ? model.id : null,
      customBrand: trimmedCustomBrand,
      customModel: trimmedCustomModel,
      carModelDisplay: buildCarModelDisplay({
        brandName: brand.name,
        modelName: model ? model.name : '',
        customBrand: trimmedCustomBrand,
        customModel: trimmedCustomModel,
        brandIsOther: true,
        modelIsOther: model ? model.is_other : true
      })
    };
  }

  // Проверка для обычной марки
  if (!model) {
    return { error: 'Укажите модель автомобиля' };
  }

  if (model.brand_id !== brand.id) {
    return { error: 'Модель не соответствует выбранной марке' };
  }

  // Проверка для модели "Другая"
  if (model.is_other) {
    if (!trimmedCustomModel) {
      return { error: 'Укажите модель автомобиля вручную' };
    }
    if (trimmedCustomModel.length > 100) {
      return { error: 'Название модели не должно превышать 100 символов' };
    }

    return {
      carBrandId: brand.id,
      carModelId: model.id,
      customBrand: null,
      customModel: trimmedCustomModel,
      carModelDisplay: buildCarModelDisplay({
        brandName: brand.name,
        modelName: model.name,
        customBrand: null,
        customModel: trimmedCustomModel,
        brandIsOther: false,
        modelIsOther: true
      })
    };
  }

  return {
    carBrandId: brand.id,
    carModelId: model.id,
    customBrand: null,
    customModel: null,
    carModelDisplay: buildCarModelDisplay({
      brandName: brand.name,
      modelName: model.name,
      customBrand: null,
      customModel: null,
      brandIsOther: false,
      modelIsOther: false
    })
  };
}

module.exports = { buildCarModelDisplay, validateRequestCarPayload };