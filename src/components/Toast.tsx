/*
  Aviso flotante temporal.

  `role="status"` y `aria-live="polite"` hacen que un lector de pantalla lo
  anuncie sin interrumpir lo que el usuario esté haciendo. Un aviso que solo
  se ve deja fuera a quien no puede verlo.
*/

import { useEffect, useRef } from 'react';

import s from './Toast.module.css';

export interface Aviso {
  mensaje: string;
  tipo?: 'ok' | 'error';
}

interface ToastProps {
  aviso: Aviso | null;
  onCerrar: () => void;
  duracionMs?: number;
}

export function Toast({ aviso, onCerrar, duracionMs = 2800 }: ToastProps) {
  /*
    `onCerrar` se guarda en una ref y NO se pone como dependencia del efecto.

    Motivo: quien usa este componente escribe `onCerrar={() => setAviso(null)}`,
    una función nueva en cada render. Si estuviera en las dependencias, el
    efecto se volvería a ejecutar en cada render del padre y el temporizador
    empezaría de cero cada vez — el aviso podría quedarse en pantalla para
    siempre mientras algo se re-renderice.
  */
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => alCerrar.current(), duracionMs);
    // Si llega otro aviso antes de que expire el anterior, se cancela el
    // temporizador viejo: si no, el nuevo desaparecería antes de tiempo.
    return () => clearTimeout(temporizador);
  }, [aviso, duracionMs]);

  if (!aviso) return null;

  return (
    <div className={aviso.tipo === 'error' ? s.error : s.toast} role="status" aria-live="polite">
      {aviso.mensaje}
    </div>
  );
}
