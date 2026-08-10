/*
  Detalle de una pieza: cierra el Flujo 3 del PRD (programar y cambiar estado)
  y permite corregir el texto o eliminarla.

  ── Por qué un botón de guardar y no guardado automático ─────────────────

  La alternativa era enviar un PUT en cuanto cambias el estado o la fecha.
  Se descartó por tres motivos concretos:

  1. Con los botones – y + de la fecha, cinco toques serían cinco peticiones,
     o habría que añadir un temporizador de espera y acordarse de vaciarlo al
     salir de la pantalla.
  2. Una petición que falla a mitad deja la pantalla diciendo una cosa y la
     base otra, sin que nadie se entere.
  3. El usuario no puede probar y arrepentirse.

  Con un guardado explícito hay una sola petición, el usuario ve cuándo se
  guardó, y "Descartar" devuelve todo a como estaba.

  ── Nota sobre las palabras prohibidas ───────────────────────────────────

  Aquí NO se resaltan, a diferencia del generador. El generador las conoce
  porque `/generate` devuelve `forbidden_terms_checked`; extraerlas del texto
  libre del perfil es lógica que vive en el backend
  (`brand_guard.extract_forbidden_terms`) y portarla sería una segunda
  duplicación con más superficie para divergir. Queda anotado como deuda: lo
  correcto sería que el perfil expusiera ya la lista de términos.
*/

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  ApiError,
  PIECE_STATUSES,
  PIECE_TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  actualizarPieza,
  eliminarPieza,
  listarPiezas,
  type ContentPiece,
  type ContentPieceUpdate,
  type PieceStatus,
} from '../api';
import { DateStepper } from '../components/DateStepper';
import { Toast, type Aviso } from '../components/Toast';
import { usePerfilActivo } from '../profile/profile-context';
import s from './PiecePage.module.css';

