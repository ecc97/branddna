/*
  Armazón de la app: cabecera, contenido y barra de navegación.

  ── La cabecera ───────────────────────────────────────────────────────────

  Muestra la marca activa y, al pulsarla, lleva al inicio. Resuelve dos cosas a
  la vez:

  1. **Saber con qué marca estás trabajando.** Antes solo se veía en la pantalla
     del generador; en el calendario o en una pieza no había ninguna pista, y
     con varias marcas eso es un riesgo real de publicar lo que no toca.
  2. **Poder volver.** El selector de marca era una puerta de un solo sentido:
     una vez dentro, no había forma de cambiar de marca ni de crear otra sin
     borrar el almacenamiento del navegador a mano.

  Es el patrón del selector de espacio de trabajo que usan casi todas las apps
  multi-marca, y evita añadir una cuarta pestaña que se usaría una vez por
  sesión.
*/

import { NavLink, type NavLinkRenderProps } from 'react-router';
import type { ReactNode } from 'react';

import { useProfile } from '../profile/profile-context';
import { useTheme } from '../theme/theme-context';
import s from './AppShell.module.css';

const TABS = [
  { to: '/generar', label: 'Generar' },
  { to: '/calendario', label: 'Calendario' },
  { to: '/marca', label: 'Mi marca' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { activeProfile } = useProfile();

  return (
    <div className={s.shell}>
      <header className={s.cabecera}>
        <div className={s.cabeceraInterior}>
          <NavLink to="/" className={s.selectorMarca}>
            <span className={s.marcaNombre}>
              {activeProfile?.business_name ?? 'BrandDNA'}
            </span>
            <span className={s.marcaChevron} aria-hidden="true">
              ⌄
            </span>
            <span className={s.marcaAyuda}>Cambiar</span>
          </NavLink>
        </div>
      </header>

      <main className={s.main}>{children}</main>

      <nav className={s.barra} aria-label="Navegación principal">
        <div className={s.barraInterior}>
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }: NavLinkRenderProps) =>
                isActive ? s.tabActiva : s.tab
              }
            >
              {({ isActive }: NavLinkRenderProps) => (
                <>
                  <span className={isActive ? s.marcaActiva : s.marca} />
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            className={s.botonTema}
            onClick={toggleTheme}
            aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          >
            <span className={theme === 'dark' ? s.marcaTemaOscuro : s.marcaTema} />
            {theme === 'dark' ? 'Claro' : 'Oscuro'}
          </button>
        </div>
      </nav>
    </div>
  );
}
