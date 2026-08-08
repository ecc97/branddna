/*
  Tema claro / oscuro.

  Va en un contexto y no en un hook suelto porque el estado tiene que ser
  único: el botón de la barra y cualquier otro sitio que lea el tema deben ver
  siempre el mismo valor. Dos `useState` separados se desincronizarían al
  primer cambio.

  El valor inicial NO se calcula aquí: lo dejó puesto el script de index.html
  antes del primer pintado, para evitar el parpadeo. Aquí solo se lee.
*/

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { THEME_STORAGE_KEY, ThemeContext, type Theme } from './theme-context';

function leerTemaInicial(): Theme {
  const enElDom = document.documentElement.getAttribute('data-theme');
  return enElDom === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(leerTemaInicial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Modo incógnito o almacenamiento bloqueado: el tema sigue funcionando,
      // solo que no se recuerda. No es motivo para romper la app.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((actual) => (actual === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
