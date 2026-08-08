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
export function listarPiezas(
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
export function crearPieza(datos: ContentPieceInput): Promise<ContentPiece> {
  return request<ContentPiece>('/pieces', { method: 'POST', body: datos });
}

/** Cambia texto, fecha o estado. Lo que no se envía, no se toca. */
export function actualizarPieza(
  id: string,
  cambios: ContentPieceUpdate
): Promise<ContentPiece> {
  return request<ContentPiece>(`/pieces/${id}`, { method: 'PUT', body: cambios });
}

export function eliminarPieza(id: string): Promise<void> {
  return request<void>(`/pieces/${id}`, { method: 'DELETE' });
}
