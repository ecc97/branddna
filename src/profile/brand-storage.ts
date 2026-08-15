/*
  Lo que este navegador recuerda sobre las marcas.

  Está separado del provider por dos motivos: se puede probar sin React, y
  concentra en un sitio todo el manejo de `localStorage`, que es propenso a
  fallar de formas silenciosas.

  ── Todo va envuelto en try/catch ─────────────────────────────────────────

  En modo incógnito, con el almacenamiento lleno o bloqueado por el navegador,
  `localStorage` lanza excepción. La app tiene que seguir funcionando: se
  pierde la persistencia, no la sesión. Y si alguien manipuló las claves a
  mano, se descartan en vez de reventar el arranque.
*/

import {
  ACTIVE_BRAND_KEY,
  KNOWN_BRANDS_KEY,
  LEGACY_TOKENS_KEY,
  type KnownBrand,
} from './profile-context';

/** `{ [id]: { name, token } }` tal como se guarda. */
type StoredBrands = Record<string, { name: string; token: string }>;

function isValidEntry(value: unknown): value is { name: string; token: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { token?: unknown }).token === 'string' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

/**
 * Convierte el formato anterior —`{ [id]: token }`, sin nombres— al actual.
 *
 * Existe para que quien ya estaba usando la app no se quede fuera de sus
 * marcas al desplegar este cambio. El nombre queda vacío y se rellena en
 * cuanto se entra en la marca, porque ahí sí llega del servidor.
 */
function migrateLegacyTokens(): StoredBrands {
  try {
    const raw = localStorage.getItem(LEGACY_TOKENS_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};

    const migrated: StoredBrands = {};
    for (const [id, token] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof token === 'string' && token) migrated[id] = { name: '', token };
    }

    localStorage.setItem(KNOWN_BRANDS_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_TOKENS_KEY);
    return migrated;
  } catch {
    return {};
  }
}

export function readKnownBrands(): StoredBrands {
  try {
    const raw = localStorage.getItem(KNOWN_BRANDS_KEY);
    if (!raw) return migrateLegacyTokens();

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};

    // Se filtran las entradas corruptas en vez de confiar en el JSON: esta
    // clave es editable por cualquiera desde las herramientas del navegador.
    const clean: StoredBrands = {};
    for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidEntry(entry)) clean[id] = entry;
    }
    return clean;
  } catch {
    return {};
  }
}

export function writeKnownBrands(brands: StoredBrands): void {
  try {
    localStorage.setItem(KNOWN_BRANDS_KEY, JSON.stringify(brands));
  } catch {
    /* sin persistencia, pero la sesión actual funciona */
  }
}

/** Ordenadas por nombre, para que la lista no baile entre recargas. */
export function toBrandList(brands: StoredBrands): KnownBrand[] {
  return Object.entries(brands)
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function readActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BRAND_KEY);
  } catch {
    return null;
  }
}

export function writeActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_BRAND_KEY, id);
    else localStorage.removeItem(ACTIVE_BRAND_KEY);
  } catch {
    /* sin persistencia, pero la sesión actual funciona */
  }
}
