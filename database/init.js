require('dotenv').config();

const { initDatabase, pool } = require('./database');

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('PostgreSQL initialization completed');
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('PostgreSQL initialization failed:', error);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { initDatabase, pool };
