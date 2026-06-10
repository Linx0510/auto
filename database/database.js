const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const config = require('../config');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to the .env file before starting the app.');
}

const pool = new Pool({
  connectionString
});

function getDatabaseConfig() {
  const url = new URL(connectionString);
  const databaseName = url.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  return { url, databaseName };
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const { url, databaseName } = getDatabaseConfig();
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';

  const adminPool = new Pool({
    connectionString: adminUrl.toString()
  });

  try {
    const checkResult = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (checkResult.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await adminPool.end();
  }
}

async function seedAdmin(client) {
  const adminEmail = 'admin@autoservice.ru';
  const existingAdmin = await client.query(
    'SELECT id FROM users WHERE email = $1',
    [adminEmail]
  );

  if (existingAdmin.rowCount > 0) {
    return;
  }

  const hashedPassword = await bcrypt.hash('Admin123!', config.security.bcryptRounds);

  await client.query(
    `INSERT INTO users (email, password, full_name, phone, role)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminEmail, hashedPassword, 'Администратор сервиса', '+7 (999) 123-45-67', 'admin']
  );
}

async function seedServices(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM services');

  if (rows[0].count > 0) {
    return;
  }

  const services = [
    ['Компьютерная диагностика', 'Полная проверка систем автомобиля и выявление неисправностей', 2500, 60, 'diagnostics'],
    ['Замена масла', 'Замена моторного масла и масляного фильтра', 1500, 30, 'maintenance'],
    ['Ремонт тормозной системы', 'Диагностика и ремонт тормозной системы', 4000, 120, 'repair'],
    ['Шиномонтаж', 'Сезонная замена шин и балансировка', 2000, 45, 'tires'],
    ['Комплексная диагностика', 'Проверка автомобиля с полным компьютерным обследованием', 3000, 90, 'diagnostics'],
    ['Ремонт электрики', 'Поиск и ремонт неисправностей проводки', 1800, 30, 'electrical'],
    ['Ремонт двигателя', 'Диагностика и ремонт деталей двигателя', 5500, 180, 'repair'],
    ['Мойка и химчистка', 'Комплексная мойка и чистка салона', 3500, 120, 'cleaning']
  ];

  for (const service of services) {
    await client.query(
      `INSERT INTO services (name, description, price, duration, category)
       VALUES ($1, $2, $3, $4, $5)`,
      service
    );
  }
}

async function seedGallery(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM gallery');

  if (rows[0].count > 0) {
    return;
  }

  const galleryItems = [
    ['Компьютерная диагностика', 'Процесс проверки на диагностическом оборудовании', 'diagnostic.jpg', 'work'],
    ['Наш сервис', 'Рабочая зона и современное оборудование', 'service.jpg', 'premises'],
    ['Команда специалистов', 'Опытные мастера на рабочем месте', 'team.jpg', 'team'],
    ['Оригинальные запчасти', 'Используем только проверенные комплектующие', 'parts.jpg', 'parts'],
    ['Выполненные работы', 'Примеры успешно завершённых ремонтов', 'completed.jpg', 'completed'],
    ['Зона детейлинга', 'Профессиональная мойка и уход за автомобилем', 'washing.jpg', 'cleaning']
  ];

  for (const item of galleryItems) {
    await client.query(
      `INSERT INTO gallery (title, description, image_url, category)
       VALUES ($1, $2, $3, $4)`,
      item
    );
  }
}

async function repairCorruptedSeedData(client) {
  const services = [
    ['Компьютерная диагностика', 'Полная проверка систем автомобиля и выявление неисправностей', 2500, 60, 'diagnostics'],
    ['Замена масла', 'Замена моторного масла и масляного фильтра', 1500, 30, 'maintenance'],
    ['Ремонт тормозной системы', 'Диагностика и ремонт тормозной системы', 4000, 120, 'repair'],
    ['Шиномонтаж', 'Сезонная замена шин и балансировка', 2000, 45, 'tires'],
    ['Комплексная диагностика', 'Проверка автомобиля с полным компьютерным обследованием', 3000, 90, 'diagnostics'],
    ['Ремонт электрики', 'Поиск и ремонт неисправностей проводки', 1800, 30, 'electrical'],
    ['Ремонт двигателя', 'Диагностика и ремонт деталей двигателя', 5500, 180, 'repair'],
    ['Мойка и химчистка', 'Комплексная мойка и чистка салона', 3500, 120, 'cleaning']
  ];

  for (let i = 0; i < services.length; i += 1) {
    const [name, description, price, duration, category] = services[i];
    await client.query(
      `UPDATE services
       SET name = $1, description = $2, price = $3, duration = $4, category = $5
       WHERE id = $6
         AND (POSITION('�' IN name) > 0 OR POSITION('�' IN description) > 0)`,
      [name, description, price, duration, category, i + 1]
    );
  }

  const galleryItems = [
    ['Компьютерная диагностика', 'Процесс проверки на диагностическом оборудовании', 'diagnostic.jpg', 'work'],
    ['Наш сервис', 'Рабочая зона и современное оборудование', 'service.jpg', 'premises'],
    ['Команда специалистов', 'Опытные мастера на рабочем месте', 'team.jpg', 'team'],
    ['Оригинальные запчасти', 'Используем только проверенные комплектующие', 'parts.jpg', 'parts'],
    ['Выполненные работы', 'Примеры успешно завершённых ремонтов', 'completed.jpg', 'completed'],
    ['Зона детейлинга', 'Профессиональная мойка и уход за автомобилем', 'washing.jpg', 'cleaning']
  ];

  for (let i = 0; i < galleryItems.length; i += 1) {
    const [title, description, imageUrl, category] = galleryItems[i];
    await client.query(
      `UPDATE gallery
       SET title = $1, description = $2, image_url = $3, category = $4
       WHERE id = $5
         AND (POSITION('�' IN title) > 0 OR POSITION('�' IN description) > 0)`,
      [title, description, imageUrl, category, i + 1]
    );
  }

  await client.query(
    `UPDATE users
     SET full_name = $1
     WHERE email = $2
       AND POSITION('�' IN full_name) > 0`,
    ['Администратор сервиса', 'admin@autoservice.ru']
  );
}

async function applyMigrations() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((filename) => filename.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [filename]);

      if (applied.rowCount > 0) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');

      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [filename]);
        await client.query('COMMIT');
      } catch (migrationError) {
        await client.query('ROLLBACK');
        throw migrationError;
      }
    }
  } finally {
    client.release();
  }
}

async function initDatabase() {
  await ensureDatabaseExists();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'client',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        duration INTEGER,
        category TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        service_id INTEGER NOT NULL REFERENCES services(id),
        car_model TEXT NOT NULL,
        car_year INTEGER,
        car_number TEXT,
        problem_description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        appointment_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        request_id INTEGER REFERENCES requests(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        category TEXT,
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await seedAdmin(client);
    await seedServices(client);
    await seedGallery(client);
    await repairCorruptedSeedData(client);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  await applyMigrations();
}

async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
  initDatabase
};
