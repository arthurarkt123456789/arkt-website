/* ARKT — contexte langue FR / EN */
import React, { createContext, useContext, useState } from 'react';
import { i18n } from './i18n.js';

const LangContext = createContext({ lang: 'fr', t: i18n.fr, toggleLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState('fr');

  const toggleLang = () => {
    const next = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  };

  return (
    <LangContext.Provider value={{ lang, t: i18n[lang], toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
