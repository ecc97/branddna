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

  ── Palabras prohibidas ──────────────────────────────────────────────────

  El perfil trae `forbidden_terms` ya extraídos por el backend, con la misma
  función que usa el generador. Así el aviso de aquí y el de allí no pueden
  divergir, y el cliente no reimplementa esa heurística.

  Se recalcula en cada render: si al corregir un texto se escribe una palabra
  prohibida, el aviso sale al momento y sin llamar a la API.
*/

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  ApiError,
  PIECE_STATUSES,
  PIECE_TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  updatePiece,
  deletePiece,
  errorMessage,
  getPiece,
  type ContentPiece,
  type ContentPieceUpdate,
  type PieceStatus,
} from '../api';
import { DateStepper } from '../components/DateStepper';
import { findForbidden } from '../lib/forbidden';
import { Toast, type Notice } from '../components/Toast';
import { useActiveProfile } from '../profile/profile-context';
import s from './PiecePage.module.css';

export function PiecePage() {
  const profile = useActiveProfile();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [piece, setPiece] = useState<ContentPiece | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Borrador local: lo que el usuario está tocando, todavía sin enviar.
  const [text, setText] = useState('');
  const [status, setStatus] = useState<PieceStatus>('borrador');
  const [date, setDate] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  /** Copia los valores del servidor al borrador local. */
  const syncFromServer = useCallback((loaded: ContentPiece) => {
    setPiece(loaded);
    setText(loaded.generated_text);
    setStatus(loaded.status);
    setDate(loaded.scheduled_date);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        syncFromServer(await getPiece(id!, controller.signal));
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(
          failure instanceof ApiError && failure.status === 404
            ? 'Esta pieza ya no existe. Puede que la hayas eliminado.'
            : errorMessage(failure, 'No se pudo cargar la pieza.')
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [profile.id, id, syncFromServer]);

  // Se recalcula en cada render, así el aviso reacciona mientras se escribe.
  const slipped = findForbidden(text, profile.forbidden_terms);

  const hasChanges =
    piece !== null &&
    (text !== piece.generated_text ||
      status !== piece.status ||
      date !== piece.scheduled_date);

  async function save() {
    if (!piece) return;

    /*
      Se envía solo lo que cambió. El PUT del backend es parcial: lo que no se
      manda, no se toca. Enviar el objeto entero funcionaría, pero pisaría
      campos que este usuario no ha tocado.
    */
    const changes: ContentPieceUpdate = {};
    if (text !== piece.generated_text) changes.generated_text = text;
    if (status !== piece.status) changes.status = status;
    if (date !== piece.scheduled_date) changes.scheduled_date = date;

    setSaving(true);
    try {
      syncFromServer(await updatePiece(piece.id, changes));
      setNotice({ message: 'Cambios guardados.' });
    } catch (failure) {
      setNotice({
        message: errorMessage(failure, 'No se pudo guardar.'),
        kind: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    if (piece) syncFromServer(piece);
  }

  async function remove() {
    if (!piece) return;
    setDeleting(true);
    try {
      await deletePiece(piece.id);
      navigate('/calendario');
    } catch (failure) {
      setDeleting(false);
      setConfirmingDelete(false);
      setNotice({
        message: errorMessage(failure, 'No se pudo eliminar.'),
        kind: 'error',
      });
    }
  }

  function goBack() {
    // Salir con cambios sin guardar es una forma silenciosa de perder trabajo.
    if (hasChanges && !window.confirm('Tienes cambios sin guardar. ¿Salir igualmente?')) {
      return;
    }
    navigate('/calendario');
  }

  return (
    <>
      <title>Detalle de pieza — BrandDNA</title>
      <meta name="robots" content="noindex, nofollow" />
      <button className={s.volver} onClick={goBack}>
        ← Volver al calendario
      </button>

      {loading && <div className={s.cargando}>Cargando…</div>}

      {error && !loading && (
        <div className={s.aviso} role="alert">
          {error}
        </div>
      )}

      {piece && !loading && (
        <>
          <div className={s.meta}>
            <span
              className={s.punto}
              style={{ background: STATUS_COLORS[piece.status].color }}
            />
            {piece.channel} · {PIECE_TYPE_LABELS[piece.piece_type]}
          </div>
          <div className={s.tema}>{piece.topic}</div>

          <section className={s.seccion}>
            <div className={s.seccionTitulo}>Texto</div>
            <textarea
              className={s.editor}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Texto de la pieza"
            />
            <div className={s.contador}>{text.length} caracteres</div>

            {slipped.length > 0 && (
              <div className={s.avisoProhibidas} role="status">
                <span aria-hidden="true">⚠</span>
                <span>
                  Este texto usa {slipped.length === 1 ? 'una palabra' : 'palabras'} que
                  pediste evitar: <strong>{slipped.join(', ')}</strong>.
                </span>
              </div>
            )}
          </section>

          <section className={s.seccion}>
            <div className={s.seccionTitulo} id="etiqueta-estado">
              Estado
            </div>
            <div className={s.estados} role="group" aria-labelledby="etiqueta-estado">
              {PIECE_STATUSES.map((option) => {
                const isActive = option === status;
                return (
                  <button
                    key={option}
                    type="button"
                    className={s.estado}
                    aria-pressed={isActive}
                    onClick={() => setStatus(option)}
                    style={
                      isActive
                        ? {
                            borderColor: STATUS_COLORS[option].color,
                            background: STATUS_COLORS[option].soft,
                            color: STATUS_COLORS[option].color,
                          }
                        : undefined
                    }
                  >
                    {STATUS_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={s.seccion}>
            <div className={s.seccionTitulo}>Fecha programada</div>
            <DateStepper value={date} onChange={setDate} />
          </section>

          {hasChanges ? (
            <div className={s.barra}>
              <button className={s.guardar} onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button className={s.descartar} onClick={discard} disabled={saving}>
                Descartar
              </button>
            </div>
          ) : (
            <div className={s.sinCambios}>Todo guardado.</div>
          )}

          <section className={s.zonaBorrado}>
            {confirmingDelete ? (
              <div className={s.confirmacion}>
                <div className={s.confirmacionTexto}>
                  Se eliminará esta pieza y desaparecerá del calendario. No se puede
                  deshacer.
                </div>
                <div className={s.confirmacionAcciones}>
                  <button
                    className={s.confirmarBorrado}
                    onClick={remove}
                    disabled={deleting}
                  >
                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button
                    className={s.cancelar}
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button className={s.borrar} onClick={() => setConfirmingDelete(true)}>
                Eliminar pieza
              </button>
            )}
          </section>
        </>
      )}

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
