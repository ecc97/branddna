/*
  Compartir una pieza en su red (Opción A del feedback f1: copiar y abrir).

  ── Qué resuelve y qué no ─────────────────────────────────────────────────

  El dolor real del dueño de la pyme no era "publicar automáticamente", sino
  tener que reteclear el copy en cada red. Instagram no permite post de solo
  texto vía API, y el modelo de auth actual (una llave por marca en
  localStorage) no debe alojar tokens de terceros. Así que aquí no hay OAuth
  ni auto-publicación: se copia el texto y se abre la red, y el único casi-
  un-clic es WhatsApp, porque `wa.me/?text=` sí precarga el mensaje (sin
  número, para que el propio usuario elija el contacto).

  El texto se usa sin tocar: la URL se arma con `encodeURIComponent`, así la
  única codificación a la vista es la que exige el protocolo.
*/

import type { Channel } from '../api/types';

/**
 * URL que abre cada canal con el texto listo. `Blog` no tiene app externa:
 * devuelve `null` y se interpreta como "no hay nada que abrir".
 */
export const URLS_CHANNELS: Record<Channel, (text: string) => string | null> = {
  WhatsApp: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  Instagram: () => 'https://www.instagram.com/',
  Facebook: () => 'https://www.facebook.com/',
  Blog: () => null,
};

export function channelUrl(channel: Channel, text: string): string | null {
  return URLS_CHANNELS[channel](text);
}

/**
 * Copia el texto al portapapeles y abre la red en otra pestaña. Devuelve
 * `true` si se completó; `false` si el portapapeles lo rechazó (para que la
 * pantalla avise y no abra la red sin tener nada que pegar).
 */
export async function copyAndOpen(channel: Channel, text: string): Promise<boolean> {
  const url = channelUrl(channel, text);
  if (!url) return true; // Blog: no hay app externa que abrir ni nada que copiar.

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return false;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}