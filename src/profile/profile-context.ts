/*
  Marca activa y las marcas que conoce este navegador.

  ── El cambio de modelo ───────────────────────────────────────────────────

  Antes la app pedía al servidor la lista de marcas y el usuario elegía de ahí.
  Eso tenía dos problemas: el servidor revelaba a cualquiera qué negocios usan
  la app, y la lista crecía con la base de datos aunque al usuario solo le
  importaran una o dos.

  Ahora **el navegador es quien sabe qué marcas conoce**. Guarda un registro
  `{ id, nombre, llave }` de cada una, y para entrar en otra hace falta su
  código de acceso. El servidor ya no lista nada.

  Consecuencias que conviene tener presentes:

  - La lista del inicio está acotada por lo que este navegador ha visto —una o
    tres— y no por el tamaño de la base. No hace falta paginar.
  - "No hay marcas" pasa a significar "este navegador no conoce ninguna", no
    "la base está vacía". Los textos lo dicen así.
  - Arrancar sin marcas conocidas **no toca la red**: la app abre al instante.
*/

import { createContext, useContext } from 'react';

import type { BrandProfile } from '../api';

/** Última marca usada, para no preguntar en cada recarga. */
export const ACTIVE_BRAND_KEY = 'branddna-profile-id';

/** Registro de marcas conocidas: `{ [id]: { name, token } }`. */
export const KNOWN_BRANDS_KEY = 'branddna-brands';

/** Clave anterior, solo con llaves. Se migra al arrancar y se descarta. */
export const LEGACY_TOKENS_KEY = 'branddna-brand-tokens';

export interface KnownBrand {
  id: string;
  /** Nombre cacheado para poder listar sin llamar al servidor. */
  name: string;
  token: string;
}

export type ProfileState =
  /** Comprobando la marca recordada contra el servidor. */
  | 'loading'
  /** El backend no responde. */
  | 'error'
  /** Sin marca activa: toca elegir una conocida, entrar con código o crear. */
  | 'choosing'
  /** Hay marca activa y la app puede funcionar. */
  | 'ready';

export interface ProfileContextValue {
  state: ProfileState;
  error: string | null;
  /** Marcas que este navegador recuerda. Nunca viene del servidor. */
  knownBrands: KnownBrand[];
  activeProfile: BrandProfile | null;
  activeToken: string | null;
  /** Código de acceso de la marca activa, listo para copiar. */
  activeCode: string | null;

  /**
   * Entra en una marca conocida. Devuelve `null` si entró, o un mensaje en
   * español si la llave ya no vale o la marca no existe.
   */
  enterBrand: (profileId: string) => Promise<string | null>;
  /** Entra con un código pegado. Mismo contrato de retorno. */
  enterWithCode: (code: string) => Promise<string | null>;
  /** Registra una marca recién creada (con su llave) o actualizada. */
  registerProfile: (profile: BrandProfile, token?: string) => void;
  /** Olvida una marca en ESTE navegador. No la borra del servidor. */
  forgetBrand: (profileId: string) => void;
  /** Reintenta la comprobación inicial tras un error de red. */
  reload: () => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile debe usarse dentro de <ProfileProvider>');
  }
  return context;
}

/**
 * Igual que `useProfile`, pero garantiza que hay una marca activa.
 *
 * Para las pantallas que solo se montan con `state === 'ready'`. Así no
 * comprueban `null` en cada línea, y si alguna vez se montaran antes de tiempo
 * el error sería inmediato y claro en vez de un `undefined` propagándose.
 */
export function useActiveProfile(): BrandProfile {
  const { activeProfile } = useProfile();
  if (!activeProfile) {
    throw new Error('No hay marca activa: esta pantalla no debería estar montada.');
  }
  return activeProfile;
}
