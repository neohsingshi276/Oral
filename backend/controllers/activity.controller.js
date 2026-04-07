const db = require('../db');

// Log admin activity
const logActivity = async (admin_id, action, details = null) => {
  try {
    await db.query(
      'INSERT INTO admin_activity_logs (admin_id, action, details) VALUES (?,?,?)',
      [admin_id, action, details]
    );
  } catch (err) { console.error('Activity log error:', err); }
};

// Get all activity logs (Main Admin only)
const getActivityLogs = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT al.*, a.name as admin_name, a.email as admin_email, a.role
      FROM admin_activity_logs al
      JOIN admins a ON al.admin_id = a.id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    res.json({ logs: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// Get admin session monitoring (Main Admin — see last session per admin)
const getAdminMonitoring = async (req, res) => {
  try {
    const [admins] = await db.query(`
      SELECT a.id, a.name, a.email, a.role, a.created_at,
        COUNT(s.id) as total_sessions,
        MAX(s.created_at) as last_session_date
      FROM admins a
      LEFT JOIN game_sessions s ON s.admin_id = a.id
      GROUP BY a.id
      ORDER BY a.role DESC, last_session_date DESC
    `);

    const now = new Date();
    const monitored = admins.map(admin => {
      const lastSession = admin.last_session_date ? new Date(admin.last_session_date) : null;
      const daysSince = lastSession ? Math.floor((now - lastSession) / (1000 * 60 * 60 * 24)) : null;
      const overdue = daysSince !== null ? daysSince > 90 : admin.total_sessions === 0;
      return { ...admin, days_since_last_session: daysSince, is_overdue: overdue };
    });

    res.json({ admins: monitored });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { logActivity, getActivityLogs, getAdminMonitoring };
