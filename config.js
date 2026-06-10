const path = require('path');

const config = {
  server: {
    port: process.env.PORT || 3004,
    host: process.env.HOST || 'localhost',
    sessionSecret: process.env.SESSION_SECRET || 'automobilservice-secret-key',
    sessionMaxAge: 24 * 60 * 60 * 1000
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres-admin:postgres-admin@localhost:5432/automobilservice',
    verbose: process.env.NODE_ENV !== 'production'
  },

  security: {
    bcryptRounds: 10,
    passwordMinLength: 6
  },

  app: {
    name: 'Автосервис',
    description: 'Сайт для автосервисного центра',
    version: '1.0.0',
    contactEmail: 'info@automobilservice.ru',
    contactPhone: '+7 (495) 123-45-67',
    address: 'г. Москва, ул. Автосервисная, д. 15',
    workingHours: {
      weekdays: '8:00 - 20:00',
      weekends: '9:00 - 18:00'
    }
  },

  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    uploadDir: path.join(__dirname, 'public', 'uploads')
  },

  demoData: {
    admin: {
      email: 'admin@autoservice.ru',
      password: 'Admin123!',
      name: 'Администратор сервиса',
      phone: '+7 (999) 123-45-67'
    }
  },

  paths: {
    public: path.join(__dirname, 'public'),
    views: path.join(__dirname, 'views'),
    uploads: path.join(__dirname, 'public', 'uploads')
  },

  passwordReset: {
    tokenTtlHours: Number(process.env.PASSWORD_RESET_TTL_HOURS) || 24,
    publicBaseUrl:
      process.env.PUBLIC_BASE_URL ||
      'https://automobilservice-okei.ru'
  },

  mail: {
    enabled: process.env.SMTP_ENABLED === 'true',
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || ''
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash:free',
    fallbackModels: [
      'openrouter/free',
      'qwen/qwen3-30b-a3b:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free'
    ],
    maxMessageLength: 1000,
    maxHistoryMessages: 20,
    maxHistoryChars: Number(process.env.OPENROUTER_MAX_HISTORY_CHARS) || 8000,
    maxServicesContextChars:
      Number(process.env.OPENROUTER_MAX_SERVICES_CONTEXT_CHARS) || 8000,
    maxTokens: Number(process.env.OPENROUTER_MAX_TOKENS) || 1200,
    temperature: Number(process.env.OPENROUTER_TEMPERATURE) || 0.7,
    timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS) || 25_000,
    siteUrl: process.env.PUBLIC_BASE_URL || 'https://automobilservice-okei.ru',
    siteName: 'АвтоМобилСервис'
  }
};

module.exports = config;
