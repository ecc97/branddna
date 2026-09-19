/*
  Tests de las URLs por canal.

  Lo único testable sin DOM es `channelUrl`: la construcción de la URL. El
  resto (`copyAndOpen`) toca `navigator.clipboard` y `window.open`, que no se
  prueban aquí — como el resto del proyecto, la lógica pura se separa y se
  prueba; lo que depende del navegador queda fuera.
*/

import { describe, expect, it } from 'vitest';

import { channelUrl } from './share';

describe('URL por canal', () => {
  it('WhatsApp arma wa.me sin número, texto codificado', () => {
    expect(channelUrl('WhatsApp', 'Hola mundo')).toBe(
      'https://wa.me/?text=Hola%20mundo'
    );
  });

  it('WhatsApp codifica tildes y caracteres especiales', () => {
    expect(channelUrl('WhatsApp', '¡Promo! ¿Aún disponible? 50%')).toBe(
      'https://wa.me/?text=%C2%A1Promo!%20%C2%BFA%C3%BAn%20disponible%3F%2050%25'
    );
  });

  it('Instagram abre siempre la red, ignore el texto', () => {
    expect(channelUrl('Instagram', 'cualquier texto')).toBe(
      'https://www.instagram.com/'
    );
  });

  it('Facebook abre siempre la red, ignore el texto', () => {
    expect(channelUrl('Facebook', 'cualquier texto')).toBe(
      'https://www.facebook.com/'
    );
  });

  it('Blog no tiene app externa que abrir', () => {
    expect(channelUrl('Blog', 'cualquier texto')).toBeNull();
  });
});