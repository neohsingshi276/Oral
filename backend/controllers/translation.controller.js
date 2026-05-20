const { normalizeLang, translateMany } = require('../services/translation.service');

const MAX_TEXTS = 100;
const MAX_TEXT_LENGTH = 2000;

const translateContent = async (req, res) => {
  try {
    const { texts, sourceLang = 'bm', targetLang = 'bi' } = req.body || {};
    const source = normalizeLang(sourceLang, 'ms');
    const target = normalizeLang(targetLang, 'en');
    const list = Array.isArray(texts) ? texts : [texts];

    if (!['ms', 'en'].includes(source) || !['ms', 'en'].includes(target)) {
      return res.status(400).json({ error: 'Unsupported language pair' });
    }

    const cleanTexts = list
      .filter(text => typeof text === 'string' && text.trim())
      .slice(0, MAX_TEXTS)
      .map(text => text.slice(0, MAX_TEXT_LENGTH));

    if (!cleanTexts.length) {
      return res.json({ translations: {} });
    }

    const translations = await translateMany(cleanTexts, {
      sourceLang: source,
      targetLang: target,
    });

    res.json({ translations });
  } catch (err) {
    console.error('Translate content error:', err);
    res.status(500).json({ error: 'Failed to translate content' });
  }
};

module.exports = { translateContent };
