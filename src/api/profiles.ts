/*
  Endpoints del perfil de marca.

  No hay función de listado: el backend ya no enumera marcas. Las que conoce
  este navegador salen de `profile/brand-storage.ts`, y para entrar en otra
  hace falta su código de acceso.
*/

import { request } from './client';
import type {
  BrandProfile,
  BrandProfileCreated,
  BrandProfileInput,
  BrandProfileUpdate,
  TokenRotated,
} from './types';

/**
 * Perfil completo. Exige la llave.
 *
 * `brandToken` permite comprobar una llave que el usuario acaba de pegar,
 * antes de que esa marca sea la activa.
 */
export function getProfile(
  id: string,
  options: { signal?: AbortSignal; brandToken?: string } = {}
): Promise<BrandProfile> {
  return request<BrandProfile>(`/profiles/${id}`, options);
}

/**
 * Crea la marca y **devuelve su llave una sola vez**.
 *
 * A partir de aquí el backend solo guarda el hash: ni él mismo puede volver a
 * mostrarla. Si el usuario la pierde, solo queda rotarla desde la app estando
 * dentro.
 */
export function createProfile(data: BrandProfileInput): Promise<BrandProfileCreated> {
  return request<BrandProfileCreated>('/profiles', { method: 'POST', body: data });
}

/**
 * Actualización parcial: solo se envían los campos que cambian.
 *
 * Importante (regla del PRD): esto NO reescribe las piezas ya guardadas.
 * El perfil es contexto para generar contenido nuevo, no una plantilla que se
 * reaplique a lo que ya se aprobó.
 */
export function updateProfile(
  id: string,
  changes: BrandProfileUpdate
): Promise<BrandProfile> {
  return request<BrandProfile>(`/profiles/${id}`, { method: 'PUT', body: changes });
}

/**
 * Elimina la marca y, en cascada, todas sus piezas.
 *
 * **Irreversible**: este proyecto no tiene copias de seguridad configuradas en
 * Supabase, así que no hay de dónde restaurar. La interfaz lo dice y exige
 * escribir el nombre de la marca antes de llamar aquí.
 */
export function deleteProfile(id: string): Promise<void> {
  return request<void>(`/profiles/${id}`, { method: 'DELETE' });
}

/**
 * Emite una llave nueva e invalida la anterior al instante.
 *
 * Exige la llave actual: si bastara con el id, rotar sería una forma de robar
 * la marca en vez de una forma de protegerla.
 */
export function rotateToken(id: string): Promise<TokenRotated> {
  return request<TokenRotated>(`/profiles/${id}/rotate-token`, { method: 'POST' });
}
