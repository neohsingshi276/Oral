const db = require('../db');

const getSessionQuestions = async (req, res) => {
  const { session_id } = req.params;
  try {
    const [settings] = await db.query('SELECT * FROM quiz_settings WHERE session_id = ?', [session_id]);
    const cfg = settings[0] || { timer_seconds: 15, question_order: 'shuffle', question_count: 10, minimum_correct: 0, selected_questions: null };

    let query = 'SELECT id, question, question_type, image_url, options, correct_answer FROM quiz_questions';
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
    const total = answers.length;
    const questionIds = answers.map(a => a.question_id).filter(id => Number.isInteger(id));
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

    let correct = 0;
    for (const ans of answers) {
      const q = questionMap[ans.question_id];
      if (!q) continue;
      const { correct_answer: correctAnswer, question_type: type } = q;

      if (type === 'multiple_choice' || type === 'true_false') {
        if (ans.selected_indexes[0] === correctAnswer[0]) correct++;
      } else if (type === 'multi_select') {
        const sortedCorrect = [...correctAnswer].sort().join(',');
        const sortedAns = [...(ans.selected_indexes || [])].sort().join(',');
        if (sortedCorrect === sortedAns) correct++;
      } else if (type === 'match') {
        const allMatch = correctAnswer.every(pair =>
          ans.selected_indexes.some(p => p[0] === pair[0] && p[1] === pair[1])
        );
        if (allMatch) correct++;
      }
    }

    const score = correct * 100 + Math.max(0, 50 - Math.floor((parseInt(time_taken, 10) || 0) / 10));
    await db.query(
      'INSERT INTO quiz_scores (player_id, session_id, score, correct_answers, total_questions, time_taken) VALUES (?,?,?,?,?,?)',
      [player_id, session_id, score, correct, total, parseInt(time_taken, 10) || 0]
    );

    res.json({ score, correct, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.player_id, s.score, s.correct_answers,
             s.total_questions, s.time_taken, s.completed_at, p.nickname
      FROM quiz_scores s
      JOIN players p ON s.player_id = p.id
      WHERE s.session_id = ?
      ORDER BY s.score DESC
    `, [req.params.session_id]);

    const seen = {};
    const leaderboard = [];
    for (const row of rows) {
      if (!seen[row.player_id]) {
        seen[row.player_id] = true;
        leaderboard.push(row);
      }
    }
    res.json({ leaderboard: leaderboard.slice(0, 20) });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM quiz_questions ORDER BY id');
    const questions = rows.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correct_answer: typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer,
    }));
    res.json({ questions });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// Save image as Base64 into DB — no disk storage (Railway ephemeral filesystem fix)
const addQuestion = async (req, res) => {
  const { question, question_type, options, correct_answer, timer_seconds } = req.body;

  let image_url = null;
  if (req.file) {
    const base64 = req.file.buffer.toString('base64');
    image_url = `data:${req.file.mimetype};base64,${base64}`;
  }

  try {
    const [result] = await db.query(
      'INSERT INTO quiz_questions (question, question_type, image_url, options, correct_answer, timer_seconds) VALUES (?,?,?,?,?,?)',
      [question, question_type, image_url, JSON.stringify(options), JSON.stringify(correct_answer), timer_seconds || 15]
    );
    res.status(201).json({ message: 'Question added', id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateQuestion = async (req, res) => {
  const { question, question_type, options, correct_answer, timer_seconds } = req.body;
  try {
    if (req.file) {
      // Convert new image to Base64 — old image was in DB so nothing to delete from disk
      const base64 = req.file.buffer.toString('base64');
      const image_url = `data:${req.file.mimetype};base64,${base64}`;
      await db.query(
        'UPDATE quiz_questions SET question=?,question_type=?,image_url=?,options=?,correct_answer=?,timer_seconds=? WHERE id=?',
        [question, question_type, image_url, JSON.stringify(options), JSON.stringify(correct_answer), timer_seconds || 15, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE quiz_questions SET question=?,question_type=?,options=?,correct_answer=?,timer_seconds=? WHERE id=?',
        [question, question_type, JSON.stringify(options), JSON.stringify(correct_answer), timer_seconds || 15, req.params.id]
      );
    }
    res.json({ message: 'Question updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const deleteQuestion = async (req, res) => {
  try {
    // Image stored in DB so just delete the row — nothing to clean up on disk
    await db.query('DELETE FROM quiz_questions WHERE id=?', [req.params.id]);
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
  const { session_id, timer_seconds, question_order, question_count } = req.body;
  try {
    await db.query(
      'INSERT INTO quiz_settings (session_id, timer_seconds, question_order, question_count) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE timer_seconds=?, question_order=?, question_count=?',
      [session_id, timer_seconds, question_order, question_count, timer_seconds, question_order, question_count]
    );
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { getSessionQuestions, submitQuiz, getLeaderboard, getAllQuestions, addQuestion, updateQuestion, deleteQuestion, getQuizSettings, saveQuizSettings };
