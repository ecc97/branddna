/*
  Resaltado de palabras prohibidas dentro del texto generado.

  Solo la parte de renderizado: el algoritmo vive en `prohibidas-core.ts`,
  que se puede ejecutar y comparar con el del backend sin React de por medio.
*/

import type { ReactNode } from 'react';

import { findRanges } from './forbidden-core';
import s from './forbidden.module.css';

export { findForbidden } from './forbidden-core';

/** Devuelve el texto con los términos prohibidos envueltos en <mark>. */
export function highlightForbidden(text: string, terms: string[]): ReactNode {
  const ranges = findRanges(text, terms);
  if (!ranges.length) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={`${start}-${index}`} className={s.marca}>
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return parts;
}
