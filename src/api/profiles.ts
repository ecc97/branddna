/*
  Endpoints del perfil de marca.

  `listar()` no estaba en el contrato original del backend. Se añadió porque
  sin autenticación el frontend no tiene forma de saber qué perfil le
  corresponde al abrir la app: necesita listarlos y elegir.
*/

import { request } from './client';
import type { BrandProfile, BrandProfileInput, BrandProfileUpdate } from './types';

export function listProfiles(signal?: AbortSignal): Promise<BrandProfile[]> {
  return request<BrandProfile[]>('/profiles', { signal });
}

export function getProfile(id: string, signal?: AbortSignal): Promise<BrandProfile> {
  return request<BrandProfile>(`/profiles/${id}`, { signal });
}

export function createProfile(data: BrandProfileInput): Promise<BrandProfile> {
  return request<BrandProfile>('/profiles', { method: 'POST', body: data });
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
