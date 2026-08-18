const { logActivity } = require('./activity.controller');
const db = require('../db');
const { translateBmToBi, translateBiToBm, translateOptions } = require('../services/translate.service');

const getSessionQuestions = async (req, res) => {
  const { session_id } = req.params;
  try {
    const [settings] = await db.query('SELECT * FROM quiz_settings WHERE session_id = ?', [session_id]);
    const rawCfg = settings[0] || { timer_seconds: 15, question_order: 'shuffle', question_count: 10, minimum_correct: 8, selected_questions: null };
    const cfg = {
      ...rawCfg,
      minimum_correct: (rawCfg.minimum_correct !== undefined && rawCfg.minimum_correct !== null && !isNaN(Number(rawCfg.minimum_correct))) ? Number(rawCfg.minimum_correct) : 8,
    };

    let query = 'SELECT id, question, question_bi, question_type, image_url, options, options_bi, correct_answer FROM quiz_questions';
    let queryParams = [];

    let selectedIds = [];
    try {
      if (cfg.selected_questions) {
        selectedIds = typeof cfg.selected_questions === 'string' ? JSON.parse(cfg.selected_questions) : cfg.selected_questions;
      }
    } catch (e) { }

    if (selectedIds && selectedIds.length > 0) {
      const placeholders = selectedIds.map(() => '?').join(',');
      query += ` WHERE id IN (${placeholders})`;
      queryParams.push(...selectedIds);
    }

    if (cfg.question_order === 'shuffle') {
      query += ' ORDER BY RAND()';
    } else if (selectedIds && selectedIds.length > 0) {
      const fieldPlaceholders = selectedIds.map(() => '?').join(',');
      query += ` ORDER BY FIELD(id, ${fieldPlaceholders})`;
      queryParams.push(...selectedIds);
    } else {
      query += ' ORDER BY id ASC';
    }

    query += ' LIMIT ?';
    queryParams.push(parseInt(cfg.question_count));

    const [rows] = await db.query(query, queryParams);
    const questions = rows.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correct_answer: typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer,
      timer_seconds: cfg.timer_seconds,
    }));

    res.json({ questions, settings: { ...cfg, selected_questions: selectedIds } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const submitQuiz = async (req, res) => {
  const { player_id, session_id, answers, time_taken } = req.body;
  if (!player_id || !session_id || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Invalid submission data' });
  }
  if (answers.length > 100) return res.status(400).json({ error: 'Too many answers' });

  try {
    // Verify player belongs to this session
    const [playerRows] = await db.query('SELECT id FROM players WHERE id = ? AND session_id = ?', [player_id, session_id]);
    if (playerRows.length === 0) return res.status(403).json({ error: 'Player does not belong to this session' });

    // FIX: Never trust the raw client-submitted array length for scoring or
    // for the displayed "x/y" total — a stray client-side duplicate (e.g. a
    // timeout and a click both registering an answer for the same question
    // in a rare race) would silently inflate both the score and the total
    // in lockstep (seen as "10/11" on the leaderboard for a 10-question
    // quiz). Dedupe by question_id, keeping the first submission for each.
    const seenQuestionIds = new Set();
    const dedupedAnswers = [];
    for (const ans of answers) {
      if (!Number.isInteger(ans?.question_id) || seenQuestionIds.has(ans.question_id)) continue;
      seenQuestionIds.add(ans.question_id);
      dedupedAnswers.push(ans);
    }

    const questionIds = dedupedAnswers.map(a => a.question_id);
    if (questionIds.length === 0) return res.status(400).json({ error: 'Invalid question IDs' });

    const placeholders = questionIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT id, correct_answer, question_type FROM quiz_questions WHERE id IN (${placeholders})`,
      questionIds
    );

    const questionMap = {};
    for (const row of rows) {
      questionMap[row.id] = {
        correct_answer: typeof row.correct_answer === 'string' ? JSON.parse(row.correct_answer) : row.correct_answer,
        question_type: row.question_type
      };
    }

    // total is now the count of deduped answers that actually matched a
    // real question in this quiz — not a raw, unvalidated client count.
    const total = dedupedAnswers.filter(a => questionMap[a.question_id]).length;

    // Time limit per question (admin-configured) — needed for the speed bonus formula
    const [settingsRows] = await db.query('SELECT timer_seconds FROM quiz_settings WHERE session_id = ?', [session_id]);
    const timeLimit = (settingsRows[0]?.timer_seconds && parseInt(settingsRows[0].timer_seconds, 10) > 0)
      ? parseInt(settingsRows[0].timer_seconds, 10)
      : 15;

    // Marking scheme (per question, max 100 marks):
    //   Correct  -> 80 marks + speed bonus, where speed bonus = 20 * (timeLimit - timeUsed) / timeLimit
    //   Wrong    -> 0 marks
    let correct = 0;
    let rawScore = 0; // sum of marks actually earned
    for (const ans of dedupedAnswers) {
      const q = questionMap[ans.question_id];
      if (!q) continue;
      const { correct_answer: correctAnswer, question_type: type } = q;

      let isRight = false;
      if (type === 'multiple_choice' || type === 'true_false') {
        isRight = ans.selected_indexes[0] === correctAnswer[0];
      } else if (type === 'multi_select') {
        const sortedCorrect = [...correctAnswer].sort().join(',');
        const sortedAns = [...(ans.selected_indexes || [])].sort().join(',');
        isRight = sortedCorrect === sortedAns;
      } else if (type === 'match') {
        isRight = correctAnswer.every(pair =>
          ans.selected_indexes.some(p => p[0] === pair[0] && p[1] === pair[1])
        );
      }

      if (isRight) {
        correct++;
        const timeUsed = Math.min(Math.max(parseInt(ans.time_used, 10) || 0, 0), timeLimit);
        const speedBonus = 20 * ((timeLimit - timeUsed) / timeLimit);
        rawScore += 80 + speedBonus;
      }
      // Wrong / timed-out answers earn 0 marks
    }

    const maxPossible = total * 100; // total mark that CAN be earned in this quiz session
    const score = Math.round(rawScore); // final mark earned (stored as a whole number)
    // Leaderboard ranking figure: final mark earned / total mark that can be earned * 100
    const percentage = maxPossible > 0 ? Math.round((score / maxPossible) * 10000) / 100 : 0;

    // FIX: Guard against duplicate submissions — only keep the best score
    const [existing] = await db.query(
      'SELECT id, score, total_questions FROM quiz_scores WHERE player_id = ? AND session_id = ?',
      [player_id, session_id]
    );
    if (existing.length > 0) {
      const existingMax = (existing[0].total_questions || 0) * 100;
      const existingPct = existingMax > 0 ? (existing[0].score / existingMax) * 100 : 0;
      if (percentage > existingPct) {
        await db.query(
          'UPDATE quiz_scores SET score=?, correct_answers=?, total_questions=?, time_taken=? WHERE id=?',
          [score, correct, total, parseInt(time_taken, 10) || 0, existing[0].id]
        );
      }
    } else {
      await db.query(
        'INSERT INTO quiz_scores (player_id, session_id, score, correct_answers, total_questions, time_taken) VALUES (?,?,?,?,?,?)',
        [player_id, session_id, score, correct, total, parseInt(time_taken, 10) || 0]
      );
    }

    res.json({ score, percentage, maxPossible, correct, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.player_id, s.score, s.correct_answers,
             s.total_questions, s.time_taken, s.completed_at, p.nickname,
             CASE WHEN s.total_questions > 0
                  THEN LEAST(100, GREATEST(0, ROUND((s.score / (s.total_questions * 100)) * 100, 2)))
                  ELSE 0 END AS percentage
      FROM quiz_scores s
      JOIN players p ON s.player_id = p.id
      WHERE s.session_id = ?
      ORDER BY percentage DESC, s.score DESC
    `, [req.params.session_id]);

    const seen = {};
    const leaderboard = [];
    for (const row of rows) {
      if (!seen[row.player_id]) {
        seen[row.player_id] = true;
        leaderboard.push(row);
      }
    }
    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const type = req.query.type || 'all';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    let sql = `
      SELECT * FROM quiz_questions
      WHERE (
        question LIKE ?
        OR COALESCE(question_bi, '') LIKE ?
      )
    `;

    const params = [`%${search}%`, `%${search}%`];

    if (type !== 'all') {
      sql += ` AND question_type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY id ${order}`;

    const [rows] = await db.query(sql, params);

    const questions = rows.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      options_bi: typeof q.options_bi === 'string' ? JSON.parse(q.options_bi) : q.options_bi,
      correct_answer: typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer,
    }));

    res.json({ questions });
  } catch (err) {
    console.error('Get quiz questions error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const parseJsonField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    const err = new Error(`Invalid ${fieldName} format`);
    err.status = 400;
    throw err;
  }
};

