import api from './api';

const SKIP_KEYS = new Set([
  'id',
  'author',
  'created_at',
  'updated_at',
  'youtube_url',
  'image_url',
  'order_num',
  'question_type',
  'correct_answer',
  'timer_seconds',
  'answer_index_map',
  'match_left_map',
  'match_right_map',
  'word',
  'direction',
  'start_row',
  'start_col',
]);

const cache = new Map();

const normalizeTarget = (language) => (language === 'bi' || language === 'en' ? 'bi' : 'bm');

export const collectTranslatableStrings = (value, output = []) => {
  if (typeof value === 'string') {
    if (value.trim()) output.push(value);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectTranslatableStrings(item, output));
    return output;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (!SKIP_KEYS.has(key)) collectTranslatableStrings(item, output);
    });
  }

  return output;
};

export const applyTranslations = (value, translations = {}) => {
  if (typeof value === 'string') return translations[value] || value;
  if (Array.isArray(value)) return value.map(item => applyTranslations(item, translations));

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SKIP_KEYS.has(key) ? item : applyTranslations(item, translations),
      ])
    );
  }

  return value;
};

export const translateContentValue = async (value, language) => {
  const target = normalizeTarget(language);
  if (target === 'bm') return value;

  const texts = [...new Set(collectTranslatableStrings(value))];
  if (!texts.length) return value;

  const missing = texts.filter(text => !cache.has(`${target}:${text}`));

  if (missing.length) {
    const { data } = await api.post('/translate/content', {
      texts: missing,
      sourceLang: 'bm',
      targetLang: target,
    });

    Object.entries(data.translations || {}).forEach(([source, translated]) => {
      cache.set(`${target}:${source}`, translated);
    });
  }

  const translations = {};
  texts.forEach(text => {
    translations[text] = cache.get(`${target}:${text}`) || text;
  });

  return applyTranslations(value, translations);
};
