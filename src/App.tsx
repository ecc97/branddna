/*
  Paso 1 — Página de verificación del sistema de diseño.

  No es una pantalla del producto: existe para comprobar de un vistazo que los
  tokens del prototipo se trasladaron bien y que el tema claro/oscuro funciona.
  Se reemplaza por el router de verdad en el paso 3.
*/

import { useState } from 'react';

import { useTheme } from './theme/ThemeProvider';
import s from './App.module.css';

const SUPERFICIES = ['--s0', '--s1', '--s2', '--s3', '--p1', '--p2'];
const BORDES = ['--b0', '--b1', '--b2'];
const TEXTOS = ['--t0', '--t1', '--t2', '--t3', '--t4', '--t5', '--t6'];
const SEMANTICOS = ['--acc', '--acc-h', '--ok', '--ok-h', '--warn', '--st-d', '--st-p'];

const ESTADOS = [
  { label: 'Borrador', color: 'var(--st-d)', fondo: 'var(--st-d-s)' },
  { label: 'Aprobado', color: 'var(--ok)', fondo: 'var(--ok-soft)' },
  { label: 'Publicado', color: 'var(--st-p)', fondo: 'var(--st-p-s)' },
];

const CANALES = ['Instagram', 'WhatsApp', 'Facebook', 'Blog'];

function Swatches({ tokens }: { tokens: string[] }) {
  return (
    <div className={s.swatches}>
      {tokens.map((token) => (
        <div key={token} className={s.swatch}>
          <div className={s.swatchColor} style={{ background: `var(${token})` }} />
          <div className={s.swatchLabel}>{token}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [canalActivo, setCanalActivo] = useState('Instagram');

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div>
          <div className={s.eyebrow}>Paso 1 · Sistema de diseño</div>
          <h1 className={s.title}>Tu voz, una sola vez.</h1>
          <p className={s.lead}>
            Verificación de los tokens trasladados desde el prototipo.
          </p>
        </div>
        <button className={s.themeButton} onClick={toggleTheme}>
          <span
            className={`${s.themeMark} ${theme === 'dark' ? s.themeMarkDark : ''}`}
          />
          {theme === 'dark' ? 'Claro' : 'Oscuro'}
        </button>
      </header>

      <section className={s.section}>
        <div className={s.sectionTitle}>Superficies</div>
        <Swatches tokens={SUPERFICIES} />
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Bordes</div>
        <Swatches tokens={BORDES} />
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Semánticos</div>
        <Swatches tokens={SEMANTICOS} />
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Escala de texto</div>
        <div className={s.textScale}>
          {TEXTOS.map((token) => (
            <div key={token} className={s.textRow} style={{ color: `var(${token})` }}>
              {token} — El pan de centeno de los martes
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Estados de una pieza</div>
        <div className={s.statusList}>
          {ESTADOS.map((estado) => (
            <div
              key={estado.label}
              className={s.statusPill}
              style={{ background: estado.fondo, color: estado.color }}
            >
              <span className={s.dot} style={{ background: estado.color }} />
              {estado.label}
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Selección de canal</div>
        <div className={s.row}>
          {CANALES.map((canal) => (
            <button
              key={canal}
              className={canal === canalActivo ? s.chipOn : s.chip}
              onClick={() => setCanalActivo(canal)}
            >
              {canal}
            </button>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Campo de formulario</div>
        <input className={s.input} placeholder="Panadería La Espiga" />
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Tarjeta de opción generada</div>
        <div className={s.card}>
          <div className={s.cardTop}>
            <div className={s.angle}>Informativo</div>
            <div className={s.meta}>{canalActivo} · post</div>
          </div>
          <div className={s.cardText}>
            Hoy salió el pan de siempre, calientito y listo desde las 7am. Pasa por el
            local antes de que se acabe.
          </div>
          <div className={s.rowTight}>
            <button className={s.primary}>Aprobar</button>
            <button className={s.secondary}>Editar</button>
            <button className={s.secondary}>Descartar</button>
          </div>
        </div>
        <button className={s.cta}>Generar 3 opciones</button>
      </section>

      <p className={s.note}>
        Si los colores cambian al pulsar el botón de tema y siguen ahí al recargar la
        página, el paso 1 está correcto. Los títulos deben verse en Instrument Serif y
        el resto en Instrument Sans.
      </p>
    </div>
  );
}
