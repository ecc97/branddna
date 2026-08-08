import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { ThemeProvider } from './theme/ThemeProvider.tsx';
import './styles/global.css';

// Solo en desarrollo: deja la capa de API accesible desde la consola del
// navegador (`await api.listarPerfiles()`). Vite elimina este bloque del
// build de producción, así que no llega a los usuarios.
if (import.meta.env.DEV) {
  import('./api').then((api) => {
    (window as unknown as Record<string, unknown>).api = api;
    console.info('[BrandDNA] API disponible en window.api — prueba: await api.listarPerfiles()');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
