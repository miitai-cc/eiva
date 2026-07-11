import React, { createContext, useContext, useState, useCallback } from 'react';
import zhTW from './zh-TW.js';
import en from './en.js';
import ja from './ja.js';

const translations = { 'zh-TW': zhTW, en, ja };

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    try {
      return localStorage.getItem('eiva-locale') || 'zh-TW';
    } catch {
      return 'zh-TW';
    }
  });

  const changeLocale = useCallback((newLocale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('eiva-locale', newLocale);
    } catch {}
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key, params) => {
    const keys = key.split('.');
    let value = translations[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    if (value === undefined) {
      // Fallback to zh-TW
      let fallback = translations['zh-TW'];
      for (const k of keys) {
        fallback = fallback?.[k];
      }
      value = fallback ?? key;
    }
    if (params && typeof value === 'string') {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
        value
      );
    }
    return value;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export const locales = [
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' }
];
