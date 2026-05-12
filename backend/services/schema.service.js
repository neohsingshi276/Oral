const db = require('../db');

const safeRun = async (sql, label) => {
  try {
    await db.query(sql);
  } catch (err) {
    const ignoredCodes = [
      'ER_DUP_FIELDNAME',   // column already exists
      'ER_DUP_ENTRY',       // duplicate row
      'ER_FK_DUP_NAME',     // FK constraint already exists
      'ER_DUP_KEYNAME',     // index already exists
      'ER_TABLE_EXISTS_ERROR', // table already exists
    ];
    if (!ignoredCodes.includes(err?.code)) {
      console.warn(`Schema migration skipped [${label}]:`, err.message);
    }
  }
};

const ensureSchema = async () => {

  // ── Create schools table if missing ─────────────────────────────────────────
  await safeRun(`
    CREATE TABLE IF NOT EXISTS schools (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `, 'create schools');

  // ── Create classes table if missing ─────────────────────────────────────────
  await safeRun(`
    CREATE TABLE IF NOT EXISTS classes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NOT NULL,
      teacher_id INT NOT NULL,
      class_name VARCHAR(100) NOT NULL,
      reveal_password_hash VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_classes_school
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_classes_teacher
        FOREIGN KEY (teacher_id) REFERENCES admins(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `, 'create classes');

  // ── admins ──────────────────────────────────────────────────────────────────
  await safeRun("ALTER TABLE admins MODIFY COLUMN role ENUM('admin', 'main_admin', 'teacher') DEFAULT 'admin'", 'admins role enum');
  await safeRun("ALTER TABLE admins ADD COLUMN school VARCHAR(255) NULL AFTER role", 'admins school col');

  // ── admin_invitations ────────────────────────────────────────────────────────
  await safeRun("ALTER TABLE admin_invitations ADD COLUMN role ENUM('admin', 'teacher') DEFAULT 'admin' AFTER token", 'invitations role col');
  await safeRun("ALTER TABLE admin_invitations ADD COLUMN school VARCHAR(255) NULL AFTER role", 'invitations school col');

  // ── otp_tokens ───────────────────────────────────────────────────────────────
  await safeRun("ALTER TABLE otp_tokens MODIFY COLUMN otp VARCHAR(255) NOT NULL", 'otp varchar');

  // ── crossword_data ───────────────────────────────────────────────────────────
  await safeRun("ALTER TABLE crossword_data MODIFY COLUMN direction ENUM('across','down') DEFAULT 'across'", 'crossword direction');
  await safeRun("ALTER TABLE crossword_data MODIFY COLUMN start_row INT DEFAULT 0", 'crossword start_row');
  await safeRun("ALTER TABLE crossword_data MODIFY COLUMN start_col INT DEFAULT 0", 'crossword start_col');

  // ── game_sessions — add columns that were missing on Railway ─────────────────
  await safeRun("ALTER TABLE game_sessions ADD COLUMN school_id INT NULL AFTER admin_id", 'sessions school_id');
  await safeRun("ALTER TABLE game_sessions ADD COLUMN class_id INT NULL AFTER school_id", 'sessions class_id');
  await safeRun("ALTER TABLE game_sessions ADD COLUMN session_month TINYINT NULL AFTER session_name", 'sessions session_month');
  await safeRun("ALTER TABLE game_sessions ADD COLUMN reveal_password_hash VARCHAR(255) NULL AFTER unique_token", 'sessions pw hash');
  await safeRun("ALTER TABLE game_sessions ADD COLUMN reveal_password_plain VARCHAR(255) NULL AFTER reveal_password_hash", 'sessions pw plain');
  await safeRun("ALTER TABLE game_sessions ADD COLUMN reveal_password_text VARCHAR(100) NULL AFTER reveal_password_hash", 'sessions pw text');

  // FK constraints on game_sessions (schools/classes must exist first)
  await safeRun(`
    ALTER TABLE game_sessions
      ADD CONSTRAINT fk_session_school
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
  `, 'sessions fk school');
  await safeRun(`
    ALTER TABLE game_sessions
      ADD CONSTRAINT fk_session_class
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  `, 'sessions fk class');

  // ── facts / quiz_questions ───────────────────────────────────────────────────
  await safeRun("ALTER TABLE facts MODIFY COLUMN image_url LONGTEXT NULL", 'facts image longtext');
  await safeRun("ALTER TABLE quiz_questions MODIFY COLUMN image_url LONGTEXT NULL", 'quiz image longtext');
};

module.exports = { ensureSchema };
