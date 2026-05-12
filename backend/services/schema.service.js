const db = require('../db');

const safeAlter = async (sql) => {
  try {
    await db.query(sql);
  } catch (err) {
    // Ignore duplicate column / duplicate key / duplicate FK errors; log everything else
    if (
      err?.code !== 'ER_DUP_FIELDNAME' &&
      err?.code !== 'ER_DUP_ENTRY' &&
      err?.code !== 'ER_FK_DUP_NAME' &&
      err?.code !== 'ER_DUP_KEYNAME'
    ) {
      console.warn('Schema migration skipped:', err.message);
    }
  }
};

const ensureSchema = async () => {
  // ── admins ──────────────────────────────────────────────────────────────────
  await safeAlter("ALTER TABLE admins MODIFY COLUMN role ENUM('admin', 'main_admin', 'teacher') DEFAULT 'admin'");
  await safeAlter("ALTER TABLE admins ADD COLUMN school VARCHAR(255) NULL AFTER role");

  // ── admin_invitations ────────────────────────────────────────────────────────
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN role ENUM('admin', 'teacher') DEFAULT 'admin' AFTER token");
  await safeAlter("ALTER TABLE admin_invitations ADD COLUMN school VARCHAR(255) NULL AFTER role");

  // ── otp_tokens ───────────────────────────────────────────────────────────────
  await safeAlter("ALTER TABLE otp_tokens MODIFY COLUMN otp VARCHAR(255) NOT NULL");

  // ── crossword_data ───────────────────────────────────────────────────────────
  await safeAlter("ALTER TABLE crossword_data MODIFY COLUMN direction ENUM('across','down') DEFAULT 'across'");
  await safeAlter("ALTER TABLE crossword_data MODIFY COLUMN start_row INT DEFAULT 0");
  await safeAlter("ALTER TABLE crossword_data MODIFY COLUMN start_col INT DEFAULT 0");

  // ── game_sessions — columns added after initial schema ───────────────────────
  // These were previously only in the raw SQL file, causing 500s on Railway
  // where the DB was created without them.
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN school_id INT NULL AFTER admin_id");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN class_id INT NULL AFTER school_id");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN session_month TINYINT NULL AFTER session_name");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_hash VARCHAR(255) NULL AFTER unique_token");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_plain VARCHAR(255) NULL AFTER reveal_password_hash");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_text VARCHAR(100) NULL AFTER reveal_password_hash");

  // FK constraints — safeAlter ignores ER_FK_DUP_NAME if already added
  await safeAlter(`
    ALTER TABLE game_sessions
      ADD CONSTRAINT fk_session_school
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
  `);
  await safeAlter(`
    ALTER TABLE game_sessions
      ADD CONSTRAINT fk_session_class
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  `);

  // ── facts / quiz_questions — LONGTEXT image fields ───────────────────────────
  await safeAlter("ALTER TABLE facts MODIFY COLUMN image_url LONGTEXT NULL");
  await safeAlter("ALTER TABLE quiz_questions MODIFY COLUMN image_url LONGTEXT NULL");
};

module.exports = { ensureSchema };
