/*
  Detección de palabras prohibidas: lógica pura, sin React.

  Está separado de `prohibidas.tsx` para poder ejecutarlo y compararlo con el
  algoritmo del backend (`backend/app/services/brand_guard.py`) sin arrastrar
  React ni CSS. Un algoritmo que no se puede probar aislado acaba divergiendo
  del original sin que nadie se entere.

  ¿Por qué repetir en el cliente algo que el backend ya hace?

  El backend sigue siendo la autoridad: comprueba al generar y, si hace falta,
  le pide al modelo que corrija. Esto cubre dos cosas que desde el servidor no
  se pueden hacer:

  1. **Señalar dónde está la palabra.** El backend dice qué términos se
     colaron, no en qué posición. Verla marcada dentro del copy es mucho más
     útil que leer una lista.
  2. **Reaccionar mientras el usuario edita.** Si al retocar una opción escribe
     una palabra prohibida, el aviso sale al momento, sin volver a la API.

  Replica el algoritmo del backend: minúsculas, sin tildes pero conservando la
  ñ (en español es una letra propia, no una n con virgulilla), límite de
  palabra y plural común.
*/

/**
 * Normaliza conservando la longitud: cada unidad de la cadena original
 * produce exactamente una en la salida.
 *
 * Es imprescindible porque los índices que devuelve la búsqueda se usan para
 * cortar el texto ORIGINAL. Un `normalize('NFD')` sobre la cadena entera
 * cambiaría la longitud (á → a + tilde) y desplazaría todos los recortes.
 *
 * Se recorre por unidad UTF-16 y no con `for...of` a propósito: `for...of`
 * itera por punto de código, así que un emoji contaría como uno cuando ocupa
 * dos posiciones. Estos copys llevan emojis casi siempre.
 */
export function normalizePreservingLength(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === 'ñ' || char === 'Ñ') {
      out += 'ñ';
      continue;
    }
    // \p{Mn} = «Mark, nonspacing»: las marcas diacríticas combinantes.
    // Se usa la propiedad Unicode con nombre en vez de un rango como
    // [U+0300-U+036F] porque ese rango obliga a escribir caracteres
    // invisibles en el código, que cualquier copia o formateo rompe.
    const base = char.normalize('NFD').replace(/\p{Mn}/gu, '');
    out += (base || char).toLowerCase();
  }
  return out;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternFor(term: string, isGlobal: boolean): RegExp {
  return new RegExp(
    `\\b${escapeRegex(normalizePreservingLength(term))}(?:es|s)?\\b`,
    isGlobal ? 'g' : ''
  );
}

export type MatchRange = [start: number, end: number];

export function findRanges(text: string, terms: string[]): MatchRange[] {
  if (!terms.length || !text) return [];

  const normalized = normalizePreservingLength(text);
  // Si la normalización desplazó algo, es preferible no resaltar nada a
  // resaltar el trozo equivocado.
  if (normalized.length !== text.length) return [];

  const ranges: MatchRange[] = [];
  for (const term of terms) {
    const pattern = patternFor(term, true);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(normalized)) !== null) {
      ranges.push([match.index, match.index + match[0].length]);
      // Evita un bucle infinito si el patrón llegara a casar cadena vacía.
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
    }
  }

  // Ordenar y fusionar solapamientos: dos términos pueden pisarse.
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: MatchRange[] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** Términos de la lista que aparecen en el texto. */
export function findForbidden(text: string, terms: string[]): string[] {
  if (!terms.length || !text) return [];
  const normalized = normalizePreservingLength(text);
  return terms.filter((term) => patternFor(term, false).test(normalized));
}
