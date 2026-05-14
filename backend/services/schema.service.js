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
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN role ENUM('admin', 'teacher') DEFAULT 'admin' AFTER token");
  await safeAlter("ALTER TABLE admins ADD COLUMN school VARCHAR(255) NULL AFTER role");
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN school VARCHAR(255) NULL AFTER role");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN session_month TINYINT NULL AFTER session_name");

  // Ensure reveal_password columns exist (were added after initial deploy)
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_hash VARCHAR(255) NULL AFTER unique_token");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_plain VARCHAR(255) NULL AFTER reveal_password_hash");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_text VARCHAR(100) NULL AFTER reveal_password_plain");

  // Ensure school_id / class_id exist (added after initial deploy)
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN school_id INT NULL AFTER admin_id");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN class_id INT NULL AFTER school_id");

  // Fix unique_token column width (was VARCHAR(6), codes are always 4 digits)
  await safeAlter("ALTER TABLE game_sessions MODIFY COLUMN unique_token VARCHAR(4) NOT NULL");
};

module.exports = { ensureSchema };
