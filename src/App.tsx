/*
  Raíz de la aplicación: enrutado y compuerta de estado.

  Antes de mostrar la app hay que saber con qué marca se trabaja. Como no hay
  cuentas de usuario, eso no es inmediato: hay que mirar qué marcas recuerda
  este navegador y comprobar la recordada contra el servidor.

  Los cuatro estados existen porque los cuatro pasan de verdad:

    loading    comprobando la marca recordada
    error      el backend no responde
    choosing   sin marca activa: elegir, entrar con código o crear
    ready      hay marca activa y la app funciona

  Nota de rendimiento: si este navegador no conoce ninguna marca, `choosing` se
  alcanza **sin tocar la red**. La app abre al instante en el inicio.
*/

import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { API_BASE_URL } from './api';
import { AppShell } from './components/AppShell';
import { BrandPage } from './pages/BrandPage';
import { CalendarPage } from './pages/CalendarPage';
import { GeneratePage } from './pages/GeneratePage';
import { HomePage } from './pages/HomePage';
import { PiecePage } from './pages/PiecePage';
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

  if (state === 'loading') {
    return (
      <div className={s.pantalla}>
        <div className={s.caja}>
          <h1 className={s.titulo}>Un momento…</h1>
          <p className={s.texto}>Abriendo tu marca.</p>
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

  /*
    Sin marca activa no se monta la barra de navegación: no hay adónde navegar
    todavía. Solo el inicio y el alta de una marca nueva.
  */
  if (state === 'choosing') {
    return (
      <div className={s.suelto}>
        <Routes>
          <Route path="/marca/nueva" element={<BrandPage key="crear" creating />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/generar" element={<GeneratePage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/pieza/:id" element={<PiecePage />} />
        <Route path="/marca" element={<BrandPage key="editar" />} />
        <Route path="/marca/nueva" element={<BrandPage key="crear" creating />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
