const { query } = require('../database/database');

const REQUEST_SELECT_FIELDS = `
  r.*,
  s.name AS service_name,
  s.price,
  cb.name AS brand_name,
  cm.name AS model_name
`;

const REQUEST_JOINS = `
  JOIN services s ON r.service_id = s.id
  LEFT JOIN car_brands cb ON r.car_brand_id = cb.id
  LEFT JOIN car_models cm ON r.car_model_id = cm.id
`;

function insertRequest({
  user_id,
  service_id,
  car_model,
  car_brand_id,
  car_model_id,
  custom_brand,
  custom_model,
  car_year,
  car_number,
  problem_description,
  appointment_date,
  status
}) {
  return query(
    `INSERT INTO requests (
       user_id,
       service_id,
       car_model,
       car_brand_id,
       car_model_id,
       custom_brand,
       custom_model,
       car_year,
       car_number,
       problem_description,
       appointment_date,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      user_id,
      service_id,
      car_model,
      car_brand_id || null,
      car_model_id || null,
      custom_brand || null,
      custom_model || null,
      car_year,
      car_number,
      problem_description,
      appointment_date,
      status
    ]
  );
}

function listByUserId(userId) {
  return query(
    `SELECT ${REQUEST_SELECT_FIELDS}
     FROM requests r
     ${REQUEST_JOINS}
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
}

function listForAdmin({ status, start_date, end_date, car_brand_id, sort_by, sort_order }) {
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }

  if (start_date && end_date) {
    params.push(start_date, end_date);
    conditions.push(`DATE(r.created_at) BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  if (car_brand_id) {
    params.push(Number(car_brand_id));
    conditions.push(`r.car_brand_id = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortByBrand = sort_by === 'brand';
  const orderAsc = sort_order === 'asc';
  const brandSortDir = orderAsc ? 'ASC' : 'DESC';
  const dateSortDir = orderAsc ? 'ASC' : 'DESC';

  let orderClause;
  if (sortByBrand) {
    orderClause = `ORDER BY COALESCE(cb.name, r.custom_brand, r.car_model) ${brandSortDir} NULLS LAST, r.created_at DESC`;
  } else {
    orderClause = `ORDER BY r.created_at ${dateSortDir}`;
  }

  return query(
    `SELECT ${REQUEST_SELECT_FIELDS},
            u.full_name,
            u.phone,
            u.email
     FROM requests r
     JOIN users u ON r.user_id = u.id
     ${REQUEST_JOINS}
     ${whereClause}
     ${orderClause}`,
    params
  );
}

function updateStatus(id, status) {
  return query(
    `UPDATE requests
     SET status = $1,
         completed_at = CASE
           WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP
           ELSE completed_at
         END
     WHERE id = $2`,
    [status, id]
  );
}

module.exports = {
  insertRequest,
  listByUserId,
  listForAdmin,
  updateStatus
};