const resolveQuizTranslations = async ({ question, options, body }) => {
  const sourceLanguage = body.source_language === 'bi' ? 'bi' : 'bm';
  const manualQuestion = (body.question_translation || body.question_bm || body.question_bi || '').trim();
  const manualOptions = parseJsonField(body.options_translation || body.options_bm || body.options_bi, 'options_translation');

  if (sourceLanguage === 'bi') {
    return {
      questionBm: manualQuestion || await translateBiToBm(question.trim()),
      questionBi: question.trim(),
      optionsBm: manualOptions ? JSON.stringify(manualOptions) : await translateOptions(options, 'en', 'ms'),
      optionsBi: JSON.stringify(options),
    };
  }

  return {
    questionBm: question.trim(),
    questionBi: manualQuestion || await translateBmToBi(question.trim()),
    optionsBm: JSON.stringify(options),
    optionsBi: manualOptions ? JSON.stringify(manualOptions) : await translateOptions(options, 'ms', 'en'),
  };
};

// Save image as Base64 into DB — no disk storage (Railway ephemeral filesystem fix)
const addQuestion = async (req, res) => {
  let { question, question_type, options, correct_answer, timer_seconds } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0)
    return res.status(400).json({ error: 'Question text is required' });
  if (question.trim().length > 500)
    return res.status(400).json({ error: 'Question too long (max 500 characters)' });
  if (!question_type || !['multiple_choice', 'true_false', 'multi_select', 'match'].includes(question_type))
    return res.status(400).json({ error: 'Invalid question type' });

  // Parse JSON strings from FormData
  if (typeof options === 'string') { try { options = JSON.parse(options); } catch (e) { return res.status(400).json({ error: 'Invalid options format' }); } }
  if (typeof correct_answer === 'string') { try { correct_answer = JSON.parse(correct_answer); } catch (e) { return res.status(400).json({ error: 'Invalid correct_answer format' }); } }

  if (!Array.isArray(options) || !Array.isArray(correct_answer))
    return res.status(400).json({ error: 'Options and correct_answer must be arrays' });
  if (options.length > 8)
    return res.status(400).json({ error: 'Too many options (max 8)' });

  let image_url = null;
  if (req.file) {
    const base64 = req.file.buffer.toString('base64');
    image_url = `data:${req.file.mimetype};base64,${base64}`;
  }

  try {
    const { questionBm, questionBi, optionsBm, optionsBi } = await resolveQuizTranslations({ question, options, body: req.body });
    const [result] = await db.query(
      'INSERT INTO quiz_questions (question, question_bi, question_type, image_url, options, options_bi, correct_answer, timer_seconds) VALUES (?,?,?,?,?,?,?,?)',
      [questionBm, questionBi, question_type, image_url, optionsBm, optionsBi, JSON.stringify(correct_answer), timer_seconds || 15]
    );
    await logActivity(req.admin.id, 'Added quiz question', `Question ID: ${result.insertId}`);
    res.status(201).json({ message: 'Question added', id: result.insertId });
  } catch (err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' }); }
};

