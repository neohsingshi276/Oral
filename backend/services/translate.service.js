// ============================================
// services/translate.service.js
// Auto-translate BM → BI using MyMemory API
// Free tier: 10,000 words/day, no key needed
// Falls back silently to original text on error
// ============================================

const https = require('https');

/**
 * Translate a single string from Bahasa Melayu to English (Bahasa Inggeris).
 * Returns the original text if translation fails or is empty.
 */
const translateBmToBi = (text) => {
  return new Promise((resolve) => {
    if (!text || !text.trim()) return resolve(text);

    const query = encodeURIComponent(text.trim());
    const url = `https://api.mymemory.translated.net/get?q=${query}&langpair=ms|en`;

    const req = https.get(url, { timeout: 6000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const translated = parsed?.responseData?.translatedText;
          // MyMemory returns the original text in ALLCAPS sometimes when it fails
          if (translated && translated.trim() && translated !== text.toUpperCase()) {
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

/**
 * Translate an array of strings (BM → BI) with a small delay between
 * requests to respect MyMemory rate limits (max ~1 req/sec on free tier).
 */
const translateManyBmToBi = async (texts) => {
  const results = [];
  for (let i = 0; i < texts.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 350)); // gentle rate limit
    results.push(await translateBmToBi(texts[i]));
  }
  return results;
};

/**
 * Translate a JSON options array (strings or {left,right} pairs) BM → BI.
 * Returns stringified JSON ready for DB insertion.
 */
const translateOptionsBmToBi = async (optionsJson) => {
  try {
    const opts = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
    if (!Array.isArray(opts)) return optionsJson;

    const translated = [];
    for (let i = 0; i < opts.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 350));
      const opt = opts[i];
      if (typeof opt === 'string') {
        translated.push(await translateBmToBi(opt));
      } else if (opt && typeof opt === 'object') {
        // match-type: { left, right }
        const left  = opt.left  ? await translateBmToBi(opt.left)  : opt.left;
        await new Promise(r => setTimeout(r, 350));
        const right = opt.right ? await translateBmToBi(opt.right) : opt.right;
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

module.exports = { translateBmToBi, translateManyBmToBi, translateOptionsBmToBi };
