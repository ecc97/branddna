/*
  Raíz de la aplicación: enrutado y compuerta de estado.

  Antes de mostrar ninguna pantalla hay que saber con qué marca se trabaja.
  Como no hay autenticación, eso no es inmediato: hay que consultar la lista de
  perfiles y decidir. Por eso <Contenido> filtra por estado antes de montar el
  router de verdad.

  Los cuatro estados previos existen porque los cuatro son situaciones reales:
    cargando      la primera consulta al backend
    error         el backend está apagado o falla
    sin-perfiles  primera vez: hay que crear la marca
    eligiendo     hay varias marcas y ninguna recordada
*/

import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { API_BASE_URL } from './api';
import { AppShell } from './components/AppShell';
import { BrandPage } from './pages/BrandPage';
import { CalendarPage } from './pages/CalendarPage';
import { GeneratePage } from './pages/GeneratePage';
import { PiecePage } from './pages/PiecePage';
import { ProfilePicker } from './pages/ProfilePicker';
import { ProfileProvider } from './profile/ProfileProvider';
import { useProfile } from './profile/profile-context';
import s from './App.module.css';

export default function App() {
  return (
    <BrowserRouter>
      <ProfileProvider>
        <AppRoutes />
      </ProfileProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { state, error, reload } = useProfile();

  if (state === 'cargando') {
    return (
      <div className={s.pantalla}>
        <div className={s.caja}>
          <h1 className={s.titulo}>Un momento…</h1>
          <p className={s.texto}>Buscando tu perfil de marca.</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={s.pantalla}>
        <div className={s.caja}>
          <h1 className={s.titulo}>No se pudo conectar</h1>
          <p className={s.texto}>{error}</p>
          <div className={s.detalle}>
            Comprueba que el backend esté corriendo en <code>{API_BASE_URL}</code>:
            <br />
            <br />
            <code>cd backend</code>
            <br />
            <code>./venv/Scripts/python.exe -m uvicorn main:app --reload</code>
          </div>
          <button className={s.reintentar} onClick={reload}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Primera vez: la pantalla de marca sin barra de navegación, porque
  // todavía no hay ningún sitio al que navegar.
  if (state === 'sin-perfiles') {
    return (
      <div className={s.alta}>
        <BrandPage />
      </div>
    );
  }

  if (state === 'eligiendo') {
    return <ProfilePicker />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/generar" replace />} />
        <Route path="/generar" element={<GeneratePage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/pieza/:id" element={<PiecePage />} />
        <Route path="/marca" element={<BrandPage />} />
        <Route path="*" element={<Navigate to="/generar" replace />} />
      </Routes>
    </AppShell>
  );
}
