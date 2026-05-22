// ============================================
// services/translate.service.js
// Auto-translate BM → BI using MyMemory API
// Free tier: 10,000 words/day, no key needed
// Falls back silently to original text on error
// ============================================

const https = require('https');

/**
 * Translate a single string between Bahasa Melayu and English.
 * Returns the original text if translation fails or is empty.
 */
const translateText = (text, from = 'ms', to = 'en') => {
  return new Promise((resolve) => {
    if (!text || !text.trim()) return resolve(text);

    const query = encodeURIComponent(text.trim());
    const url = `https://api.mymemory.translated.net/get?q=${query}&langpair=${from}|${to}`;

    const req = https.get(url, { timeout: 6000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Use responseStatus to detect API failures instead of comparing string casing.
          // The old check (translated !== text.toUpperCase()) incorrectly discards valid
          // all-caps translations like acronyms (e.g. "DNA", "HIV").
          if (parsed?.responseStatus !== 200) {
            return resolve(text);
          }
          const translated = parsed?.responseData?.translatedText;
          if (translated && translated.trim()) {
            resolve(translated.trim());
          } else {
            resolve(text);
          }
        } catch {
          resolve(text);
        }
      });
    });

    req.on('error', () => resolve(text));
    req.on('timeout', () => { req.destroy(); resolve(text); });
  });
};

const translateBmToBi = (text) => translateText(text, 'ms', 'en');
const translateBiToBm = (text) => translateText(text, 'en', 'ms');

/**
 * Translate an array of strings (BM → BI) with a small delay between
 * requests to respect MyMemory rate limits (max ~1 req/sec on free tier).
 */
const translateMany = async (texts, from = 'ms', to = 'en') => {
  const results = [];
  for (let i = 0; i < texts.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 350)); // gentle rate limit
    results.push(await translateText(texts[i], from, to));
  }
  return results;
};

const translateManyBmToBi = (texts) => translateMany(texts, 'ms', 'en');
const translateManyBiToBm = (texts) => translateMany(texts, 'en', 'ms');

/**
 * Translate a JSON options array (strings or {left,right} pairs) BM → BI.
 * Returns stringified JSON ready for DB insertion.
 */
const translateOptions = async (optionsJson, from = 'ms', to = 'en') => {
  try {
    const opts = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
    if (!Array.isArray(opts)) return optionsJson;

    const translated = [];
    for (let i = 0; i < opts.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 350));
      const opt = opts[i];
      if (typeof opt === 'string') {
        translated.push(await translateText(opt, from, to));
      } else if (opt && typeof opt === 'object') {
        // match-type: { left, right }
        const left  = opt.left  ? await translateText(opt.left, from, to)  : opt.left;
        await new Promise(r => setTimeout(r, 350));
        const right = opt.right ? await translateText(opt.right, from, to) : opt.right;
        translated.push({ ...opt, left, right });
      } else {
        translated.push(opt);
      }
    }
    return JSON.stringify(translated);
  } catch {
    return typeof optionsJson === 'string' ? optionsJson : JSON.stringify(optionsJson);
  }
};

const translateOptionsBmToBi = (optionsJson) => translateOptions(optionsJson, 'ms', 'en');
const translateOptionsBiToBm = (optionsJson) => translateOptions(optionsJson, 'en', 'ms');

module.exports = {
  translateText,
  translateBmToBi,
  translateBiToBm,
  translateManyBmToBi,
  translateManyBiToBm,
  translateOptions,
  translateOptionsBmToBi,
  translateOptionsBiToBm
};
