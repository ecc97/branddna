/*
  Marco de la aplicación: contenido + barra de navegación inferior.

  La barra es la del prototipo, pero sin el marco de teléfono de 412 px: aquí
  el contenido se limita a `--content-max` y se centra, así en el móvil ocupa
  todo el ancho y en el escritorio no queda una columna diminuta perdida en la
  pantalla.

  Se usa <NavLink> y no botones con estado propio porque la navegación es por
  URL: el botón "atrás" del navegador funciona, se puede recargar sin perder
  la pantalla, y una pieza concreta se puede enlazar.
*/

import { NavLink, type NavLinkRenderProps } from 'react-router';
import type { ReactNode } from 'react';

import { useTheme } from '../theme/theme-context';
import s from './AppShell.module.css';

const PESTANAS = [
  { to: '/generar', label: 'Generar' },
  { to: '/calendario', label: 'Calendario' },
  { to: '/marca', label: 'Mi marca' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={s.shell}>
      <main className={s.main}>{children}</main>

      <nav className={s.barra} aria-label="Navegación principal">
        <div className={s.barraInterior}>
          {PESTANAS.map((pestana) => (
            <NavLink
              key={pestana.to}
              to={pestana.to}
              className={({ isActive }: NavLinkRenderProps) =>
                isActive ? s.tabActiva : s.tab
              }
            >
              {({ isActive }: NavLinkRenderProps) => (
                <>
                  <span className={isActive ? s.marcaActiva : s.marca} />
                  {pestana.label}
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
