import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { exactTextTranslations, translations } from './translations';

const LanguageContext = createContext();

const reverseExactTextTranslations = Object.fromEntries(
  Object.entries(exactTextTranslations).map(([bm, bi]) => [bi, bm])
);

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

    const match = trimmed.match(/^([^A-Za-zÀ-ž0-9]*)(.*?)(\s*\(\d+\))?$/);
    if (!match) return value;

    const [, prefix = '', core = '', suffix = ''] = match;
    const translatedCore = replacements[core.trim()];
    if (!translatedCore) return value;
    return value.replace(trimmed, `${prefix}${translatedCore}${suffix}`);
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

  const t = useCallback((key) => {
    const translated = getNestedValue(translations[language], key);
    const fallback = getNestedValue(translations.bm, key);
    return translated ?? fallback ?? key;
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
