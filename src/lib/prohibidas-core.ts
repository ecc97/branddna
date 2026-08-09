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
export function normalizarConservandoLongitud(texto: string): string {
  let salida = '';
  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (caracter === 'ñ' || caracter === 'Ñ') {
      salida += 'ñ';
      continue;
    }
    // \p{Mn} = «Mark, nonspacing»: las marcas diacríticas combinantes.
    // Se usa la propiedad Unicode con nombre en vez de un rango como
    // [U+0300-U+036F] porque ese rango obliga a escribir caracteres
    // invisibles en el código, que cualquier copia o formateo rompe.
    const base = caracter.normalize('NFD').replace(/\p{Mn}/gu, '');
    salida += (base || caracter).toLowerCase();
  }
  return salida;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patronDe(termino: string, global: boolean): RegExp {
  return new RegExp(
    `\\b${escaparRegex(normalizarConservandoLongitud(termino))}(?:es|s)?\\b`,
    global ? 'g' : ''
  );
}

export type Rango = [inicio: number, fin: number];

export function buscarRangos(texto: string, terminos: string[]): Rango[] {
  if (!terminos.length || !texto) return [];

  const normalizado = normalizarConservandoLongitud(texto);
  // Si la normalización desplazó algo, es preferible no resaltar nada a
  // resaltar el trozo equivocado.
  if (normalizado.length !== texto.length) return [];

  const rangos: Rango[] = [];
  for (const termino of terminos) {
    const patron = patronDe(termino, true);
    let coincidencia: RegExpExecArray | null;
    while ((coincidencia = patron.exec(normalizado)) !== null) {
      rangos.push([coincidencia.index, coincidencia.index + coincidencia[0].length]);
      // Evita un bucle infinito si el patrón llegara a casar cadena vacía.
      if (coincidencia.index === patron.lastIndex) patron.lastIndex++;
    }
  }

  // Ordenar y fusionar solapamientos: dos términos pueden pisarse.
  rangos.sort((a, b) => a[0] - b[0]);
  const fusionados: Rango[] = [];
  for (const [inicio, fin] of rangos) {
    const ultimo = fusionados[fusionados.length - 1];
    if (ultimo && inicio <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], fin);
    else fusionados.push([inicio, fin]);
  }
  return fusionados;
}

/** Términos de la lista que aparecen en el texto. */
export function encontrarProhibidas(texto: string, terminos: string[]): string[] {
  if (!terminos.length || !texto) return [];
  const normalizado = normalizarConservandoLongitud(texto);
  return terminos.filter((termino) => patronDe(termino, false).test(normalizado));
}
