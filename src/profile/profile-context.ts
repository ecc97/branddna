/*
  Perfil de marca activo y su llave de acceso.

  El problema que resuelve: no hay autenticación (el PRD la deja fuera de
  alcance), así que al abrir la app no existe ningún "usuario actual" del que
  deducir el perfil. Y desde que cada marca tiene llave, tampoco basta con
  recordar un id: hay que recordar también la llave que abre ese id.

  Estrategia:
  - `GET /profiles` da la lista pública (solo id y nombre) para poder ofrecer
    un selector.
  - El navegador guarda un mapa `{ id: llave }` de las marcas que conoce.
  - El id recordado se contrasta **siempre** contra la lista: si alguien borró
    ese perfil en Supabase, la app estaría pidiendo un id fantasma.
  - Si la llave guardada deja de valer (rotada desde otro navegador), el 403 la
    descarta y se vuelve a pedir.

  Contexto y hook viven separados del provider por lo mismo que en el tema:
  un archivo que exporta un componente y otras cosas rompe React Fast Refresh.
*/

import { createContext, useContext } from 'react';

import type { BrandProfile, BrandProfileSummary } from '../api';

export const PROFILE_STORAGE_KEY = 'branddna-profile-id';

/** Mapa `{ profileId: token }` de las marcas que conoce este navegador. */
export const TOKENS_STORAGE_KEY = 'branddna-brand-tokens';

export type ProfileState =
  /** Consultando la lista de marcas. */
  | 'loading'
  /** No se pudo hablar con el backend. */
  | 'error'
  /** No hay ninguna marca todavía: toca crear la primera. */
  | 'no-profiles'
  /** Hay marcas, pero ninguna activa: hay que elegir y quizá pegar su llave. */
  | 'choosing'
  /** Hay marca activa y la app puede funcionar. */
  | 'ready';

export interface ProfileContextValue {
  state: ProfileState;
  error: string | null;
  /** Listado público: solo id y nombre. */
  profiles: BrandProfileSummary[];
  /** Perfil completo de la marca activa. Requiere llave. */
  activeProfile: BrandProfile | null;
  /** Llave de la marca activa, para poder mostrarla en «Mi marca». */
  activeToken: string | null;
  /** Si este navegador recuerda la llave de esa marca. */
  hasKeyFor: (id: string) => boolean;
  /**
   * Entra en una marca. Si no se pasa llave, se usa la recordada.
   * Devuelve `null` si entró, o un mensaje en español si la llave no vale.
   */
  selectProfile: (id: string, token?: string) => Promise<string | null>;
  /** Registra una marca recién creada (con su llave) o actualizada. */
  registerProfile: (profile: BrandProfile, token?: string) => void;
  /** Vuelve a consultar la lista al backend. */
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
 * Igual que `useProfile`, pero garantiza que hay un perfil activo.
 *
 * Sirve para las pantallas que solo se montan cuando el estado es 'ready'
 * (generador, calendario). Así no tienen que comprobar `null` en cada línea:
 * si alguna vez se montaran antes de tiempo, el error sería inmediato y claro
 * en vez de un `undefined` propagándose.
 */
export function useActiveProfile(): BrandProfile {
  const { activeProfile } = useProfile();
  if (!activeProfile) {
    throw new Error('No hay perfil activo: esta pantalla no debería estar montada.');
  }
  return activeProfile;
}
