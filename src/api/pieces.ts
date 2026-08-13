/*
  Piezas de contenido y calendario.
*/

import { request } from './client';
import type { ContentPiece, ContentPieceInput, ContentPieceUpdate } from './types';

/**
 * Lista las piezas de un perfil en orden de calendario.
 *
 * El backend ordena por `scheduled_date` dejando los nulos al final: primero
 * lo que ya está planificado, después lo que falta por ubicar.
 */
export function listPieces(
  profileId: string,
  signal?: AbortSignal
): Promise<ContentPiece[]> {
  const query = new URLSearchParams({ profile_id: profileId });
  return request<ContentPiece[]>(`/pieces?${query}`, { signal });
}

/**
 * Guarda la opción que el usuario eligió.
 *
 * Nace sin fecha (`scheduled_date: null`) salvo que se indique otra cosa: la
 * pieza existe antes de programarse, que es el Flujo 3 del PRD.
 */
export function createPiece(data: ContentPieceInput): Promise<ContentPiece> {
  return request<ContentPiece>('/pieces', { method: 'POST', body: data });
}

/** Cambia texto, fecha o estado. Lo que no se envía, no se toca. */
export function updatePiece(
  id: string,
  changes: ContentPieceUpdate
): Promise<ContentPiece> {
  return request<ContentPiece>(`/pieces/${id}`, { method: 'PUT', body: changes });
}

export function deletePiece(id: string): Promise<void> {
  return request<void>(`/pieces/${id}`, { method: 'DELETE' });
}
