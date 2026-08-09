/*
  Resaltado de palabras prohibidas dentro del texto generado.

  Solo la parte de renderizado: el algoritmo vive en `prohibidas-core.ts`,
  que se puede ejecutar y comparar con el del backend sin React de por medio.
*/

import type { ReactNode } from 'react';

import { buscarRangos } from './prohibidas-core';
import s from './prohibidas.module.css';

export { encontrarProhibidas } from './prohibidas-core';

/** Devuelve el texto con los términos prohibidos envueltos en <mark>. */
export function resaltarProhibidas(texto: string, terminos: string[]): ReactNode {
  const rangos = buscarRangos(texto, terminos);
  if (!rangos.length) return texto;

  const partes: ReactNode[] = [];
  let cursor = 0;
  rangos.forEach(([inicio, fin], indice) => {
    if (inicio > cursor) partes.push(texto.slice(cursor, inicio));
    partes.push(
      <mark key={`${inicio}-${indice}`} className={s.marca}>
        {texto.slice(inicio, fin)}
      </mark>
    );
    cursor = fin;
  });
  if (cursor < texto.length) partes.push(texto.slice(cursor));

  return partes;
}
