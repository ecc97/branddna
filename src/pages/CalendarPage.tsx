/*
  Calendario de contenido (Flujo 3 del PRD).

  El PRD pide dos cosas de esta pantalla: ver qué hay planeado **y detectar los
  huecos**. Por eso los días vacíos no se esconden — en la vista semanal dicen
  "Día libre" — y por eso existe la bandeja "Sin programar", que el prototipo
  no contemplaba.

  Esa bandeja es imprescindible: una pieza aprobada nace sin fecha, así que sin
  ella el contenido recién guardado desaparecería de la vista y el usuario
  pensaría que se perdió.
*/

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  ApiError,
  CHANNEL_SHORT,
  PIECE_STATUSES,
  PIECE_TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  listarPiezas,
  type ContentPiece,
} from '../api';
import {
  DIAS_CORTOS,
  DIAS_INICIAL,
  celdasDelMes,
  claveDeHoy,
  claveFecha,
  semanaDe,
  sumarDias,
  sumarMeses,
  tituloDeLaSemana,
  tituloDelMes,
} from '../lib/fechas';
import { usePerfilActivo } from '../profile/profile-context';
import s from './CalendarPage.module.css';

type Vista = 'mes' | 'semana';

/** Primera línea del texto, para la vista previa. */
function resumen(pieza: ContentPiece): string {
  return pieza.generated_text.split('\n').find((linea) => linea.trim()) ?? '';
}

