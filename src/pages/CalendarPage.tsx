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
  listPieces,
  type ContentPiece,
} from '../api';
import {
  DAY_SHORT_NAMES,
  DAY_INITIALS,
  monthGridCells,
  todayKey,
  dateKey,
  weekOf,
  addDays,
  addMonths,
  weekTitle,
  monthTitle,
} from '../lib/dates';
import { useActiveProfile } from '../profile/profile-context';
import s from './CalendarPage.module.css';

type CalendarView = 'mes' | 'semana';

/** Primera línea del texto, para la vista previa. */
function firstLineOf(piece: ContentPiece): string {
  return piece.generated_text.split('\n').find((linea) => linea.trim()) ?? '';
}

export function CalendarPage() {
  const profile = useActiveProfile();
  const navigate = useNavigate();

  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<CalendarView>('mes');
  /** Cualquier día dentro del periodo que se está mostrando. */
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        setPieces(await listPieces(profile.id, signal));
      } catch (failure) {
        if (signal?.aborted) return;
        setError(
          failure instanceof ApiError ? failure.message : 'No se pudieron cargar las piezas.'
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [profile.id]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /*
    Se agrupa por la clave "AAAA-MM-DD" tal cual llega del backend, sin
    convertirla a Date. Comparar cadenas evita por completo los desfases de
    zona horaria: ver `lib/dates.ts`.
  */
  const byDate = useMemo(() => {
    const map = new Map<string, ContentPiece[]>();
    for (const piece of pieces) {
      if (!piece.scheduled_date) continue;
      const list = map.get(piece.scheduled_date);
      if (list) list.push(piece);
      else map.set(piece.scheduled_date, [piece]);
    }
    return map;
  }, [pieces]);

  const unscheduled = useMemo(
    () => pieces.filter((piece) => !piece.scheduled_date),
    [pieces]
  );

  const today = todayKey();
  const cells = useMemo(
    () => monthGridCells(anchorDate.getFullYear(), anchorDate.getMonth()),
    [anchorDate]
  );
  const weekDays = useMemo(() => weekOf(anchorDate), [anchorDate]);

  function goBack() {
    setAnchorDate((current) =>
      view === 'mes' ? addMonths(current, -1) : addDays(current, -7)
    );
  }

  function goForward() {
    setAnchorDate((current) =>
      view === 'mes' ? addMonths(current, 1) : addDays(current, 7)
    );
  }

  function openPiece(piece: ContentPiece) {
    navigate(`/pieza/${piece.id}`);
  }

  const isEmpty = !loading && !error && pieces.length === 0;

  return (
    <>
      <div className={s.cabecera}>
        <div className={s.eyebrow}>Calendario</div>
        <div className={s.conmutador} role="group" aria-label="Vista del calendario">
          <button
            className={view === 'mes' ? s.conmutadorActivo : s.conmutadorBoton}
            aria-pressed={view === 'mes'}
            onClick={() => setView('mes')}
          >
            Mes
          </button>
          <button
            className={view === 'semana' ? s.conmutadorActivo : s.conmutadorBoton}
            aria-pressed={view === 'semana'}
            onClick={() => setView('semana')}
          >
            Semana
          </button>
        </div>
      </div>

      <div className={s.navegacion}>
        <button
          className={s.flecha}
          onClick={goBack}
          aria-label={view === 'mes' ? 'Mes anterior' : 'Semana anterior'}
        >
          ‹
        </button>
        <h1 className={s.titulo}>
          {view === 'mes' ? monthTitle(anchorDate) : weekTitle(anchorDate)}
        </h1>
        <button
          className={s.flecha}
          onClick={goForward}
          aria-label={view === 'mes' ? 'Mes siguiente' : 'Semana siguiente'}
        >
          ›
        </button>
        <button className={s.hoy} onClick={() => setAnchorDate(new Date())}>
          Hoy
        </button>
      </div>

      {error && (
        <div className={s.error} role="alert">
          {error}{' '}
          <button className={s.enlace} onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      )}

      {loading && <div className={s.cargando}>Cargando el calendario…</div>}

      {!loading && !error && view === 'mes' && (
        <>
          <div className={s.nombresDia} aria-hidden="true">
            {DAY_INITIALS.map((initial, index) => (
              <div key={index} className={s.nombreDia}>
                {initial}
              </div>
            ))}
          </div>
          <div className={s.rejilla}>
            {cells.map((date) => {
              const key = dateKey(date);
              const inCurrentMonth = date.getMonth() === anchorDate.getMonth();
              const dayPieces = byDate.get(key) ?? [];

              if (!inCurrentMonth) {
                return <div key={key} className={s.celdaFuera} />;
              }

              return (
                <div
                  key={key}
                  className={dayPieces.length ? s.celdaConPiezas : s.celda}
                >
                  <div
                    className={
                      key === today
                        ? s.numeroHoy
                        : dayPieces.length
                          ? s.numeroConPiezas
                          : s.numero
                    }
                  >
                    {date.getDate()}
                  </div>
                  {dayPieces.map((piece) => (
                    <button
                      key={piece.id}
                      className={s.pastilla}
                      style={{
                        background: STATUS_COLORS[piece.status].soft,
                        color: STATUS_COLORS[piece.status].color,
                        boxShadow: `inset 3px 0 0 ${STATUS_COLORS[piece.status].color}`,
                      }}
                      onClick={() => openPiece(piece)}
                      title={`${piece.channel} · ${STATUS_LABELS[piece.status]}`}
                    >
                      {CHANNEL_SHORT[piece.channel] ?? piece.channel}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && !error && view === 'semana' && (
        <div className={s.semana}>
          {weekDays.map((date, index) => {
            const key = dateKey(date);
            const dayPieces = byDate.get(key) ?? [];
            return (
              <div key={key} className={dayPieces.length ? s.diaConPiezas : s.dia}>
                <div className={s.columnaFecha}>
                  <div className={s.diaNombre}>{DAY_SHORT_NAMES[index]}</div>
                  <div
                    className={
                      key === today
                        ? s.diaNumeroHoy
                        : dayPieces.length
                          ? s.diaNumeroConPiezas
                          : s.diaNumero
                    }
                  >
                    {date.getDate()}
                  </div>
                </div>
                <div className={s.columnaPiezas}>
                  {dayPieces.length === 0 && <div className={s.diaLibre}>Día libre</div>}
                  {dayPieces.map((piece) => (
                    <button
                      key={piece.id}
                      className={s.pieza}
                      onClick={() => openPiece(piece)}
                    >
                      <div className={s.piezaMeta}>
                        <span
                          className={s.punto}
                          style={{ background: STATUS_COLORS[piece.status].color }}
                        />
                        {piece.channel} · {STATUS_LABELS[piece.status]}
                      </div>
                      <div className={s.piezaTexto}>{firstLineOf(piece)}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEmpty && (
        <div className={s.vacio}>
          Todavía no has guardado ninguna pieza.
          <br />
          <button className={s.enlace} onClick={() => navigate('/generar')}>
            Genera tu primer contenido
          </button>{' '}
          y aparecerá aquí.
        </div>
      )}

      {!loading && !error && unscheduled.length > 0 && (
        <section className={s.seccion}>
          <div className={s.seccionTitulo}>Sin programar ({unscheduled.length})</div>
          <p className={s.seccionPista}>
            Guardadas pero sin fecha. Ábrelas para ponerles día y que aparezcan arriba.
          </p>
          <div className={s.listaSinFecha}>
            {unscheduled.map((piece) => (
              <button key={piece.id} className={s.pieza} onClick={() => openPiece(piece)}>
                <div className={s.piezaMeta}>
                  <span
                    className={s.punto}
                    style={{ background: STATUS_COLORS[piece.status].color }}
                  />
                  {piece.channel} · {PIECE_TYPE_LABELS[piece.piece_type]} ·{' '}
                  {STATUS_LABELS[piece.status]}
                </div>
                <div className={s.piezaTexto}>{firstLineOf(piece)}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && pieces.length > 0 && (
        <div className={s.leyenda}>
          {PIECE_STATUSES.map((status) => (
            <div key={status} className={s.leyendaItem}>
              <span
                className={s.punto}
                style={{ background: STATUS_COLORS[status].color }}
              />
              {STATUS_LABELS[status]}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
