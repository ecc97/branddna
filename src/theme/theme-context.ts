/*
  Contexto y hook del tema.

  Están separados de <ThemeProvider> a propósito: si un archivo exporta a la
  vez un componente y otras cosas, React Fast Refresh no puede aplicar cambios
  en caliente y recarga la página entera al editarlo. Con la separación, tocar
  el provider mantiene el estado de la app.
*/

import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'branddna-theme';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return context;
}
