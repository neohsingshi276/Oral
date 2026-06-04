const db = require('../db');

const safeAlter = async (sql) => {
  try {
    await db.query(sql);
  } catch (err) {
    // Ignore: duplicate column, duplicate key, or dropping a column that no longer exists
    if (
      err?.code !== 'ER_DUP_FIELDNAME' &&
      err?.code !== 'ER_DUP_ENTRY' &&
      err?.code !== 'ER_CANT_DROP_FIELD_OR_KEY'
    ) {
      console.warn('Schema migration skipped:', err.message);
    }
  }
};

const ensureSchema = async () => {

  await db.query(`
    CREATE TABLE IF NOT EXISTS player_positions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      player_id INT NOT NULL UNIQUE,
      pos_x FLOAT DEFAULT 1376,
      pos_y FLOAT DEFAULT 6896,
      last_checkpoint INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);

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

  await db.query(`
    CREATE TABLE IF NOT EXISTS faq_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NULL,
      asked_by_admin_id INT NOT NULL,
      answered_by_admin_id INT NULL,
      status ENUM('pending', 'answered') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      answered_at TIMESTAMP NULL,
      FOREIGN KEY (asked_by_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (answered_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS faq_instructions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      display_order INT DEFAULT 1,
      updated_by_admin_id INT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    INSERT IGNORE INTO faq_instructions (id, title, content, display_order)
    VALUES (
      1,
      'Cara Menggunakan Sistem DentalQuest',
      '1. Cipta sesi permainan di Sesi Permainan.\\n2. Berikan kod 4 digit kepada murid.\\n3. Pantau kemajuan murid di bahagian Pemain dan Analitik.\\n4. Gunakan Sembang Pemain untuk membantu murid.\\n5. Rujuk FAQ Dijawab untuk soalan biasa.',
      1
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
  await safeAlter("ALTER TABLE email_reminders MODIFY COLUMN to_admin_id INT NULL");
  await safeAlter("ALTER TABLE email_reminders ADD COLUMN to_email VARCHAR(120) NULL AFTER to_admin_id");
  await safeAlter("ALTER TABLE email_reminders ADD COLUMN to_name VARCHAR(120) NULL AFTER to_email");

  // Keep reveal_password_plain for admin UI display; drop legacy free-text column only
  await safeAlter("ALTER TABLE game_sessions DROP COLUMN reveal_password_text");
  // Ensure reveal_password_hash column exists (added after initial deploy)
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_hash VARCHAR(255) NULL AFTER unique_token");
  // Re-add reveal_password_plain for admin display (was previously dropped, now needed for UI)
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN reveal_password_plain VARCHAR(255) NULL AFTER reveal_password_hash");

  // Ensure school_id / class_id exist (added after initial deploy)
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN school_id INT NULL AFTER admin_id");
  await safeAlter("ALTER TABLE game_sessions ADD COLUMN class_id INT NULL AFTER school_id");

  // Fix unique_token column width (was VARCHAR(6), codes are always 4 digits)
  await safeAlter("ALTER TABLE game_sessions MODIFY COLUMN unique_token VARCHAR(4) NOT NULL");

  // ── Bilingual (BI) content columns ────────────────────────────────────────
  // learning_videos
  await safeAlter("ALTER TABLE learning_videos ADD COLUMN title_bi VARCHAR(255) NULL");
  await safeAlter("ALTER TABLE learning_videos ADD COLUMN description_bi TEXT NULL");

  // facts (Did You Know?)
  await safeAlter("ALTER TABLE facts ADD COLUMN title_bi VARCHAR(255) NULL");
  await safeAlter("ALTER TABLE facts ADD COLUMN content_bi TEXT NULL");

  // quiz_questions
  await safeAlter("ALTER TABLE quiz_questions ADD COLUMN question_bi TEXT NULL");
  await safeAlter("ALTER TABLE quiz_questions ADD COLUMN options_bi JSON NULL");

  // crossword clues (words stay in English — only clues need translation)
  await safeAlter("ALTER TABLE crossword_data ADD COLUMN clue_bi TEXT NULL");

  // ── Token revocation ───────────────────────────────────────────────────────
  // FIX: Add token_version to admins table. login() includes the current value
  // in the JWT payload (tv). verifyToken() rejects any token whose tv is lower
  // than the DB value — so logout and password reset instantly invalidate all
  // previously issued tokens for that admin.
  await safeAlter("ALTER TABLE admins ADD COLUMN token_version INT NOT NULL DEFAULT 0");
};

module.exports = { ensureSchema };