const updateQuestion = async (req, res) => {
  let { question, question_type, options, correct_answer, timer_seconds } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0)
    return res.status(400).json({ error: 'Question text is required' });
  if (question.trim().length > 500)
    return res.status(400).json({ error: 'Question too long (max 500 characters)' });
  if (!question_type || !['multiple_choice', 'true_false', 'multi_select', 'match'].includes(question_type))
    return res.status(400).json({ error: 'Invalid question type' });

  // Parse JSON strings from FormData
  if (typeof options === 'string') { try { options = JSON.parse(options); } catch (e) { return res.status(400).json({ error: 'Invalid options format' }); } }
  if (typeof correct_answer === 'string') { try { correct_answer = JSON.parse(correct_answer); } catch (e) { return res.status(400).json({ error: 'Invalid correct_answer format' }); } }

  if (!Array.isArray(options) || !Array.isArray(correct_answer))
    return res.status(400).json({ error: 'Options and correct_answer must be arrays' });
  if (options.length > 8)
    return res.status(400).json({ error: 'Too many options (max 8)' });

  try {
    const { questionBm, questionBi, optionsBm, optionsBi } = await resolveQuizTranslations({ question, options, body: req.body });
    if (req.file) {
      // Convert new image to Base64 — old image was in DB so nothing to delete from disk
      const base64 = req.file.buffer.toString('base64');
      const image_url = `data:${req.file.mimetype};base64,${base64}`;
      await db.query(
        'UPDATE quiz_questions SET question=?,question_bi=?,question_type=?,image_url=?,options=?,options_bi=?,correct_answer=?,timer_seconds=? WHERE id=?',
        [questionBm, questionBi, question_type, image_url, optionsBm, optionsBi, JSON.stringify(correct_answer), timer_seconds || 15, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE quiz_questions SET question=?,question_bi=?,question_type=?,options=?,options_bi=?,correct_answer=?,timer_seconds=? WHERE id=?',
        [questionBm, questionBi, question_type, optionsBm, optionsBi, JSON.stringify(correct_answer), timer_seconds || 15, req.params.id]
      );
    }
    await logActivity(req.admin.id, 'Updated quiz question', `Question ID: ${req.params.id}`);
    res.json({ message: 'Question updated' });
  } catch (err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' }); }
};

const deleteQuestion = async (req, res) => {
  try {
    // Image stored in DB so just delete the row — nothing to clean up on disk
    await db.query('DELETE FROM quiz_questions WHERE id=?', [req.params.id]);
    await logActivity(req.admin.id, 'Deleted quiz question', `Question ID: ${req.params.id}`);
    res.json({ message: 'Question deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getQuizSettings = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM quiz_settings WHERE session_id=?', [req.params.session_id]);
    res.json({ settings: rows[0] || { timer_seconds: 15, question_order: 'shuffle', question_count: 10 } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const saveQuizSettings = async (req, res) => {
  const { session_id, timer_seconds, question_order, question_count, minimum_correct, selected_questions } = req.body;
  const minCorrectVal = (minimum_correct !== undefined && minimum_correct !== null && !isNaN(Number(minimum_correct))) ? Number(minimum_correct) : 8;
  try {
    await db.query(
      `INSERT INTO quiz_settings (session_id, timer_seconds, question_order, question_count, minimum_correct, selected_questions)
VALUES (?,?,?,?,?,?)
ON DUPLICATE KEY UPDATE
         timer_seconds=?, question_order=?, question_count=?, minimum_correct=?, selected_questions=?`,
      [
        session_id, timer_seconds || 15, question_order || 'shuffle', question_count || 10,
        minCorrectVal, JSON.stringify(selected_questions || []),
        timer_seconds || 15, question_order || 'shuffle', question_count || 10,
        minCorrectVal, JSON.stringify(selected_questions || [])
      ]
    );
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { getSessionQuestions, submitQuiz, getLeaderboard, getAllQuestions, addQuestion, updateQuestion, deleteQuestion, getQuizSettings, saveQuizSettings };