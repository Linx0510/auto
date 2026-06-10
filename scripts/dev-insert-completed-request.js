require('dotenv').config();

const { query } = require('../database/database');

async function main() {
  const userId = Number(process.argv[2]);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new Error('Usage: node scripts/dev-insert-completed-request.js <userId>');
  }

  const svc = await query('SELECT id FROM services ORDER BY id ASC LIMIT 1');
  if (svc.rowCount === 0) {
    throw new Error('No services found to attach request');
  }
  const serviceId = svc.rows[0].id;

  const sql = `
    INSERT INTO requests (
      user_id, service_id, car_model, car_year, car_number,
      problem_description, status, created_at, completed_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `;

  const ins = await query(sql, [
    userId,
    serviceId,
    'Toyota Camry',
    2018,
    'A123AA',
    'dev completed seed'
  ]);

  console.log(`request_id=${ins.rows[0].id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

