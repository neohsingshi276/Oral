-- ============================================================
-- DentalQuest Complete Database Setup
-- Run this file once to set up the entire database
-- ============================================================

CREATE DATABASE IF NOT EXISTS dental_health_app;
USE dental_health_app;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- ── Admins ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'main_admin') DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Game Sessions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  session_name VARCHAR(255) NOT NULL,
  unique_token VARCHAR(6) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- ── Players ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── Checkpoint Attempts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkpoint_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  session_id INT NOT NULL,
  checkpoint_number INT NOT NULL,
  attempts INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── Player Positions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL UNIQUE,
  pos_x FLOAT DEFAULT 390,
  pos_y FLOAT DEFAULT 1000,
  last_checkpoint INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- ── Checkpoint Videos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkpoint_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checkpoint_number INT NOT NULL UNIQUE,
  youtube_url VARCHAR(500) NOT NULL,
  title VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Learning Videos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  youtube_url VARCHAR(500) NOT NULL,
  description TEXT,
  order_num INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Facts (Did You Know?) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS facts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_by INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE
);

-- ── Chat Messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  session_id INT NOT NULL,
  sender_type ENUM('player', 'admin') NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── Quiz Questions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'true_false', 'multi_select', 'match') NOT NULL DEFAULT 'multiple_choice',
  image_url VARCHAR(500) NULL,
  timer_seconds INT DEFAULT 15,
  options JSON NULL,
  correct_answer JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Quiz Scores ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  session_id INT NOT NULL,
  score INT DEFAULT 0,
  correct_answers INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  time_taken INT DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── Quiz Settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,
  timer_seconds INT DEFAULT 15,
  question_order ENUM('fixed', 'shuffle') DEFAULT 'shuffle',
  question_count INT DEFAULT 10,
  minimum_correct INT DEFAULT 0,
  selected_questions JSON NULL,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── Crossword Data ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crossword_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  word VARCHAR(50) NOT NULL,
  clue TEXT NOT NULL,
  direction ENUM('across', 'down') NOT NULL,
  start_row INT NOT NULL,
  start_col INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Crossword Settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crossword_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,
  word_count INT DEFAULT 8,
  selected_words JSON NULL,
  minimum_correct INT DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── Crossword Scores ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crossword_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  session_id INT NOT NULL,
  score INT DEFAULT 0,
  words_correct INT DEFAULT 0,
  total_words INT DEFAULT 0,
  time_taken INT DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── CP3 Settings (Food Game) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS cp3_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,
  timer_seconds INT DEFAULT 60,
  target_score INT DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── CP3 Scores (Food Game) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp3_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  session_id INT NOT NULL,
  score INT DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- ── Admin Activity Logs ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- ── Email Reminders ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_admin_id INT NOT NULL,
  to_admin_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  FOREIGN KEY (to_admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(120) NOT NULL UNIQUE,
  otp         VARCHAR(6)   NOT NULL,
  admin_id    INT          NOT NULL,
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME     DEFAULT NOW(),
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Default Main Admin (password: admin123)
INSERT IGNORE INTO admins (name, email, password_hash, role) VALUES
('Main Admin', 'admin@dentalquest.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'main_admin');

-- Sample Quiz Questions (Bahasa Malaysia)
INSERT INTO quiz_questions (question, question_type, options, correct_answer, timer_seconds) VALUES
('Tabiat merokok tidak baik untuk kesihatan mulut.', 'true_false', '["Tidak", "Ya"]', '[1]', 15),
('Seseorang digalakkan berjumpa doktor gigi untuk pemeriksaan gigi ___________.', 'multiple_choice', '["Lima tahun sekali", "Hanya apabila gusi bengkak", "Hanya apabila gigi sakit", "Sekurang-kurangnya sekali setahun"]', '[3]', 15),
('Berikut adalah kepentingan gigi kecuali ___________.', 'multiple_choice', '["Pemakanan", "Pertuturan", "Penampilan dan keyakinan diri", "Pernafasan"]', '[3]', 15),
('Penyakit gusi boleh menyebabkan ___________.', 'multiple_choice', '["Gigi menjadi putih", "Nafas menjadi segar", "Gigi menjadi longgar", "Peningkatan selera makan"]', '[2]', 15),
('Seseorang boleh mengurangkan risiko gigi reput dengan ___________.', 'multiple_choice', '["Mendapatkan pemeriksaan pergigian hanya apabila gigi sakit", "Merokok", "Menggunakan ubat gigi tanpa fluorida", "Mengurangkan makanan bergula setiap hari"]', '[3]', 15),
('Makan makanan bergula dengan banyak boleh menyebabkan ___________.', 'multiple_choice', '["Gigi menjadi lebih kuat", "Nafas menjadi lebih segar", "Gusi menjadi lebih sihat", "Gigi menjadi reput"]', '[3]', 15),
('Berikut adalah amalan penjagaan kesihatan pergigian yang baik kecuali ___________.', 'multiple_choice', '["Berkumur dengan air selepas makan", "Memberus gigi sekurang-kurangnya dua kali", "Menggunakan benang flos sekurang-kurangnya sekali sehari", "Makan snek bergula di antara waktu makan"]', '[3]', 15),
('Plak gigi boleh menyebabkan ___________.', 'multiple_choice', '["Batuk", "Penyakit gusi", "Selsema", "Cirit birit"]', '[1]', 15),
('Seseorang perlu memberus gigi dengan ubat gigi berfluorida sekurang-kurangnya ___________.', 'multiple_choice', '["Dua kali sehari", "Sekali sehari", "Sekali seminggu", "Dua kali seminggu"]', '[0]', 15),
('Seseorang yang tidak menjaga kebersihan mulut akan ___________.', 'multiple_choice', '["Mempunyai nafas yang lebih segar", "Disukai oleh rakan-rakan", "Disukai oleh doktor gigi", "Berisiko mendapat penyakit pergigian seperti karies gigi dan penyakit gusi"]', '[3]', 15);

-- Sample Crossword Data
INSERT INTO crossword_data (word, clue, direction, start_row, start_col) VALUES
('GIGI',   'Organ keras dalam mulut untuk mengunyah',       'across', 0, 0),
('GUSI',   'Tisu merah yang mengelilingi gigi',             'down',   0, 0),
('GOSOK',  'Tindakan membersihkan gigi dengan berus',       'across', 2, 1),
('KARIES', 'Nama lain untuk gigi reput',                    'down',   0, 4),
('PLAK',   'Lapisan bakteria pada permukaan gigi',          'across', 4, 0),
('FLOSS',  'Benang untuk membersihkan celah gigi',          'down',   2, 6),
('UBAT',   'Digunakan bersama berus untuk gosok gigi',      'across', 6, 2),
('MULUT',  'Rongga tempat gigi berada',                     'across', 8, 0),
('ENAMEL', 'Lapisan terluar dan terkeras pada gigi',        'down',   2, 3),
('DOKTOR', 'Pakar yang menjaga kesihatan gigi',             'down',   4, 8);

-- Sample Learning Videos
INSERT INTO learning_videos (title, youtube_url, description) VALUES
('Kenapa Kita Perlu Menjaga Kesihatan Gigi?', 'https://www.youtube.com/watch?v=lzBabM39SUE', 'Video tentang kepentingan menjaga kesihatan gigi'),
('Cara Memberus Gigi Yang Betul', 'https://www.youtube.com/watch?v=ZuysfO_GP9M', 'Teknik memberus gigi yang betul'),
('Makanan Sihat Untuk Gigi', 'https://www.youtube.com/watch?v=O6jGPTtBUMU', 'Makanan yang baik dan buruk untuk kesihatan gigi');

-- Sample Did You Know Facts
INSERT INTO facts (created_by, title, content) VALUES
(1, 'Gigi Adalah Unik!', 'Gigi anda adalah unik seperti cap jari anda. Tiada dua set gigi yang sama!'),
(1, 'Enamel Adalah Bahan Paling Keras', 'Enamel gigi adalah bahan paling keras dalam badan manusia, lebih keras daripada tulang!'),
(1, 'Bakteria Dalam Mulut', 'Terdapat lebih 700 jenis bakteria dalam mulut manusia. Memberus gigi membantu mengurangkan bakteria berbahaya.');

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ============================================================
-- SETUP COMPLETE!
-- Default login: admin@dentalquest.com / admin123
-- ============================================================
SELECT 'DentalQuest database setup complete!' as Status;

ALTER TABLE facts MODIFY COLUMN image_url LONGTEXT NULL;
ALTER TABLE quiz_questions MODIFY COLUMN image_url LONGTEXT NULL;