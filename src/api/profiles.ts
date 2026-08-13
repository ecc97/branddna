/*
  Endpoints del perfil de marca.

  `listProfiles()` no estaba en el contrato original del backend. Se añadió
  porque sin autenticación el frontend no tiene forma de saber qué perfil le
  corresponde al abrir la app: necesita listarlos y elegir.

  Ese listado es **público y devuelve solo id y nombre**. Todo lo demás —tono,
  prohibiciones, ejemplos— exige la llave de esa marca.
*/

import { request } from './client';
import type {
  BrandProfile,
  BrandProfileCreated,
  BrandProfileInput,
  BrandProfileSummary,
  BrandProfileUpdate,
  TokenRotated,
} from './types';

export function listProfiles(signal?: AbortSignal): Promise<BrandProfileSummary[]> {
  return request<BrandProfileSummary[]>('/profiles', { signal });
}

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
 * Emite una llave nueva e invalida la anterior al instante.
 *
 * Exige la llave actual: si bastara con el id, rotar sería una forma de robar
 * la marca en vez de una forma de protegerla.
 */
export function rotateToken(id: string): Promise<TokenRotated> {
  return request<TokenRotated>(`/profiles/${id}/rotate-token`, { method: 'POST' });
}
