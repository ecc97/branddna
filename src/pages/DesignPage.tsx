/*
  Referencia visual de los tokens de diseño.

  No es una pantalla del producto y no aparece en la barra de navegación: se
  llega escribiendo /diseno. Se mantiene mientras se construyen los pasos 4 a 6
  para poder comprobar de un vistazo cómo se ve cada token en ambos temas.
  Se borra en el paso 7.
*/

import { PIECE_TYPE_LABELS, STATUS_COLORS, STATUS_LABELS, PIECE_STATUSES } from '../api';
import s from './DesignPage.module.css';

const SUPERFICIES = ['--s0', '--s1', '--s2', '--s3', '--p1', '--p2'];
const BORDES = ['--b0', '--b1', '--b2'];
const TEXTOS = ['--t0', '--t1', '--t2', '--t3', '--t4', '--t5', '--t6'];
const SEMANTICOS = ['--acc', '--acc-h', '--ok', '--ok-h', '--warn', '--st-d', '--st-p'];

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

export function DesignPage() {
  return (
    <>
      <div className={s.eyebrow}>Referencia</div>
      <h1 className={s.titulo}>Sistema de diseño</h1>

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
            <div key={token} style={{ color: `var(${token})` }}>
              {token} — El pan de centeno de los martes
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Estados de una pieza</div>
        <div className={s.statusList}>
          {PIECE_STATUSES.map((estado) => (
            <div
              key={estado}
              className={s.statusPill}
              style={{
                background: STATUS_COLORS[estado].soft,
                color: STATUS_COLORS[estado].color,
              }}
            >
              <span
                className={s.dot}
                style={{ background: STATUS_COLORS[estado].color }}
              />
              {STATUS_LABELS[estado]}
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionTitle}>Tarjeta de opción generada</div>
        <div className={s.card}>
          <div className={s.cardTop}>
            <div className={s.angle}>Informativo</div>
            <div className={s.meta}>Instagram · {PIECE_TYPE_LABELS.promocion}</div>
          </div>
          <div className={s.cardText}>
            Hoy salió el pan de siempre, calientito y listo desde las 7am. Pasa por el
            local antes de que se acabe.
          </div>
          <div className={s.row}>
            <button className={s.primary}>Aprobar</button>
            <button className={s.secondary}>Editar</button>
            <button className={s.secondary}>Descartar</button>
          </div>
        </div>
      </section>

      <p className={s.nota}>
        Pantalla de referencia, no del producto. Se elimina en el paso 7.
      </p>
    </>
  );
}
