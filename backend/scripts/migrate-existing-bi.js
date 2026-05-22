/**
 * migrate-existing-bi.js
 * ─────────────────────────────────────────────────────────
 * One-time script to auto-translate all EXISTING database
 * content (facts, videos, quiz, crossword) from BM → BI.
 *
 * Run once after deploying the bilingual update:
 *   node backend/scripts/migrate-existing-bi.js
 *
 * Safe to re-run: only updates rows where _bi fields are NULL or empty.
 * ─────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');
const { translateBmToBi, translateOptionsBmToBi } = require('../services/translate.service');

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function migrateFacts() {
  log('📋 Migrating facts...');
  const [rows] = await db.query(
    "SELECT id, title, content FROM facts WHERE title_bi IS NULL OR title_bi = '' OR content_bi IS NULL OR content_bi = ''"
  );
  log(`   Found ${rows.length} facts needing BI translation`);
  for (const row of rows) {
    log(`   → Fact #${row.id}: "${row.title?.slice(0, 40)}"`);
    const title_bi = await translateBmToBi(row.title || '');
    await delay(400);
    const content_bi = await translateBmToBi(row.content || '');
    await delay(400);
    await db.query('UPDATE facts SET title_bi = ?, content_bi = ? WHERE id = ?', [title_bi, content_bi, row.id]);
    log(`     ✓ "${title_bi?.slice(0, 50)}"`);
  }
  log(`✅ Facts done (${rows.length} updated)`);
}

async function migrateVideos() {
  log('📹 Migrating videos...');
  const [rows] = await db.query(
    "SELECT id, title, description FROM learning_videos WHERE title_bi IS NULL OR title_bi = ''"
  );
  log(`   Found ${rows.length} videos needing BI translation`);
  for (const row of rows) {
    log(`   → Video #${row.id}: "${row.title?.slice(0, 40)}"`);
    const title_bi = await translateBmToBi(row.title || '');
    await delay(400);
    const description_bi = await translateBmToBi(row.description || '');
    await delay(400);
    await db.query('UPDATE learning_videos SET title_bi = ?, description_bi = ? WHERE id = ?', [title_bi, description_bi, row.id]);
    log(`     ✓ "${title_bi?.slice(0, 50)}"`);
  }
  log(`✅ Videos done (${rows.length} updated)`);
}

async function migrateQuiz() {
  log('❓ Migrating quiz questions...');
  const [rows] = await db.query(
    "SELECT id, question, options FROM quiz_questions WHERE question_bi IS NULL OR question_bi = ''"
  );
  log(`   Found ${rows.length} questions needing BI translation`);
  for (const row of rows) {
    log(`   → Q#${row.id}: "${row.question?.slice(0, 40)}"`);
    const question_bi = await translateBmToBi(row.question || '');
    await delay(400);
    const options_bi = await translateOptionsBmToBi(row.options || '[]');
    await delay(400);
    await db.query('UPDATE quiz_questions SET question_bi = ?, options_bi = ? WHERE id = ?', [question_bi, options_bi, row.id]);
    log(`     ✓ "${question_bi?.slice(0, 50)}"`);
  }
  log(`✅ Quiz done (${rows.length} updated)`);
}

async function migrateCrossword() {
  log('🔤 Migrating crossword clues...');
  const [rows] = await db.query(
    "SELECT id, word, clue FROM crossword_data WHERE clue_bi IS NULL OR clue_bi = ''"
  );
  log(`   Found ${rows.length} words needing BI clue translation`);
  for (const row of rows) {
    log(`   → Word: ${row.word}`);
    const clue_bi = await translateBmToBi(row.clue || '');
    await delay(400);
    await db.query('UPDATE crossword_data SET clue_bi = ? WHERE id = ?', [clue_bi, row.id]);
    log(`     ✓ "${clue_bi?.slice(0, 50)}"`);
  }
  log(`✅ Crossword done (${rows.length} updated)`);
}

(async () => {
  try {
    log('🚀 Starting bilingual migration...');
    log('   (MyMemory free API — 10k words/day, ~400ms between requests)');
    await migrateFacts();
    await migrateVideos();
    await migrateQuiz();
    await migrateCrossword();
    log('');
    log('🎉 Migration complete! All existing content now has BI translations.');
    log('   Review in admin panel and edit any incorrect translations.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
