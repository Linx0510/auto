const { query } = require('../database/database');

function listApprovedRecent(limit) {
  return query(
    `SELECT r.*, u.full_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.is_approved = TRUE
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [limit]
  );
}

module.exports = {
  listApprovedRecent
};
