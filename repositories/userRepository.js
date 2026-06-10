const { query, pool } = require('../database/database');

function findByEmail(email) {
  return query('SELECT * FROM users WHERE email = $1', [email]);
}

function findByEmailNormalized(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  return query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [normalized]);
}

function findIdByEmail(email) {
  return query('SELECT id FROM users WHERE email = $1', [email]);
}

function insertClientUser({ email, passwordHash, full_name, phone }) {
  return query(
    `INSERT INTO users (email, password, full_name, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, phone, role`,
    [email, passwordHash, full_name, phone ?? '', 'client']
  );
}

function selectSessionFieldsById(id) {
  return query('SELECT id, email, full_name, phone, role FROM users WHERE id = $1', [id]);
}

function listAllForAdmin() {
  return query(
    `SELECT id, email, full_name, phone, role, created_at
     FROM users
     ORDER BY id`
  );
}

function findById(id) {
  return query(
    `SELECT id, email, full_name, phone, role, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
}

function updateRoleById(id, role) {
  return query(
    `UPDATE users SET role = $1 WHERE id = $2
     RETURNING id, email, full_name, phone, role`,
    [role, id]
  );
}

function countAdmins() {
  return query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`);
}

function setPasswordResetToken(userId, token, expiresAt) {
  return query(
    `UPDATE users
     SET password_reset_token = $2, password_reset_expires = $3
     WHERE id = $1`,
    [userId, token, expiresAt]
  );
}

function findByValidResetToken(token) {
  return query(
    `SELECT id, email, full_name, phone, role
     FROM users
     WHERE password_reset_token = $1
       AND password_reset_expires IS NOT NULL
       AND password_reset_expires > NOW()`,
    [token]
  );
}

async function updatePasswordAndClearReset(userId, passwordHash) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users
       SET password = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL
       WHERE id = $2`,
      [passwordHash, userId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findByEmail,
  findByEmailNormalized,
  findIdByEmail,
  insertClientUser,
  selectSessionFieldsById,
  listAllForAdmin,
  findById,
  updateRoleById,
  countAdmins,
  setPasswordResetToken,
  findByValidResetToken,
  updatePasswordAndClearReset
};