export function PiecePage() {
  const perfil = usePerfilActivo();
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [pieza, setPieza] = useState<ContentPiece | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Borrador local: lo que el usuario está tocando, todavía sin enviar.
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<PieceStatus>('borrador');
  const [fecha, setFecha] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  /** Copia los valores del servidor al borrador local. */
  const sincronizar = useCallback((cargada: ContentPiece) => {
    setPieza(cargada);
    setTexto(cargada.generated_text);
    setEstado(cargada.status);
    setFecha(cargada.scheduled_date);
  }, []);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        // El backend no tiene GET /pieces/{id}: se pide la lista y se busca.
        // Ver la deuda anotada en la bitácora 08.
        const todas = await listarPiezas(perfil.id, controlador.signal);
        const encontrada = todas.find((p) => p.id === id);
        if (encontrada) sincronizar(encontrada);
        else setError('Esta pieza ya no existe. Puede que la hayas eliminado.');
      } catch (fallo) {
        if (controlador.signal.aborted) return;
        setError(
          fallo instanceof ApiError ? fallo.message : 'No se pudo cargar la pieza.'
        );
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    void cargar();
    return () => controlador.abort();
  }, [perfil.id, id, sincronizar]);

  const hayCambios =
    pieza !== null &&
    (texto !== pieza.generated_text ||
      estado !== pieza.status ||
      fecha !== pieza.scheduled_date);

  async function guardar() {
    if (!pieza) return;

    /*
      Se envía solo lo que cambió. El PUT del backend es parcial: lo que no se
      manda, no se toca. Enviar el objeto entero funcionaría, pero pisaría
      campos que este usuario no ha tocado.
    */
    const cambios: ContentPieceUpdate = {};
    if (texto !== pieza.generated_text) cambios.generated_text = texto;
    if (estado !== pieza.status) cambios.status = estado;
    if (fecha !== pieza.scheduled_date) cambios.scheduled_date = fecha;

    setGuardando(true);
    try {
      sincronizar(await actualizarPieza(pieza.id, cambios));
      setAviso({ mensaje: 'Cambios guardados.' });
    } catch (fallo) {
      setAviso({
        mensaje: fallo instanceof ApiError ? fallo.message : 'No se pudo guardar.',
        tipo: 'error',
      });
    } finally {
      setGuardando(false);
    }
  }

  function descartar() {
    if (pieza) sincronizar(pieza);
  }

  async function borrar() {
    if (!pieza) return;
    setBorrando(true);
    try {
      await eliminarPieza(pieza.id);
      navegar('/calendario');
    } catch (fallo) {
      setBorrando(false);
      setConfirmandoBorrado(false);
      setAviso({
        mensaje: fallo instanceof ApiError ? fallo.message : 'No se pudo eliminar.',
        tipo: 'error',
      });
    }
  }

  function volver() {
    // Salir con cambios sin guardar es una forma silenciosa de perder trabajo.
    if (hayCambios && !window.confirm('Tienes cambios sin guardar. ¿Salir igualmente?')) {
      return;
    }
    navegar('/calendario');
  }

  return (
    <>
      <button className={s.volver} onClick={volver}>
        ← Volver al calendario
      </button>

      {cargando && <div className={s.cargando}>Cargando…</div>}

      {error && !cargando && (
        <div className={s.aviso} role="alert">
          {error}
        </div>
      )}

      {pieza && !cargando && (
        <>
          <div className={s.meta}>
            <span
              className={s.punto}
              style={{ background: STATUS_COLORS[pieza.status].color }}
            />
            {pieza.channel} · {PIECE_TYPE_LABELS[pieza.piece_type]}
          </div>
          <div className={s.tema}>{pieza.topic}</div>

          <section className={s.seccion}>
            <div className={s.seccionTitulo}>Texto</div>
            <textarea
              className={s.editor}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-label="Texto de la pieza"
            />
            <div className={s.contador}>{texto.length} caracteres</div>
          </section>

          <section className={s.seccion}>
            <div className={s.seccionTitulo} id="etiqueta-estado">
              Estado
            </div>
            <div className={s.estados} role="group" aria-labelledby="etiqueta-estado">
              {PIECE_STATUSES.map((opcion) => {
                const activo = opcion === estado;
                return (
                  <button
                    key={opcion}
                    type="button"
                    className={s.estado}
                    aria-pressed={activo}
                    onClick={() => setEstado(opcion)}
                    style={
                      activo
                        ? {
                            borderColor: STATUS_COLORS[opcion].color,
                            background: STATUS_COLORS[opcion].soft,
                            color: STATUS_COLORS[opcion].color,
                          }
                        : undefined
                    }
                  >
                    {STATUS_LABELS[opcion]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={s.seccion}>
            <div className={s.seccionTitulo}>Fecha programada</div>
            <DateStepper value={fecha} onChange={setFecha} />
          </section>

          {hayCambios ? (
            <div className={s.barra}>
              <button className={s.guardar} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button className={s.descartar} onClick={descartar} disabled={guardando}>
                Descartar
              </button>
            </div>
          ) : (
            <div className={s.sinCambios}>Todo guardado.</div>
          )}

          <section className={s.zonaBorrado}>
            {confirmandoBorrado ? (
              <div className={s.confirmacion}>
                <div className={s.confirmacionTexto}>
                  Se eliminará esta pieza y desaparecerá del calendario. No se puede
                  deshacer.
                </div>
                <div className={s.confirmacionAcciones}>
                  <button
                    className={s.confirmarBorrado}
                    onClick={borrar}
                    disabled={borrando}
                  >
                    {borrando ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button
                    className={s.cancelar}
                    onClick={() => setConfirmandoBorrado(false)}
                    disabled={borrando}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button className={s.borrar} onClick={() => setConfirmandoBorrado(true)}>
                Eliminar pieza
              </button>
            )}
          </section>
        </>
      )}

      <Toast aviso={aviso} onCerrar={() => setAviso(null)} />
    </>
  );
}
