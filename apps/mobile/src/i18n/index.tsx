import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import { setApiLanguage } from '../api/client';
import { strings, type Lang, type Strings } from './strings';

const KEY = 'yalla.lang';

type I18n = { lang: Lang; t: Strings; rtl: boolean; dir: 'ltr' | 'rtl'; setLang: (lang: Lang) => void };
const I18nContext = createContext<I18n | null>(null);

function deviceLang(): Lang {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Layout direction: the root view gets `direction` so the app flips at once on every platform.
 * On iOS/Android we also tell I18nManager, so native pieces (gestures, system text alignment)
 * follow after the next app start.
 */
function applyDirection(lang: Lang) {
  const rtl = lang === 'ar';
  if (Platform.OS === 'web') {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    // react-native-web renders Text with dir="auto", so a line starting with a Latin word (a film title)
    // would align left inside an Arabic layout. Align by the page instead, skipping any Text that sets
    // its own textAlign (react-native-web gives those an r-textAlign-* class).
    if (!document.getElementById('yalla-dir')) {
      const style = document.createElement('style');
      style.id = 'yalla-dir';
      style.textContent = 'html[dir="rtl"] [dir="auto"]:not([class*="r-textAlign"]) { text-align: right; }';
      document.head.appendChild(style);
    }
  } else {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(rtl);
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .catch(() => null)
      .then((saved) => {
        const initial = saved === 'ar' || saved === 'en' ? saved : deviceLang();
        // Before the first render, so the screens' first API calls already ask for this language.
        setApiLanguage(initial);
        setLangState(initial);
      });
  }, []);

  useEffect(() => {
    if (!lang) return;
    setApiLanguage(lang);
    applyDirection(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setApiLanguage(next);
    setLangState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, []);

  const value = useMemo<I18n | null>(
    () => (lang ? { lang, t: strings[lang], rtl: lang === 'ar', dir: lang === 'ar' ? 'rtl' : 'ltr', setLang } : null),
    [lang, setLang],
  );
  // Wait for the saved choice so the app never flashes in the wrong language.
  if (!value) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside LanguageProvider');
  return ctx;
}
