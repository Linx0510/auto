const { query } = require('../database/database');

async function fetchAdminStats() {
  const [total, pending, completed, users, revenue] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM requests'),
    query(`SELECT COUNT(*)::int AS pending FROM requests WHERE status = 'pending'`),
    query(`SELECT COUNT(*)::int AS completed FROM requests WHERE status = 'completed'`),
    query(`SELECT COUNT(*)::int AS users FROM users WHERE role = 'client'`),
    query(
      `SELECT COALESCE(SUM(s.price), 0) AS revenue
       FROM requests r
       JOIN services s ON r.service_id = s.id
       WHERE r.status = 'completed'`
    )
  ]);

  return {
    total: total.rows[0].total,
    pending: pending.rows[0].pending,
    completed: completed.rows[0].completed,
    users: users.rows[0].users,
    revenue: Number(revenue.rows[0].revenue)
  };
}

module.exports = {
  fetchAdminStats
};
