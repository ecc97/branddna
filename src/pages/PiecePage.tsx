/*
  Detalle de una pieza. Versión mínima: el paso 6 añade edición de texto,
  cambio de estado, programación de fecha y borrado.

  Nota sobre cómo se carga: el backend **no tiene `GET /pieces/{id}`**, solo
  el listado por perfil. Así que se pide la lista y se busca el id. Funciona y
  soporta recargar la página o entrar por enlace directo, pero trae de más.
  Con pocas piezas es irrelevante; si el calendario creciera, el arreglo es
  añadir ese endpoint al backend, no cachear aquí.
*/

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  ApiError,
  PIECE_TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  listarPiezas,
  type ContentPiece,
} from '../api';
import { fechaLarga } from '../lib/fechas';
import { usePerfilActivo } from '../profile/profile-context';
import s from './PiecePage.module.css';

export function PiecePage() {
  const perfil = usePerfilActivo();
  const navegar = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [pieza, setPieza] = useState<ContentPiece | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const todas = await listarPiezas(perfil.id, controlador.signal);
        const encontrada = todas.find((p) => p.id === id) ?? null;
        setPieza(encontrada);
        if (!encontrada) setError('Esta pieza ya no existe.');
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
  }, [perfil.id, id]);

  return (
    <>
      <button className={s.volver} onClick={() => navegar('/calendario')}>
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
            {pieza.channel} · {PIECE_TYPE_LABELS[pieza.piece_type]} ·{' '}
            {STATUS_LABELS[pieza.status]}
          </div>

          <div className={s.tema}>{pieza.topic}</div>

          <div className={s.texto}>{pieza.generated_text}</div>

          <div className={s.fecha}>
            {pieza.scheduled_date
              ? `Programada para el ${fechaLarga(pieza.scheduled_date)}`
              : 'Sin fecha programada'}
          </div>

          <div className={s.pendiente}>
            Editar el texto, cambiar el estado, poner fecha y eliminar llegan en el
            paso 6.
          </div>
        </>
      )}
    </>
  );
}
