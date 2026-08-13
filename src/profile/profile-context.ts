/*
  Perfil de marca activo.

  El problema que resuelve: no hay autenticación (el PRD la deja fuera de
  alcance), así que al abrir la app no existe ningún "usuario actual" del que
  deducir el perfil. Hay que resolverlo en el cliente.

  La estrategia es: recordar el último perfil elegido en `localStorage` y
  contrastarlo siempre contra `GET /profiles`. Nunca se confía en el id
  guardado sin comprobar que sigue existiendo — si alguien borró ese perfil
  desde Supabase, la app se quedaría pidiendo un id fantasma.

  Contexto y hook viven separados del provider por lo mismo que en el tema:
  un archivo que exporta un componente y otras cosas rompe React Fast Refresh.
*/

import { createContext, useContext } from 'react';

import type { BrandProfile } from '../api';

export const PROFILE_STORAGE_KEY = 'branddna-profile-id';

export type ProfileState =
  /** Consultando la lista de perfiles. */
  | 'cargando'
  /** No se pudo hablar con el backend. */
  | 'error'
  /** No hay ningún perfil todavía: toca crear el primero. */
  | 'sin-perfiles'
  /** Hay varios y ninguno recordado: el usuario tiene que elegir. */
  | 'eligiendo'
  /** Hay un perfil activo y la app puede funcionar. */
  | 'listo';

export interface ProfileContextValue {
  state: ProfileState;
  error: string | null;
  profiles: BrandProfile[];
  activeProfile: BrandProfile | null;
  /** Elige un perfil de la lista y lo recuerda. */
  selectProfile: (id: string) => void;
  /** Registra un perfil recién creado o actualizado como el activo. */
  registerProfile: (profile: BrandProfile) => void;
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
 * Sirve para las pantallas que solo se montan cuando el estado es 'listo'
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
