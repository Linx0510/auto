const { query } = require('../database/database');

const PUBLIC_COLUMNS =
  'id, name, description, price, duration, category';

function listActive() {
  return query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM services
     WHERE is_active = TRUE
     ORDER BY id`
  );
}

function listAllForAdmin() {
  return query('SELECT * FROM services ORDER BY id');
}

function findById(id) {
  return query('SELECT * FROM services WHERE id = $1', [id]);
}

function insert({ name, description, price, duration, category, is_active = true }) {
  return query(
    `INSERT INTO services (name, description, price, duration, category, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, description ?? '', price, duration ?? null, category ?? null, is_active]
  );
}

function updateById(id, patch) {
  const allowed = ['name', 'description', 'price', 'duration', 'category', 'is_active'];
  const entries = Object.entries(patch).filter(
    ([k, v]) => allowed.includes(k) && v !== undefined
  );

  if (entries.length === 0) {
    return query('SELECT * FROM services WHERE id = $1', [id]);
  }

  const sets = [];
  const values = [];
  let i = 1;

  for (const [key, val] of entries) {
    sets.push(`${key} = $${i}`);
    values.push(val);
    i += 1;
  }

  values.push(id);

  return query(
    `UPDATE services SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
}

function deactivateIfActive(id) {
  return query(
    `UPDATE services SET is_active = FALSE
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );
}

module.exports = {
  listActive,
  listAllForAdmin,
  findById,
  insert,
  updateById,
  deactivateIfActive
};
