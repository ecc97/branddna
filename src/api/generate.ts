/*
  Generación de contenido.

  Este endpoint **no guarda nada**, por diseño: separa "proponer opciones" de
  "confirmar la elegida". Lo que el usuario descarta no ensucia su calendario.
  Para guardar la elegida se usa `crearPieza()` de `pieces.ts`.
*/

import { request } from './client';
import type { GenerateRequest, GenerateResponse } from './types';

/**
 * Timeout generoso: por dentro esto llama a Groq, que tarda varios segundos,
 * y si detecta palabras prohibidas hace un segundo intento correctivo. El
 * backend corta a los 45 s por llamada, así que dos intentos pueden acercarse
 * al minuto y medio en el peor caso.
 */
const TIMEOUT_GENERACION_MS = 120_000;

export function generarContenido(
  peticion: GenerateRequest,
  signal?: AbortSignal
): Promise<GenerateResponse> {
  return request<GenerateResponse>('/generate', {
    method: 'POST',
    body: peticion,
    timeoutMs: TIMEOUT_GENERACION_MS,
    signal,
  });
}
