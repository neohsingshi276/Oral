const db = require('../db');

const safeAlter = async (sql) => {
  try {
    await db.query(sql);
  } catch (err) {
    // Ignore duplicate column / duplicate key errors; log everything else as a warning
    if (!['ER_DUP_FIELDNAME', 'ER_DUP_ENTRY', 'ER_CANT_DROP_FIELD_OR_KEY'].includes(err?.code)) {
      console.warn('Schema migration skipped:', err.message);
    }
  }
};

const ensureSchema = async () => {

  await db.query(`
    CREATE TABLE IF NOT EXISTS teacher_session_access (
      id INT AUTO_INCREMENT PRIMARY KEY,
      teacher_id INT NOT NULL,
      session_id INT NOT NULL,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_teacher_session (teacher_id, session_id),
      FOREIGN KEY (teacher_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
    )
  `);
  await safeAlter("ALTER TABLE admins MODIFY COLUMN role ENUM('admin', 'main_admin', 'teacher') DEFAULT 'admin'");
  await safeAlter("ALTER TABLE crossword_data MODIFY COLUMN direction ENUM('across','down') DEFAULT 'across'");
  await safeAlter('ALTER TABLE crossword_data MODIFY COLUMN start_row INT DEFAULT 0');
  await safeAlter('ALTER TABLE crossword_data MODIFY COLUMN start_col INT DEFAULT 0');
  await safeAlter("ALTER TABLE otp_tokens MODIFY COLUMN otp VARCHAR(255) NOT NULL");
  await safeAlter("ALTER TABLE otp_tokens ADD COLUMN attempts INT NOT NULL DEFAULT 0 AFTER admin_id");
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN role ENUM('admin', 'teacher') DEFAULT 'admin' AFTER token");
  await safeAlter("ALTER TABLE admins ADD COLUMN school VARCHAR(255) NULL AFTER role");
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN school VARCHAR(255) NULL AFTER role");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN session_month TINYINT NULL AFTER session_name");
  await safeAlter("ALTER TABLE admins ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER password_hash");
  await safeAlter("ALTER TABLE game_sessions DROP COLUMN reveal_password_plain");
  await safeAlter("ALTER TABLE game_sessions DROP COLUMN reveal_password_text");
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_token_blacklist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jti VARCHAR(64) NOT NULL UNIQUE,
      admin_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_token_blacklist_expires (expires_at),
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    )
  `);
};

module.exports = { ensureSchema };
