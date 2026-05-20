const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');

const LANG_MAP = {
  bm: 'ms',
  ms: 'ms',
  malay: 'ms',
  bi: 'en',
  en: 'en',
  english: 'en',
};

const normalizeLang = (lang, fallback = 'ms') => {
  const key = String(lang || '').trim().toLowerCase();
  return LANG_MAP[key] || fallback;
};

const hashText = (text) =>
  crypto.createHash('sha256').update(text, 'utf8').digest('hex');

const translateViaMyMemory = async (text, sourceLang, targetLang) => {
  const { data } = await axios.get('https://api.mymemory.translated.net/get', {
    params: {
      q: text,
      langpair: `${sourceLang}|${targetLang}`,
    },
    timeout: 8000,
  });

  return data?.responseData?.translatedText?.trim() || text;
};

const getCachedTranslation = async (sourceLang, targetLang, sourceHash) => {
  const [rows] = await db.query(
    `SELECT translated_text
     FROM content_translations
     WHERE source_lang = ? AND target_lang = ? AND source_hash = ?
     LIMIT 1`,
    [sourceLang, targetLang, sourceHash]
  );

  return rows[0]?.translated_text || null;
};

const saveTranslation = async (sourceLang, targetLang, sourceHash, sourceText, translatedText) => {
  await db.query(
    `INSERT INTO content_translations
      (source_lang, target_lang, source_hash, source_text, translated_text, provider)
     VALUES (?, ?, ?, ?, ?, 'mymemory')
     ON DUPLICATE KEY UPDATE
      source_text = VALUES(source_text),
      translated_text = VALUES(translated_text),
      provider = VALUES(provider)`,
    [sourceLang, targetLang, sourceHash, sourceText, translatedText]
  );
};

const translateOne = async (value, options = {}) => {
  if (typeof value !== 'string') return value;

  const text = value.trim();
  if (!text) return value;

  const sourceLang = normalizeLang(options.sourceLang, 'ms');
  const targetLang = normalizeLang(options.targetLang, 'en');
  if (sourceLang === targetLang) return value;

  const sourceHash = hashText(text);
  const cached = await getCachedTranslation(sourceLang, targetLang, sourceHash);
  if (cached) return cached;

  try {
    const translated = await translateViaMyMemory(text, sourceLang, targetLang);
    if (translated) {
      await saveTranslation(sourceLang, targetLang, sourceHash, text, translated);
      return translated;
    }
  } catch (err) {
    console.warn('Translation provider failed:', err.message);
  }

  return value;
};

const translateMany = async (texts, options = {}) => {
  const uniqueTexts = [...new Set(texts.filter(text => typeof text === 'string' && text.trim()))];
  const translations = {};

  for (const text of uniqueTexts) {
    translations[text] = await translateOne(text, options);
  }

  return translations;
};

module.exports = {
  normalizeLang,
  translateMany,
  translateOne,
};
