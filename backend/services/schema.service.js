const db = require('../db');

const safeAlter = async (sql) => {
  try {
    await db.query(sql);
  } catch (err) {
    // Ignore duplicate column / duplicate key errors; log everything else as a warning
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.code !== 'ER_DUP_ENTRY') {
      console.warn('Schema migration skipped:', err.message);
    }
  }
};

const ensureSchema = async () => {
  // Existing migrations
  await safeAlter("ALTER TABLE admins MODIFY COLUMN role ENUM('admin', 'main_admin', 'teacher') DEFAULT 'admin'");
  await safeAlter("ALTER TABLE crossword_data MODIFY COLUMN direction ENUM('across','down') DEFAULT 'across'");
  await safeAlter('ALTER TABLE crossword_data MODIFY COLUMN start_row INT DEFAULT 0');
  await safeAlter('ALTER TABLE crossword_data MODIFY COLUMN start_col INT DEFAULT 0');
  await safeAlter("ALTER TABLE otp_tokens MODIFY COLUMN otp VARCHAR(255) NOT NULL");
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN role ENUM('admin', 'teacher') DEFAULT 'admin' AFTER token");

  // ── New: school + session_month support ──────────────────────────────────
  // Add school to admins (stores teacher/admin's school name)
  await safeAlter("ALTER TABLE admins ADD COLUMN school VARCHAR(120) DEFAULT NULL AFTER role");

  // Add school to admin_invitations (set at invite time, copied to admins on registration)
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN school VARCHAR(120) DEFAULT NULL AFTER role");

  // Add session_month to game_sessions (e.g. 'January', 'April')
  // Use ADD first (no-op if exists), then MODIFY to fix the type if it was
  // previously created as TINYINT by an old SQL migration.
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN session_month VARCHAR(20) DEFAULT NULL AFTER session_name");
  await safeAlter("ALTER TABLE game_sessions MODIFY COLUMN session_month VARCHAR(20) DEFAULT NULL");

  console.log('✅ Schema ensured (school + session_month columns added if missing)');
};

module.exports = { ensureSchema };
