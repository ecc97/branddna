/*
  Traducción de valores del backend a texto y color de pantalla.

  Es la ÚNICA dirección de traducción del proyecto: valor -> etiqueta. Nunca al
  revés. Lo que se manda al backend es siempre el valor tal cual.

  Los colores no son literales: son los tokens de `styles/theme.css`, así el
  tema oscuro sigue funcionando sin tocar nada aquí.
*/

import type { PieceStatus, PieceType } from './types';

/** `promocion` se muestra como "Promoción" (con tilde). El valor no cambia. */
export const PIECE_TYPE_LABELS: Record<PieceType, string> = {
  post: 'Post',
  historia: 'Historia',
  promocion: 'Promoción',
  aviso: 'Aviso',
};

export const STATUS_LABELS: Record<PieceStatus, string> = {
  borrador: 'Borrador',
  aprobado: 'Aprobado',
  publicado: 'Publicado',
};

/** Color de cada estado, tomado del prototipo. */
export const STATUS_COLORS: Record<PieceStatus, { color: string; soft: string }> = {
  borrador: { color: 'var(--st-d)', soft: 'var(--st-d-s)' },
  aprobado: { color: 'var(--ok)', soft: 'var(--ok-soft)' },
  publicado: { color: 'var(--st-p)', soft: 'var(--st-p-s)' },
};

/** Abreviatura para las celdas del calendario, donde no cabe el nombre. */
export const CHANNEL_SHORT: Record<string, string> = {
  Instagram: 'IG',
  WhatsApp: 'WA',
  Facebook: 'FB',
  Blog: 'BLOG',
};
