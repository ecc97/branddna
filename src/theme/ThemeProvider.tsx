/*
  Tema claro / oscuro.

  Va en un contexto y no en un hook suelto porque el estado tiene que ser
  único: el botón de la barra inferior y cualquier otro sitio que lea el tema
  deben ver siempre el mismo valor. Dos `useState` separados se
  desincronizarían al primer cambio.

  El valor inicial NO se calcula aquí: lo dejó puesto el script de index.html
  antes del primer pintado, para evitar el parpadeo. Aquí solo se lee.
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'branddna-theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function leerTemaInicial(): Theme {
  const enElDom = document.documentElement.getAttribute('data-theme');
  if (enElDom === 'light' || enElDom === 'dark') return enElDom;
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(leerTemaInicial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Modo incógnito o almacenamiento bloqueado: el tema funciona igual,
      // solo que no se recuerda. No es motivo para romper la app.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((actual) => (actual === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const contexto = useContext(ThemeContext);
  if (!contexto) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return contexto;
}
