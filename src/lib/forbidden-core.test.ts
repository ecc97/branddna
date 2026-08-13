/*
  Tests de la detección de palabras prohibidas en el cliente.

  Estos casos son **los mismos** que cubren `backend/tests/test_brand_guard.py`
  y el script de paridad. Están aquí para que, si alguien toca este algoritmo,
  la divergencia con el backend salte al momento y no en producción.

  El backend sigue siendo la autoridad al generar; esto resalta y comprueba en
  vivo mientras el usuario edita.
*/

import { describe, expect, it } from 'vitest';

import { findForbidden, normalizePreservingLength } from './forbidden-core';

const TERMS = ['gourmet', 'premium'];

describe('detección', () => {
  it.each([
    ['Nuestro pan Gourmet es el mejor', ['gourmet']],
    ['Pan artesanal recién horneado', []],
    ['productos premium y gourmets de la casa', ['gourmet', 'premium']],
    // Mayúsculas y tildes no deben servir para esquivar el control.
    ['Pan GOURMÉT con tilde', ['gourmet']],
    // Plural: 'gourmets' cuenta como 'gourmet'.
    ['dos panes gourmets', ['gourmet']],
    // Límite de palabra: 'gourmetizado' es otra palabra.
    ['un proceso gourmetizado distinto', []],
    // Texto con emojis, que es lo normal en estos copys.
    ['🍞 Pan gourmet recién horneado ❤️ ¡pasa!', ['gourmet']],
  ])('%s', (text, expected) => {
    expect(findForbidden(text, TERMS).sort()).toEqual([...expected].sort());
  });

  it('sin términos no marca nada', () => {
    expect(findForbidden('cualquier texto gourmet premium', [])).toEqual([]);
  });

  it('texto vacío no marca nada', () => {
    expect(findForbidden('', TERMS)).toEqual([]);
  });

  it('acepta términos de varias palabras', () => {
    expect(findForbidden('servicio de mala calidad', ['de mala calidad'])).toEqual([
      'de mala calidad',
    ]);
  });
});

describe('la ñ es una letra propia, no una n con virgulilla', () => {
  it('«año» NO coincide con el término «ano»', () => {
    // Si la ñ se descompusiera, una marca que prohíbe "ano" empezaría a marcar
    // cualquier texto que dijera "año". Es un falso positivo real.
    expect(findForbidden('Este año el niño trajo pan', ['ano'])).toEqual([]);
  });

  it('«año» sí coincide con el término «año»', () => {
    expect(findForbidden('Este año el niño trajo pan', ['año'])).toEqual(['año']);
  });

  it('normalizar conserva la ñ y quita las tildes', () => {
    expect(normalizePreservingLength('PANADERÍA Ñoño')).toBe('panaderia ñoño');
  });
});

describe('normalización que conserva la longitud', () => {
  /*
    Es la propiedad de la que depende el resaltado: los índices que devuelve la
    búsqueda se usan para cortar el texto ORIGINAL. Si la longitud cambiara,
    se resaltaría el trozo equivocado.
  */
  it.each([
    'Pan recién horneado',
    'GOURMÉT con tilde',
    '🍞 emojis ❤️ y más 🎉',
    'Ñandú, año, niño',
    'ÁÉÍÓÚ áéíóú üÜ',
  ])('conserva la longitud de %s', (text) => {
    expect(normalizePreservingLength(text)).toHaveLength(text.length);
  });
});
