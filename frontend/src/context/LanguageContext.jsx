import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { exactTextTranslations, translations } from './translations';

const LanguageContext = createContext();

const reverseExactTextTranslations = Object.fromEntries(
  Object.entries(exactTextTranslations).map(([bm, bi]) => [bi, bm])
);

// Force Checkpoint in both BM & EN for all variations
reverseExactTextTranslations['Pusat Pemeriksaan'] = 'Checkpoint';
reverseExactTextTranslations['Pusat Pemeriksaan 1'] = 'Checkpoint 1';
reverseExactTextTranslations['Pusat Pemeriksaan 2'] = 'Checkpoint 2';
reverseExactTextTranslations['Pusat Pemeriksaan 3'] = 'Checkpoint 3';
reverseExactTextTranslations['Pusat Pemeriksaan 4'] = 'Checkpoint 4';
reverseExactTextTranslations['Checkpoint'] = 'Checkpoint';
reverseExactTextTranslations['Checkpoint 1'] = 'Checkpoint 1';
reverseExactTextTranslations['Checkpoint 2'] = 'Checkpoint 2';
reverseExactTextTranslations['Checkpoint 3'] = 'Checkpoint 3';
reverseExactTextTranslations['Checkpoint 4'] = 'Checkpoint 4';

// Force Teka Silang Kata in BM for all crossword variations
reverseExactTextTranslations['Crossword'] = 'Teka Silang Kata';
reverseExactTextTranslations['Crossword Puzzle'] = 'Teka Silang Kata';
reverseExactTextTranslations['Crosswords'] = 'Teka Silang Kata';
reverseExactTextTranslations['crossword'] = 'teka silang kata';
reverseExactTextTranslations['Crossword — Checkpoint 2'] = 'Checkpoint 2 - Teka Silang Kata';
reverseExactTextTranslations['Checkpoint 2 - Crossword'] = 'Checkpoint 2 - Teka Silang Kata';

// Force Interaksi dengan Pemain / Staf in BM
reverseExactTextTranslations['Player Chat'] = 'Interaksi dengan Pemain';
reverseExactTextTranslations['Staff Chat'] = 'Interaksi dengan Staf';
reverseExactTextTranslations['Sembang Pemain'] = 'Interaksi dengan Pemain';
reverseExactTextTranslations['Sembang Staf'] = 'Interaksi dengan Staf';
reverseExactTextTranslations['Sembang'] = 'Interaksi';

const getNestedValue = (source, key) => {
  const keys = key.split('.');
  let value = source;
  for (const part of keys) value = value?.[part];
  return value;
};

const translateText = (text, language) => {
  if (typeof text !== 'string') return text;
  if (language === 'bm') return reverseExactTextTranslations[text] || text;
  return exactTextTranslations[text] || text;
};

const translateDomText = (root, language) => {
  if (!root || typeof document === 'undefined') return;
  const replacements = language === 'bi' ? exactTextTranslations : reverseExactTextTranslations;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const translateFullLabel = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (replacements[trimmed]) return value.replace(trimmed, replacements[trimmed]);

    // Match: optional emoji/symbol prefix + text core + optional " (N)" suffix or trailing " ("
    // This handles JSX interpolated counts, e.g. "📹 Senarai Video (" where the number
    // is in a sibling text node created by {videos.length} interpolation.
    const match = trimmed.match(/^([^A-Za-zÀ-ž0-9]*)(.*?)(\s*\(\d+\)|\s*\()?$/);
    if (!match) return value;

    let [, prefix = '', core = '', suffix = ''] = match;

    // Handle trailing ")" left when a number appears before the word in JSX,
    // e.g. the " pemain)" node produced by `{n} pemain)`.
    const trailingClose = (core.trim().endsWith(')') && !core.includes('(')) ? ')' : '';
    if (trailingClose) core = core.trim().slice(0, -1);

    const translatedCore = replacements[core.trim()];
    if (!translatedCore) return value;
    return value.replace(trimmed, `${prefix}${translatedCore}${trailingClose}${suffix}`);
  };

  let node = walker.nextNode();
  while (node) {
    const raw = node.nodeValue;
    const parent = node.parentElement;
    if (!parent?.closest('[data-no-translate="true"]')) {
      const nextValue = translateFullLabel(raw);
      if (nextValue !== raw) node.nodeValue = nextValue;
    }
    node = walker.nextNode();
  }

  root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
    if (el.closest('[data-no-translate="true"]')) return;
    const translated = replacements[el.placeholder];
    if (translated) el.placeholder = translated;
  });
};

export const LanguageProvider = ({ children, mode = 'student' }) => {
  const storageKey = mode === 'admin' ? 'lang_admin' : 'lang_student';
  const [language, setLanguage] = useState(() => localStorage.getItem(storageKey) || 'bm');

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => {
      const next = prev === 'bm' ? 'bi' : 'bm';
      localStorage.setItem(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const t = useCallback((key, paramsOrDefault) => {
    const translated = getNestedValue(translations[language], key);
    const fallback = getNestedValue(translations.bm, key);
    const isParams = paramsOrDefault && typeof paramsOrDefault === 'object';
    let result = translated ?? fallback ?? (isParams ? undefined : paramsOrDefault) ?? key;
    if (isParams && typeof result === 'string') {
      Object.entries(paramsOrDefault).forEach(([paramKey, paramValue]) => {
        result = result.replaceAll(`{${paramKey}}`, paramValue);
      });
    }
    return result;
  }, [language]);

  const tx = useCallback((text) => translateText(text, language), [language]);

  useEffect(() => {
    translateDomText(document.body, language);
    const observer = new MutationObserver(() => translateDomText(document.body, language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, toggleLanguage, t, tx }), [language, toggleLanguage, t, tx]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

export const makeT = (sourceTranslations, language) => (key) => (
  getNestedValue(sourceTranslations[language], key) ?? getNestedValue(sourceTranslations.bm, key) ?? key
);

export default LanguageContext;
