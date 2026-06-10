const { query } = require('../database/database');

function listPublic(limit) {
  if (limit == null || limit === '') {
    return query('SELECT * FROM gallery ORDER BY uploaded_at DESC');
  }
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) {
    return query('SELECT * FROM gallery ORDER BY uploaded_at DESC');
  }
  return query('SELECT * FROM gallery ORDER BY uploaded_at DESC LIMIT $1', [Math.floor(n)]);
}

function listAllOrdered() {
  return query('SELECT * FROM gallery ORDER BY uploaded_at DESC');
}

function insert({ title, description, image_url, category }) {
  return query(
    `INSERT INTO gallery (title, description, image_url, category)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description ?? '', image_url, category ?? '']
  );
}

function updateById(id, { title, description, category, image_url }) {
  const sets = [];
  const params = [];
  let i = 1;

  if (title !== undefined) {
    sets.push(`title = $${i++}`);
    params.push(title);
  }
  if (description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(description);
  }
  if (category !== undefined) {
    sets.push(`category = $${i++}`);
    params.push(category);
  }
  if (image_url !== undefined) {
    sets.push(`image_url = $${i++}`);
    params.push(image_url);
  }

  if (sets.length === 0) {
    return query('SELECT * FROM gallery WHERE id = $1', [id]);
  }

  params.push(id);
  return query(`UPDATE gallery SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, params);
}

function findById(id) {
  return query('SELECT * FROM gallery WHERE id = $1', [id]);
}

function deleteById(id) {
  return query('DELETE FROM gallery WHERE id = $1 RETURNING image_url', [id]);
}

module.exports = {
  listPublic,
  listAllOrdered,
  insert,
  updateById,
  findById,
  deleteById
};
