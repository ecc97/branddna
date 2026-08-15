/*
  Eliminar una marca.

  ── Por qué se confirma escribiendo el nombre ─────────────────────────────

  Un "¿estás seguro?" se acepta sin leerlo: es un reflejo, no una decisión.
  Escribir el nombre de la marca obliga a mirar qué se va a borrar, y hace
  imposible confirmarlo por inercia.

  Y hace falta esa barrera porque **esto no se puede deshacer**: el plan de
  Supabase de este proyecto no incluye recuperación a un punto en el tiempo, así
  que no hay copia de la que restaurar. La interfaz lo dice con esas palabras
  en vez de esconderlo, que es lo honesto cuando no hay red de seguridad.

  El borrado de las piezas lo hace Postgres en cascada, no este componente.
*/

import { useState } from 'react';

import s from './DeleteBrand.module.css';

interface DeleteBrandProps {
  businessName: string;
  /** Cuántas piezas se perderán. Se dice el número, no "todo tu contenido". */
  pieceCount: number | null;
  /** Devuelve un mensaje de error, o `null` si se eliminó. */
  onDelete: () => Promise<string | null>;
}

export function DeleteBrand({ businessName, pieceCount, onDelete }: DeleteBrandProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparación tolerante con espacios sobrantes y mayúsculas: la barrera es
  // que el usuario lea el nombre, no que lo teclee con exactitud pericial.
  const matches =
    confirmation.trim().toLocaleLowerCase('es') ===
    businessName.trim().toLocaleLowerCase('es');

  async function remove() {
    setDeleting(true);
    setError(null);
    const failure = await onDelete();
    setDeleting(false);
    if (failure) setError(failure);
    // Si se eliminó, este componente se desmonta: no hay que limpiar nada.
  }

  if (!open) {
    return (
      <div className={s.zona}>
        <div className={s.titulo}>Eliminar esta marca</div>
        <p className={s.texto}>
          Se borrarán la marca y todo su contenido. No se puede deshacer.
        </p>
        <button type="button" className={s.abrir} onClick={() => setOpen(true)}>
          Eliminar «{businessName}»
        </button>
      </div>
    );
  }

  return (
    <div className={s.zonaAbierta}>
      <div className={s.titulo}>Eliminar «{businessName}»</div>

      <p className={s.texto}>
        Se borrarán la marca
        {pieceCount === null
          ? ' y todas sus piezas'
          : pieceCount === 1
            ? ' y su única pieza'
            : ` y sus ${pieceCount} piezas`}
        .
      </p>

      <p className={s.advertencia}>
        <strong>Esto no se puede deshacer.</strong> Este proyecto no tiene copias de
        seguridad configuradas en Supabase, así que no hay nada de donde restaurar.
      </p>

      <label className={s.etiqueta} htmlFor="confirmar-borrado">
        Escribe <strong>{businessName}</strong> para confirmar
      </label>
      <input
        id="confirmar-borrado"
        className={s.campo}
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder={businessName}
        autoComplete="off"
        autoFocus
      />

      <div className={s.acciones}>
        <button
          type="button"
          className={s.confirmar}
          onClick={remove}
          disabled={!matches || deleting}
        >
          {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
        </button>
        <button
          type="button"
          className={s.cancelar}
          onClick={() => {
            setOpen(false);
            setConfirmation('');
            setError(null);
          }}
          disabled={deleting}
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className={s.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
