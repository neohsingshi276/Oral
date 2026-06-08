import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';


const AdminFAQ = () => {
    const { language } = useLanguage();
    const [faqs, setFaqs] = useState([]);
    const [instructions, setInstructions] = useState([]);
    const [question, setQuestion] = useState('');
    const [questionCategory, setQuestionCategory] = useState('Lain-lain');
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState(null);

    const [showFullGuide, setShowFullGuide] = useState(false);
    const [showAllFAQ, setShowAllFAQ] = useState(false);
    const [expandedAnswers, setExpandedAnswers] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [editingInstruction, setEditingInstruction] = useState(null);
    const [editingFAQ, setEditingFAQ] = useState(null);

    const ANSWER_LIMIT = 180; // characters before truncation

    const CATEGORIES = ['Semua', 'Sesi Permainan', 'Pemain', 'Analitik', 'Akaun', 'Teknikal', 'Lain-lain'];

    const toggleAnswer = (id) =>
        setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));

    const fetchCurrentAdmin = async () => {
        const res = await api.get('/auth/me');
        setAdmin(res.data.admin);
    };

    const fetchFAQ = async () => {
        try {
            const res = await api.get('/faq');
            setFaqs(Array.isArray(res.data) ? res.data : []);
        } finally {
            setLoading(false);
        }
    };

    const fetchInstructions = async () => {
        const res = await api.get('/faq/instructions');
        setInstructions(Array.isArray(res.data) ? res.data : []);
    };

    useEffect(() => {
        fetchCurrentAdmin();
        fetchFAQ();
        fetchInstructions();
    }, []);

    const submitQuestion = async () => {
        if (!question.trim()) return;

        try {
            await api.post('/faq', { question, category: questionCategory });
            setQuestion('');
            setQuestionCategory('Lain-lain');
            fetchFAQ();
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message;
            alert(`Failed to submit question: ${errMsg}`);
        }
    };

    const submitAnswer = async (id) => {
        if (!answers[id]?.trim()) return;

        try {
            await api.put(`/faq/${id}/answer`, { answer: answers[id] });
            setAnswers({ ...answers, [id]: '' });
            fetchFAQ();
        } catch (err) {
            console.error('FAQ answer error:', err);
        }
    };

    const updateInstruction = async () => {
        if (!editingInstruction) return;

        try {
            await api.put(`/faq/instructions/${editingInstruction.id}`, {
                title: editingInstruction.title,
                content: editingInstruction.content,
            });
            setEditingInstruction(null);
            fetchInstructions();
        } catch (err) {
            console.error('Update instruction error:', err);
        }
    };

    const deleteFAQ = async (id) => {
        if (!window.confirm(
            language === 'bi'
                ? 'Delete this FAQ question/answer? This action cannot be undone.'
                : 'Padam soalan/jawapan FAQ ini? Tindakan ini tidak boleh dibatalkan.'
        )) return;

        try {
            await api.delete(`/faq/${id}`);
            fetchFAQ();
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Gagal memadam FAQ';
            alert(errMsg);
        }
    };

    const updateFAQ = async () => {
        if (!editingFAQ) return;

        try {
            await api.put(`/faq/${editingFAQ.id}/edit`, {
                question: editingFAQ.question,
                answer: editingFAQ.answer,
            });
            setEditingFAQ(null);
            fetchFAQ();
        } catch (err) {
            console.error('Update FAQ error:', err);
        }
    };

    const role = admin?.role;
    const canAsk = role === 'admin' || role === 'teacher';
    const canAnswer = role === 'main_admin' || role === 'admin';
    const canDelete = role === 'main_admin';

    const answeredFAQ = faqs.filter((faq) => faq.status === 'answered');
    const pendingFAQ = faqs.filter((faq) => faq.status === 'pending');

    const filteredFAQ = answeredFAQ.filter(faq => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            faq.question?.toLowerCase().includes(q) ||
            faq.answer?.toLowerCase().includes(q);
        const matchesCat = selectedCategory === 'Semua' || faq.category === selectedCategory;
        return matchesSearch && matchesCat;
    });
    const visibleFAQ = showAllFAQ ? filteredFAQ : filteredFAQ.slice(0, 3);

    const guide = instructions[0] || {
        title: 'Panduan Menggunakan Sistem',
        content:
            'Cipta sesi permainan di bahagian Sesi Permainan.\nBerikan kod 4 digit kepada murid.\nPantau kemajuan murid di bahagian Pemain.\nGunakan Analitik untuk melihat prestasi.\nGunakan Sembang Pemain untuk membantu murid.\nRujuk FAQ Dijawab untuk soalan biasa.',
    };

    const guideLines = guide.content.split('\n').filter(Boolean);
    const visibleGuideLines = showFullGuide ? guideLines : guideLines.slice(0, 3);

    return (
        <div>
            <div style={styles.hero}>
                <div>
                    <h2 style={styles.title}>❓ FAQ Sistem</h2>
                    <p style={styles.subtitle}>
                        Pusat panduan dan soalan lazim untuk membantu pentadbir memahami sistem DentalQuest.
                    </p>
                </div>
                <div style={styles.heroIcon}>🦷</div>
            </div>

            <div style={styles.guideCard}>
                <div style={styles.cardHeader}>
                    <div>
                        <h3 style={styles.cardTitle}>📘 {guide.title}</h3>
                        <p style={styles.cardDesc}>Rujukan ringkas untuk pentadbir baharu.</p>
                    </div>

                    {admin?.role === 'main_admin' && instructions[0] && (
                        <button style={styles.secondaryButton} onClick={() => setEditingInstruction(instructions[0])}>
                            Sunting Panduan
                        </button>
                    )}
                </div>

                <ol style={styles.list}>
                    {visibleGuideLines.map((line, index) => (
                        <li key={index}>{line}</li>
                    ))}
                </ol>

                {guideLines.length > 3 && (
                    <button onClick={() => setShowFullGuide(!showFullGuide)} style={styles.linkButton}>
                        {showFullGuide ? 'Tunjuk Ringkas ↑' : 'Tunjuk Lagi ↓'}
                    </button>
                )}
            </div>

            {canAnswer && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>📌 Soalan Menunggu Jawapan</h3>

                    {pendingFAQ.length === 0 && <p style={styles.empty}>Tiada soalan menunggu jawapan.</p>}

                    {pendingFAQ.map((item) => (
                        <div key={item.id} style={styles.pendingCard}>
                            <h4 style={styles.question}>{item.question}</h4>
                            <p style={styles.meta}>Ditanya oleh: {item.asked_by_name || 'Admin'}</p>

                            <textarea
                                value={answers[item.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [item.id]: e.target.value })}
                                placeholder="Tulis jawapan..."
                                style={styles.textarea}
                            />

                            <div style={styles.actionRow}>
                                <button onClick={() => submitAnswer(item.id)} style={styles.button}>
                                    Jawab Soalan
                                </button>
                                {canDelete && (
                                    <button onClick={() => deleteFAQ(item.id)} style={styles.dangerButton}>
                                        Padam
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>✅ FAQ Dijawab</h3>
                    <span style={styles.badge}>{filteredFAQ.length} / {answeredFAQ.length} soalan</span>
                </div>

                {/* Search bar */}
                <input
                    type="text"
                    placeholder="🔍 Cari soalan atau jawapan..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowAllFAQ(false); }}
                    style={{ ...styles.input, marginBottom: '0.75rem', fontSize: '0.9rem' }}
                />

                {/* Category pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setShowAllFAQ(false); }}
                            style={{
                                padding: '0.3rem 0.85rem',
                                borderRadius: '999px',
                                border: '1px solid',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                borderColor: selectedCategory === cat ? '#2563eb' : '#cbd5e1',
                                background: selectedCategory === cat ? '#2563eb' : '#fff',
                                color: selectedCategory === cat ? '#fff' : '#475569',
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {loading && <p>Memuatkan...</p>}
                {!loading && answeredFAQ.length === 0 && <p style={styles.empty}>Belum ada FAQ dijawab.</p>}
                {!loading && answeredFAQ.length > 0 && filteredFAQ.length === 0 && (
                    <p style={styles.empty}>Tiada FAQ sepadan dengan carian atau kategori ini.</p>
                )}

                <div style={styles.faqGrid}>
                    {visibleFAQ.map((item) => {
                        const isLong = (item.answer || '').length > ANSWER_LIMIT;
                        const isExpanded = expandedAnswers[item.id];
                        const displayAnswer = isLong && !isExpanded
                            ? item.answer.slice(0, ANSWER_LIMIT) + '…'
                            : item.answer;

                        return (
                            <div key={item.id} style={styles.faqCard}>
                                {item.category && item.category !== 'Lain-lain' && (
                                    <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: '700', background: '#EFF6FF', color: '#1d4ed8', padding: '0.15rem 0.6rem', borderRadius: '999px', marginBottom: '0.5rem' }}>
                                        {item.category}
                                    </span>
                                )}
                                <h4 style={styles.question}>{item.question}</h4>
                                <p style={styles.answer}>{displayAnswer}</p>
                                {isLong && (
                                    <button onClick={() => toggleAnswer(item.id)} style={styles.linkButton}>
                                        {isExpanded
                                            ? (language === 'bi' ? 'Show Less ↑' : 'Tunjuk Kurang ↑')
                                            : (language === 'bi' ? 'Show More ↓' : 'Tunjuk Lagi ↓')
                                        }
                                    </button>
                                )}

                                <p style={styles.meta}>
                                    {language === 'bi' ? 'Asked by:' : 'Ditanya oleh:'} {item.asked_by_name || 'Admin'} <br />
                                    {language === 'bi' ? 'Answered by:' : 'Dijawab oleh:'} {item.answered_by_name || 'Main Admin'}
                                </p>

                                {canDelete && (
                                    <div style={styles.actionRow}>
                                        <button style={styles.secondaryButton} onClick={() => setEditingFAQ(item)}>
                                            Edit Answer
                                        </button>
                                        <button onClick={() => deleteFAQ(item.id)} style={styles.dangerButton}>
                                            Padam
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filteredFAQ.length > 3 && (
                    <button onClick={() => setShowAllFAQ(!showAllFAQ)} style={styles.showButton}>
                        {showAllFAQ
                            ? (language === 'bi' ? 'Show Less ↑' : 'Tunjuk Kurang ↑')
                            : (language === 'bi'
                                ? `Show More ${filteredFAQ.length - 3} FAQ ↓`
                                : `Tunjuk Lagi ${filteredFAQ.length - 3} FAQ ↓`
                            )
                        }
                    </button>
                )}
            </div>

            {canAsk && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        {role === 'teacher' ? '💬 Tanya Pentadbir' : '💬 Tanya Soalan Baharu'}
                    </h3>

                    <div style={styles.askCard}>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Tulis soalan anda di sini..."
                            style={styles.textarea}
                        />
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                                Kategori
                            </label>
                            <select
                                value={questionCategory}
                                onChange={e => setQuestionCategory(e.target.value)}
                                style={{ ...styles.input, marginBottom: 0, padding: '0.6rem 0.9rem', cursor: 'pointer' }}
                            >
                                {CATEGORIES.filter(c => c !== 'Semua').map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={submitQuestion} style={styles.button}>
                            Hantar Soalan
                        </button>
                    </div>
                </div>
            )}

            {editingInstruction && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3>Edit Panduan</h3>

                        <input
                            value={editingInstruction.title}
                            onChange={(e) =>
                                setEditingInstruction({ ...editingInstruction, title: e.target.value })
                            }
                            style={styles.input}
                        />

                        <textarea
                            value={editingInstruction.content}
                            onChange={(e) =>
                                setEditingInstruction({ ...editingInstruction, content: e.target.value })
                            }
                            style={styles.textarea}
                        />

                        <button onClick={updateInstruction} style={styles.button}>Simpan</button>
                        <button onClick={() => setEditingInstruction(null)} style={styles.secondaryButton}>Batal</button>
                    </div>
                </div>
            )}

            {editingFAQ && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3>Edit FAQ Dijawab</h3>

                        <input
                            value={editingFAQ.question}
                            readOnly
                            style={{
                                ...styles.input,
                                background: '#f1f5f9',
                                cursor: 'not-allowed',
                                color: '#64748b'
                            }}
                        />

                        <textarea
                            value={editingFAQ.answer}
                            onChange={(e) => setEditingFAQ({ ...editingFAQ, answer: e.target.value })}
                            style={styles.textarea}
                        />

                        <button onClick={updateFAQ} style={styles.button}>Simpan</button>
                        <button onClick={() => setEditingFAQ(null)} style={styles.secondaryButton}>Batal</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    hero: { background: 'linear-gradient(135deg, #01306B, #1d4ed8)', padding: '1.8rem', borderRadius: '22px', marginBottom: '1.5rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 24px rgba(1,48,107,0.22)' },
    heroIcon: { fontSize: '4rem', opacity: 0.28 },
    title: { color: '#FFD700', fontSize: '1.9rem', fontWeight: '900', margin: 0 },
    subtitle: { color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', marginBottom: 0, maxWidth: '650px', lineHeight: 1.6 },
    section: { marginTop: '2rem' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    sectionTitle: { marginBottom: '1rem', color: '#01306B', fontSize: '1.2rem', fontWeight: '900' },
    badge: { background: '#EFF6FF', color: '#01306B', padding: '0.45rem 0.8rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '800' },
    guideCard: { background: 'linear-gradient(180deg, #ffffff, #FFF9F0)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(212,168,67,0.28)', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.7rem' },
    cardTitle: { color: '#01306B', margin: 0, fontWeight: '900' },
    cardDesc: { color: '#64748b', margin: '0.35rem 0 0', fontSize: '0.9rem' },
    list: { color: '#334155', lineHeight: '1.9', paddingLeft: '1.3rem', marginBottom: '0.5rem' },
    faqGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' },
    faqCard: { background: '#fff', padding: '1.4rem', borderRadius: '18px', border: '1px solid rgba(212,168,67,0.18)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    pendingCard: { background: '#FFFBEB', padding: '1.4rem', borderRadius: '18px', marginBottom: '1rem', border: '1px solid rgba(212,168,67,0.35)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    askCard: { background: '#F8FAFC', padding: '1.5rem', borderRadius: '18px', border: '1px dashed #94a3b8' },
    question: { color: '#01306B', fontWeight: '900', marginBottom: '0.45rem' },
    answer: { color: '#334155', lineHeight: '1.6', marginBottom: '0.75rem' },
    textarea: { width: '100%', minHeight: '95px', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontFamily: 'inherit', resize: 'vertical', marginBottom: '1rem', boxSizing: 'border-box', outlineColor: '#2563eb' },
    input: { width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1rem', boxSizing: 'border-box' },
    button: { background: 'linear-gradient(135deg, #2563eb, #01306B)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 10px rgba(37,99,235,0.25)', marginRight: '0.5rem' },
    secondaryButton: { background: '#FFFFFF', color: '#01306B', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', marginTop: '0.75rem' },
    actionRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' },
    dangerButton: { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' },
    linkButton: { background: 'transparent', color: '#2563eb', border: 'none', cursor: 'pointer', fontWeight: '900', padding: '0.4rem 0' },
    showButton: { marginTop: '1rem', background: '#01306B', color: '#fff', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '999px', cursor: 'pointer', fontWeight: '900' },
    meta: { color: '#94a3b8', fontSize: '14px', marginBottom: '0.75rem', lineHeight: 1.5 },
    empty: { color: '#94a3b8', background: '#fff', padding: '1rem', borderRadius: '12px' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
    modal: { background: '#fff', padding: '2rem', borderRadius: '20px', width: '500px', maxWidth: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
};

export default AdminFAQ;