export function CalendarPage() {
  const perfil = usePerfilActivo();
  const navegar = useNavigate();

  const [piezas, setPiezas] = useState<ContentPiece[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vista, setVista] = useState<Vista>('mes');
  /** Cualquier día dentro del periodo que se está mostrando. */
  const [referencia, setReferencia] = useState(() => new Date());

  const cargar = useCallback(
    async (signal?: AbortSignal) => {
      setCargando(true);
      setError(null);
      try {
        setPiezas(await listarPiezas(perfil.id, signal));
      } catch (fallo) {
        if (signal?.aborted) return;
        setError(
          fallo instanceof ApiError ? fallo.message : 'No se pudieron cargar las piezas.'
        );
      } finally {
        if (!signal?.aborted) setCargando(false);
      }
    },
    [perfil.id]
  );

  useEffect(() => {
    const controlador = new AbortController();
    void cargar(controlador.signal);
    return () => controlador.abort();
  }, [cargar]);

  /*
    Se agrupa por la clave "AAAA-MM-DD" tal cual llega del backend, sin
    convertirla a Date. Comparar cadenas evita por completo los desfases de
    zona horaria: ver `lib/fechas.ts`.
  */
  const porFecha = useMemo(() => {
    const mapa = new Map<string, ContentPiece[]>();
    for (const pieza of piezas) {
      if (!pieza.scheduled_date) continue;
      const lista = mapa.get(pieza.scheduled_date);
      if (lista) lista.push(pieza);
      else mapa.set(pieza.scheduled_date, [pieza]);
    }
    return mapa;
  }, [piezas]);

  const sinProgramar = useMemo(
    () => piezas.filter((pieza) => !pieza.scheduled_date),
    [piezas]
  );

  const hoy = claveDeHoy();
  const celdas = useMemo(
    () => celdasDelMes(referencia.getFullYear(), referencia.getMonth()),
    [referencia]
  );
  const diasSemana = useMemo(() => semanaDe(referencia), [referencia]);

  function retroceder() {
    setReferencia((actual) =>
      vista === 'mes' ? sumarMeses(actual, -1) : sumarDias(actual, -7)
    );
  }

  function avanzar() {
    setReferencia((actual) =>
      vista === 'mes' ? sumarMeses(actual, 1) : sumarDias(actual, 7)
    );
  }

  function abrir(pieza: ContentPiece) {
    navegar(`/pieza/${pieza.id}`);
  }

  const noHayNada = !cargando && !error && piezas.length === 0;

  return (
    <>
      <div className={s.cabecera}>
        <div className={s.eyebrow}>Calendario</div>
        <div className={s.conmutador} role="group" aria-label="Vista del calendario">
          <button
            className={vista === 'mes' ? s.conmutadorActivo : s.conmutadorBoton}
            aria-pressed={vista === 'mes'}
            onClick={() => setVista('mes')}
          >
            Mes
          </button>
          <button
            className={vista === 'semana' ? s.conmutadorActivo : s.conmutadorBoton}
            aria-pressed={vista === 'semana'}
            onClick={() => setVista('semana')}
          >
            Semana
          </button>
        </div>
      </div>

      <div className={s.navegacion}>
        <button
          className={s.flecha}
          onClick={retroceder}
          aria-label={vista === 'mes' ? 'Mes anterior' : 'Semana anterior'}
        >
          ‹
        </button>
        <h1 className={s.titulo}>
          {vista === 'mes' ? tituloDelMes(referencia) : tituloDeLaSemana(referencia)}
        </h1>
        <button
          className={s.flecha}
          onClick={avanzar}
          aria-label={vista === 'mes' ? 'Mes siguiente' : 'Semana siguiente'}
        >
          ›
        </button>
        <button className={s.hoy} onClick={() => setReferencia(new Date())}>
          Hoy
        </button>
      </div>

      {error && (
        <div className={s.error} role="alert">
          {error}{' '}
          <button className={s.enlace} onClick={() => void cargar()}>
            Reintentar
          </button>
        </div>
      )}

      {cargando && <div className={s.cargando}>Cargando el calendario…</div>}

      {!cargando && !error && vista === 'mes' && (
        <>
          <div className={s.nombresDia} aria-hidden="true">
            {DIAS_INICIAL.map((inicial, indice) => (
              <div key={indice} className={s.nombreDia}>
                {inicial}
              </div>
            ))}
          </div>
          <div className={s.rejilla}>
            {celdas.map((fecha) => {
              const clave = claveFecha(fecha);
              const delMes = fecha.getMonth() === referencia.getMonth();
              const delDia = porFecha.get(clave) ?? [];

              if (!delMes) {
                return <div key={clave} className={s.celdaFuera} />;
              }

              return (
                <div
                  key={clave}
                  className={delDia.length ? s.celdaConPiezas : s.celda}
                >
                  <div
                    className={
                      clave === hoy
                        ? s.numeroHoy
                        : delDia.length
                          ? s.numeroConPiezas
                          : s.numero
                    }
                  >
                    {fecha.getDate()}
                  </div>
                  {delDia.map((pieza) => (
                    <button
                      key={pieza.id}
                      className={s.pastilla}
                      style={{
                        background: STATUS_COLORS[pieza.status].soft,
                        color: STATUS_COLORS[pieza.status].color,
                        boxShadow: `inset 3px 0 0 ${STATUS_COLORS[pieza.status].color}`,
                      }}
                      onClick={() => abrir(pieza)}
                      title={`${pieza.channel} · ${STATUS_LABELS[pieza.status]}`}
                    >
                      {CHANNEL_SHORT[pieza.channel] ?? pieza.channel}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!cargando && !error && vista === 'semana' && (
        <div className={s.semana}>
          {diasSemana.map((fecha, indice) => {
            const clave = claveFecha(fecha);
            const delDia = porFecha.get(clave) ?? [];
            return (
              <div key={clave} className={delDia.length ? s.diaConPiezas : s.dia}>
                <div className={s.columnaFecha}>
                  <div className={s.diaNombre}>{DIAS_CORTOS[indice]}</div>
                  <div
                    className={
                      clave === hoy
                        ? s.diaNumeroHoy
                        : delDia.length
                          ? s.diaNumeroConPiezas
                          : s.diaNumero
                    }
                  >
                    {fecha.getDate()}
                  </div>
                </div>
                <div className={s.columnaPiezas}>
                  {delDia.length === 0 && <div className={s.diaLibre}>Día libre</div>}
                  {delDia.map((pieza) => (
                    <button
                      key={pieza.id}
                      className={s.pieza}
                      onClick={() => abrir(pieza)}
                    >
                      <div className={s.piezaMeta}>
                        <span
                          className={s.punto}
                          style={{ background: STATUS_COLORS[pieza.status].color }}
                        />
                        {pieza.channel} · {STATUS_LABELS[pieza.status]}
                      </div>
                      <div className={s.piezaTexto}>{resumen(pieza)}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {noHayNada && (
        <div className={s.vacio}>
          Todavía no has guardado ninguna pieza.
          <br />
          <button className={s.enlace} onClick={() => navegar('/generar')}>
            Genera tu primer contenido
          </button>{' '}
          y aparecerá aquí.
        </div>
      )}

      {!cargando && !error && sinProgramar.length > 0 && (
        <section className={s.seccion}>
          <div className={s.seccionTitulo}>Sin programar ({sinProgramar.length})</div>
          <p className={s.seccionPista}>
            Guardadas pero sin fecha. Ábrelas para ponerles día y que aparezcan arriba.
          </p>
          <div className={s.listaSinFecha}>
            {sinProgramar.map((pieza) => (
              <button key={pieza.id} className={s.pieza} onClick={() => abrir(pieza)}>
                <div className={s.piezaMeta}>
                  <span
                    className={s.punto}
                    style={{ background: STATUS_COLORS[pieza.status].color }}
                  />
                  {pieza.channel} · {PIECE_TYPE_LABELS[pieza.piece_type]} ·{' '}
                  {STATUS_LABELS[pieza.status]}
                </div>
                <div className={s.piezaTexto}>{resumen(pieza)}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!cargando && !error && piezas.length > 0 && (
        <div className={s.leyenda}>
          {PIECE_STATUSES.map((estado) => (
            <div key={estado} className={s.leyendaItem}>
              <span
                className={s.punto}
                style={{ background: STATUS_COLORS[estado].color }}
              />
              {STATUS_LABELS[estado]}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
