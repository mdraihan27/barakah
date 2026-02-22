import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [isBangla, setIsBangla] = useState(() => {
    return localStorage.getItem('barakah-lang') === 'bn';
  });

  const toggleLanguage = () => {
    setIsBangla(prev => {
      const next = !prev;
      localStorage.setItem('barakah-lang', next ? 'bn' : 'en');
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ isBangla, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
