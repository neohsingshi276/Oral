import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
];

const ManageSessions = () => {
  const { admin } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [words, setWords] = useState([]);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState('');
  const [teacherHierarchy, setTeacherHierarchy] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);

  // Edit mode tracking
  const [editId, setEditId] = useState(null);
  const [step, setStep] = useState(1);

  const defaultForm = {
    session_name: '',
    session_month: new Date().getMonth() + 1,
    q_mode: 'random', q_timer: 15, q_order: 'shuffle', q_count: 10, q_min: 0, q_selected: [],
    cw_mode: 'random', cw_count: 8, cw_selected: [], cw_min: 0,
    cp3_timer: 60, cp3_min: 0
  };

  const [form, setForm] = useState(defaultForm);

  const fetchSessions = () => api.get('/sessions').then(res => setSessions(res.data.sessions));
  const fetchTeacherSessions = () => api.get('/sessions/teacher-sessions').then(res => setTeacherHierarchy(res.data.hierarchy || []));
  const fetchQuestions = () => api.get('/quiz/admin/questions').then(res => setQuestions(res.data.questions));
  const fetchWords = () => api.get('/crossword/admin').then(res => setWords(res.data.words));

  useEffect(() => { fetchSessions(); fetchTeacherSessions(); fetchQuestions(); fetchWords(); }, []);

  // LOAD EXISTING SETTINGS INTO THE WIZARD
  const handleEdit = (session) => {
    setEditId(session.id);

    // Safely parse JSON arrays from DB if they are stored as strings
    const parseArr = (val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return val;
    };

    const qs = session.quiz_settings || {};
    const cs = session.crossword_settings || {};
    const cp3 = session.cp3_settings || {};

    const qSel = parseArr(qs.selected_questions);
    const cwSel = parseArr(cs.selected_words);

    setForm({
      session_name: session.session_name || '',
      session_month: session.session_month || session.month || new Date(session.created_at).getMonth() + 1,
      q_mode: qSel.length > 0 ? 'manual' : 'random',
      q_timer: qs.timer_seconds || 15,
      q_order: qs.question_order || 'shuffle',
      q_count: qs.question_count || 10,
      q_min: qs.minimum_correct || 0,
      q_selected: qSel,

      cw_mode: cwSel.length > 0 ? 'manual' : 'random',
      cw_count: cs.word_count || 8,
      cw_selected: cwSel,
      cw_min: cs.minimum_correct || 0,

      cp3_timer: cp3.timer_seconds || 60,
      cp3_min: cp3.target_score || 0
    });

    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm(defaultForm);
    setStep(1);
    setMsg('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (step < 4) { setStep(step + 1); return; } // Go to next page

    // Basic Validation Check against Database Limits before submitting
    if (form.q_mode === 'random' && form.q_count > questions.length) { setStep(2); return setMsg('❌ Quiz: Requested questions exceeds database limit!'); }
    if (form.cw_mode === 'random' && form.cw_count > words.length) { setStep(3); return setMsg('❌ Crossword: Requested words exceeds database limit!'); }

    try {
      const payload = {
        session_name: form.session_name,
        session_month: form.session_month,
        quiz_settings: {
          timer_seconds: form.q_timer,
          question_order: form.q_order,
          question_count: form.q_mode === 'manual' ? form.q_selected.length : form.q_count,
          minimum_correct: form.q_min,
          selected_questions: form.q_mode === 'manual' ? form.q_selected : null
        },
        crossword_settings: {
          word_count: form.cw_mode === 'manual' ? form.cw_selected.length : form.cw_count,
          selected_words: form.cw_mode === 'manual' ? form.cw_selected : null,
          minimum_correct: form.cw_min
        },
        cp3_settings: { timer_seconds: form.cp3_timer, target_score: form.cp3_min }
      };

      if (editId) {
        await api.put(`/sessions/${editId}`, payload);
        setMsg(`✅ ${t('admin.sessionSaved')}`);
      } else {
        await api.post('/sessions', payload);
        setMsg(`✅ ${t('admin.sessionCreated')}`);
      }

      setForm(defaultForm);
      setStep(1);
      setEditId(null);
      fetchSessions();
      fetchTeacherSessions();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Failed')); }
    setTimeout(() => setMsg(''), 4000);
  };

  const handleToggle = async (id, is_active) => { await api.put(`/sessions/${id}`, { is_active: !is_active }); fetchSessions(); };
  const handleDelete = async (id) => { if (!confirm('Delete this session?')) return; await api.delete(`/sessions/${id}`); fetchSessions(); fetchTeacherSessions(); };
  const copyCode = (code) => { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 2000); };

  const toggleQ = (id) => {
    const sel = form.q_selected.includes(id) ? form.q_selected.filter(i => i !== id) : [...form.q_selected, id];
    setForm({ ...form, q_selected: sel });
  };
  const toggleW = (id) => {
    const sel = form.cw_selected.includes(id) ? form.cw_selected.filter(i => i !== id) : [...form.cw_selected, id];
    setForm({ ...form, cw_selected: sel });
  };

  // DYNAMIC OPTIONS FACTORY - only returns options that are <= the database max size
  const getDynamicOptions = (arr, maxLimit) => arr.filter(o => o.value <= maxLimit);

  // FIXED Reusable Dropdown Component with RED ERROR MESSAGES
  const SelectOrCustom = ({ options = [], value, onChange, label, min, max }) => {
    const isCustom = value === '' || !options.some(o => o.value === value);

    // Calculate Error
    let errorMsg = '';
    if (value !== '') {
      if (min !== undefined && value < min) errorMsg = `⚠️ Minima ialah ${min}`;
      if (max !== undefined && value > max) errorMsg = `⚠️ Maxima ialah ${max} (based on database)`;
    }

    return (
      <div style={s.field}>
        <label style={s.label}>{label}</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            style={{ ...s.input, width: isCustom ? '40%' : '100%', borderColor: errorMsg ? '#e11d48' : '#cbd5e1' }}
            value={isCustom ? 'custom' : value}
            onChange={(e) => {
              if (e.target.value === 'custom') onChange('');
              else onChange(Number(e.target.value));
            }}
          >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            <option value="custom">✍️ {t('admin.custom')}</option>
          </select>
          {isCustom && (
            <input
              type="number" style={{ ...s.input, width: '60%', borderColor: errorMsg ? '#e11d48' : '#cbd5e1' }}
              value={value}
              onChange={e => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              onKeyDown={e => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
              placeholder={max ? `Max: ${max}` : `Min: ${min}`}
              step="1"
              min={min}
              max={max}
              autoFocus required
            />
          )}
        </div>
        {errorMsg && <div style={{ color: '#e11d48', fontSize: '0.8rem', marginTop: '4px', fontWeight: '600' }}>{errorMsg}</div>}
      </div>
    );
  };

  return (
    <div>
      {/* ─── WIZARD FORM ─── */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={s.cardTitle}>{editId ? `✏️ ${t('admin.editSessionSettings')}` : `➕ ${t('admin.createGameSession')}`}</h2>
          {editId && <button type="button" onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: '#e11d48', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>❌ {t('admin.cancelEdit')}</button>}
        </div>
        <p style={s.hint}>{editId ? t('admin.editSessionHint') : t('admin.createSessionHint')} {t('admin.stepOf')} {step} {t('admin.of')} 4</p>

        {/* Progress Bar */}
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${(step / 4) * 100}%` }}></div>
        </div>

        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}

        <form onSubmit={handleCreate}>

          {/* STEP 1: GENERAL */}
          {step === 1 && (
            <div style={s.stepContent}>
              <h3 style={s.secTitle}>{t('admin.step1Info')}</h3>
              <div style={s.field}>
                <label style={s.label}>{t('admin.sessionName')}</label>
                <input style={s.input} value={form.session_name} onChange={e => setForm({ ...form, session_name: e.target.value })} required placeholder="e.g. Class 5A — March 2026" maxLength={80} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Bulan Sesi</label>
                <select style={s.input} value={form.session_month} onChange={e => setForm({ ...form, session_month: Number(e.target.value) })}>
                  {MONTHS.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: QUIZ */}
          {step === 2 && (
            <div style={s.stepContent}>
              <h3 style={s.secTitle}>{t('admin.step2Quiz')}</h3>

              <div style={s.field}>
                <label style={s.label}>{t('admin.chooseQuestions')}</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
                    <input type="radio" value="random" checked={form.q_mode === 'random'} onChange={e => setForm({ ...form, q_mode: e.target.value })} /> 🎲 {t('admin.randomBySystem')}
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
                    <input type="radio" value="manual" checked={form.q_mode === 'manual'} onChange={e => setForm({ ...form, q_mode: e.target.value })} /> ✍️ {t('admin.pickManually')}
                  </label>
                </div>
              </div>

              <div style={s.gridRow}>
                <SelectOrCustom label={t('admin.timePerQuestion')} value={form.q_timer} onChange={v => setForm({ ...form, q_timer: v })} min={5} max={120}
                  options={[{ value: 10, label: '10 Saat' }, { value: 15, label: '15 Saat' }, { value: 30, label: '30 Saat' }]} />

                {form.q_mode === 'random' && (
                  <SelectOrCustom label={t('admin.questionsToPick')} value={form.q_count} onChange={v => setForm({ ...form, q_count: v })} min={1} max={questions.length}
                    options={getDynamicOptions([5, 10, 15].map(value => ({ value, label: `${value} ${t('admin.questions')}` })), questions.length)} />
                )}

                <SelectOrCustom label={t('admin.minimumToPass')} value={form.q_min} onChange={v => setForm({ ...form, q_min: v })} min={0} max={form.q_mode === 'random' ? form.q_count : form.q_selected.length || questions.length}
                  options={[{ value: 0, label: `0 (${t('admin.noMinimum')})` }, { value: 5, label: `5 ${t('admin.correct')}` }, { value: 8, label: `8 ${t('admin.correct')}` }]} />
              </div>

              {form.q_mode === 'manual' && (
                <div style={s.largeSelectionBox}>
                  <h4 style={s.largeBoxTitle}>{t('admin.pickSpecificQuestions')}</h4>
                  <p style={s.largeBoxSubtitle}>{t('admin.selectedQuestions')} <strong>{form.q_selected.length}</strong> {t('admin.questions')}.</p>
                  <div style={s.tallScrollBox}>
                    {questions.map(q => (
                      <label key={q.id} style={s.checkRowWide}><input type="checkbox" checked={form.q_selected.includes(q.id)} onChange={() => toggleQ(q.id)} /> <span style={{ fontWeight: '500' }}>[{q.question_type}]</span> {q.question}</label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CROSSWORD */}
          {step === 3 && (
            <div style={s.stepContent}>
              <h3 style={s.secTitle}>{t('admin.step3Crossword')}</h3>

              <div style={s.field}>
                <label style={s.label}>{t('admin.chooseWords')}</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
                    <input type="radio" value="random" checked={form.cw_mode === 'random'} onChange={e => setForm({ ...form, cw_mode: e.target.value })} /> 🎲 {t('admin.randomBySystem')}
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
                    <input type="radio" value="manual" checked={form.cw_mode === 'manual'} onChange={e => setForm({ ...form, cw_mode: e.target.value })} /> ✍️ {t('admin.pickManually')}
                  </label>
                </div>
              </div>

              {form.cw_mode === 'random' && (
                <div style={{ maxWidth: '600px' }}>
                  <SelectOrCustom label={t('admin.wordsToPick')} value={form.cw_count} onChange={v => setForm({ ...form, cw_count: v })} min={3} max={words.length}
                    options={getDynamicOptions([5, 8, 10].map(value => ({ value, label: `${value} ${t('admin.words')}` })), words.length)} />
                </div>
              )}

              <div style={{ maxWidth: '600px' }}>
                <SelectOrCustom label={t('admin.minimumToPass')} value={form.cw_min} onChange={v => setForm({ ...form, cw_min: v })} min={0} max={form.cw_mode === 'random' ? form.cw_count : form.cw_selected.length || words.length}
                  options={[{ value: 0, label: `0 (${t('admin.noMinimum')})` }, { value: 3, label: `3 ${t('admin.words')}` }, { value: 5, label: `5 ${t('admin.words')}` }]} />
              </div>

              {form.cw_mode === 'manual' && (
                <div style={s.largeSelectionBox}>
                  <h4 style={s.largeBoxTitle}>{t('admin.pickSpecificWords')}</h4>
                  <p style={s.largeBoxSubtitle}>{t('admin.selectedWords')} <strong>{form.cw_selected.length}</strong> {t('admin.words')}. {t('admin.minimumRequired')}</p>
                  <div style={s.tallScrollBox}>
                    {words.map(w => (
                      <label key={w.id} style={s.checkRowWide}><input type="checkbox" checked={form.cw_selected.includes(w.id)} onChange={() => toggleW(w.id)} /> <strong>{w.word}</strong> — {w.clue}</label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CP3 */}
          {step === 4 && (
            <div style={s.stepContent}>
              <h3 style={s.secTitle}>{t('admin.step4Food')}</h3>
              <div style={s.gridRow}>
                <SelectOrCustom label={t('admin.gameTime')} value={form.cp3_timer} onChange={v => setForm({ ...form, cp3_timer: v })} options={[45, 60, 90].map(value => ({ value, label: `${value} ${t('admin.seconds')}` }))} min={10} max={600} />
                <SelectOrCustom label={t('admin.targetScore')} value={form.cp3_min} onChange={v => setForm({ ...form, cp3_min: v })} options={[{ value: 0, label: `0 (${t('admin.noMinimum')})` }, { value: 500, label: `500 ${t('admin.points')}` }, { value: 1000, label: `1000 ${t('admin.points')}` }]} min={0} max={5000} />
              </div>
            </div>
          )}

          <div style={s.wizardFooter}>
            {step > 1 && <button type="button" style={s.btnSecondary} onClick={() => setStep(step - 1)}>⬅️ {t('admin.back')}</button>}
            <div style={{ flex: 1 }}></div>
            <button style={s.btnPrimary} type="submit">{step === 4 ? (editId ? `💾 ${t('admin.saveChanges')}` : `🚀 ${t('admin.createFinalSession')}`) : `${t('admin.nextStep')} ➡️`}</button>
          </div>
        </form>
      </div>

      {/* ─── ACTIVE SESSIONS LIST ─── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Paparan Sesi Guru</h2>
        {teacherHierarchy.length === 0 ? <p style={s.muted}>{t('admin.noSessionsYet')}</p> : (
          <div style={s.hierarchyList}>
            {teacherHierarchy.map(school => (
              <div key={school.school} style={s.schoolBlock}>
                <div style={s.schoolTitle}>{school.school}</div>
                {school.teachers.map(teacher => (
                  <div key={teacher.teacher_id} style={s.teacherBlock}>
                    <div style={s.teacherName}>{teacher.teacher_name}</div>
                    <div style={s.monthGrid}>
                      {teacher.months.map(monthGroup => (
                        <div key={`${teacher.teacher_id}-${monthGroup.month}`} style={s.monthBlock}>
                          <div style={s.monthTitle}>{MONTHS[monthGroup.month - 1]} Session</div>
                          {monthGroup.sessions.map(session => (
                            <div key={session.id} style={s.compactSession}>
                              <button type="button" style={s.monthSessionBtn} onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                                {session.session_name}
                              </button>
                              <div style={s.compactCode}>
                                <span>Kod Permainan</span>
                                <strong>{session.unique_token}</strong>
                                <button type="button" style={s.smallCopy} onClick={() => copyCode(session.unique_token)}>
                                  {copied === session.unique_token ? 'Disalin' : 'Salin'}
                                </button>
                              </div>
                              {expandedSession === session.id && (
                                <div style={s.studentList}>
                                  {session.players.length === 0 ? <div style={s.emptyMini}>Tiada pemain lagi</div> : session.players.map(player => (
                                    <div key={player.id} style={s.studentRow}>
                                      <strong>{player.nickname}</strong>
                                      <span>{[player.cp1_completed, player.cp2_completed, player.cp3_completed].filter(Boolean).length}/3 CP</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>🎮 {t('admin.activeSessions')} ({sessions.length})</h2>
        <div style={s.sessionList}>
          {sessions.map(session => (
            <div key={session.id} style={s.sessionCard}>
              <div style={s.sessionTop}>
                <div>
                  <h3 style={s.sessionName}>{session.session_name}</h3>
                  <div style={s.sessionMonth}>{MONTHS[(session.session_month || session.month || new Date(session.created_at).getMonth() + 1) - 1]} Session</div>
                </div>
                <span style={session.is_active ? s.badgeActive : s.badgeInactive}>{session.is_active ? `🟢 ${t('admin.active')}` : `🔴 ${t('admin.inactive')}`}</span>
              </div>
              <div style={s.codeWrap}>
                <p style={s.codeLabel}>{t('admin.studentGameCode')}</p>
                <div style={s.codeBox}>{session.unique_token.split('').map((digit, i) => (<div key={i} style={s.codeDigit}>{digit}</div>))}</div>
                <button style={copied === session.unique_token ? s.btnCopied : s.btnCopy} onClick={() => copyCode(session.unique_token)}>{copied === session.unique_token ? `✅ ${t('admin.copied')}` : `📋 ${t('admin.copyCode')}`}</button>
              </div>
              <div style={s.sessionActions}>
                <button style={s.btnEdit} onClick={() => handleEdit(session)}>✏️ {t('admin.editSettings')}</button>
                {(admin?.role === 'main_admin' || admin?.role === 'admin') && (
                  <button style={session.is_active ? s.btnDeactivate : s.btnActivate} onClick={() => handleToggle(session.id, session.is_active)}>
                    {session.is_active ? t('admin.deactivate') : t('admin.activate')}
                  </button>
                )}
                <button style={s.btnDelete} onClick={() => handleDelete(session.id)}>🗑️ {t('admin.delete')}</button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p style={s.muted}>{t('admin.noSessionsYet')}</p>}
        </div>
      </div>
    </div>
  );
};

const s = {
  card: { background: '#fff', borderRadius: '16px', padding: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: 0 },
  secTitle: { fontSize: '1.1rem', color: '#2563eb', marginBottom: '1rem' },
  hint: { color: '#64748b', fontSize: '0.88rem', margin: '0 0 1rem' },

  progressBar: { width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem' },
  progressFill: { height: '100%', background: '#2563eb', transition: 'width 0.3s ease' },

  stepContent: { minHeight: '200px', animation: 'fadeIn 0.3s' },
  wizardFooter: { display: 'flex', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' },

  gridRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1e293b' },

  largeSelectionBox: { background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '0.5rem' },
  largeBoxTitle: { margin: '0 0 0.25rem', color: '#1e3a5f', fontSize: '1rem' },
  largeBoxSubtitle: { fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', margin: '0 0 1rem' },
  tallScrollBox: { height: '280px', overflowY: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem' },
  checkRowWide: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.95rem', color: '#334155', padding: '0.6rem 0.5rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },

  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' },
  btnSecondary: { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' },

  success: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  error: { background: '#fff1f2', color: '#e11d48', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  sessionList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  hierarchyList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  schoolBlock: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#f8fafc' },
  schoolTitle: { fontWeight: '800', color: '#01306B', marginBottom: '0.75rem', fontSize: '1rem' },
  teacherBlock: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem', marginTop: '0.75rem' },
  teacherName: { fontWeight: '700', color: '#1e3a5f', marginBottom: '0.75rem' },
  monthGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' },
  monthBlock: { border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', background: '#fafafa' },
  monthTitle: { fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem' },
  compactSession: { background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '0.6rem', marginTop: '0.5rem' },
  monthSessionBtn: { width: '100%', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '7px', padding: '0.45rem 0.6rem', fontWeight: '700', cursor: 'pointer', textAlign: 'left' },
  compactCode: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748b' },
  smallCopy: { background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '6px', padding: '0.25rem 0.5rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.72rem' },
  studentList: { marginTop: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' },
  studentRow: { display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0', fontSize: '0.82rem', color: '#334155' },
  emptyMini: { color: '#94a3b8', fontSize: '0.8rem', padding: '0.35rem 0' },
  sessionCard: { border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' },
  sessionTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' },
  sessionName: { fontSize: '1rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.25rem' },
  sessionMonth: { color: '#64748b', fontSize: '0.78rem', fontWeight: '700' },
  badgeActive: { background: '#f0fdf4', color: '#16a34a', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' },
  badgeInactive: { background: '#fff1f2', color: '#e11d48', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' },
  codeWrap: { background: '#f8fafc', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  codeLabel: { color: '#475569', fontSize: '0.85rem', fontWeight: '600', margin: 0 },
  codeBox: { display: 'flex', gap: '0.5rem' },
  codeDigit: { width: '44px', height: '52px', background: '#1e3a5f', color: '#FFD700', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: '900' },
  btnCopy: { background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  btnCopied: { background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  sessionActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  btnEdit: { background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  btnActivate: { background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  btnDeactivate: { background: '#fff7ed', color: '#ea580c', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  muted: { color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' },
};

export default ManageSessions;
