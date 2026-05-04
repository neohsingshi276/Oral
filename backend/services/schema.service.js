const db = require('../db');

const ignoreDuplicateColumn = (err) => {
  if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
};

const ensureSchema = async () => {
  try {
    await db.query("ALTER TABLE admins MODIFY COLUMN role ENUM('admin', 'main_admin', 'teacher') DEFAULT 'admin'");
    await db.query("ALTER TABLE crossword_data MODIFY COLUMN direction ENUM('across','down') DEFAULT 'across'");
    await db.query('ALTER TABLE crossword_data MODIFY COLUMN start_row INT DEFAULT 0');
    await db.query('ALTER TABLE crossword_data MODIFY COLUMN start_col INT DEFAULT 0');
    await db.query("ALTER TABLE otp_tokens MODIFY COLUMN otp VARCHAR(255) NOT NULL");
    await db.query("ALTER TABLE admin_invitations ADD COLUMN role ENUM('admin', 'teacher') DEFAULT 'admin' AFTER token")
      .catch(ignoreDuplicateColumn);
  } catch (err) {
    console.error('Schema check failed:', err.message);
  }
};

module.exports = { ensureSchema };
