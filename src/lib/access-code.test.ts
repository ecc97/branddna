/*
  Tests del código de acceso.

  Es la puerta de entrada desde otro dispositivo: si el parseo falla, el
  usuario se queda fuera de su propia marca con la cadena correcta en el
  portapapeles. De ahí que la mayoría de estos casos sean formas reales en las
  que un copiar y pegar llega sucio.
*/

import { describe, expect, it } from 'vitest';

import { buildAccessCode, parseAccessCode } from './access-code';

const ID = '093ab784-8c8a-4b2c-9a39-fb490fbe8cf0';
const TOKEN = 'bDx7_Kq2mN-8pQrStUvWxYz012345678901234567890';
const CODE = `${ID}.${TOKEN}`;

describe('construir', () => {
  it('une id y llave con un punto', () => {
    expect(buildAccessCode(ID, TOKEN)).toBe(CODE);
  });

  it('lo construido se vuelve a interpretar igual', () => {
    expect(parseAccessCode(buildAccessCode(ID, TOKEN))).toEqual({
      profileId: ID,
      token: TOKEN,
    });
  });
});

describe('interpretar un código válido', () => {
  it('separa id y llave', () => {
    expect(parseAccessCode(CODE)).toEqual({ profileId: ID, token: TOKEN });
  });

  it.each([
    ['con espacios alrededor', `  ${CODE}  `],
    ['con salto de línea al final', `${CODE}\n`],
    ['partido en dos líneas al copiar', `${ID}.\n${TOKEN}`],
    ['con espacios intercalados', `${ID}. ${TOKEN}`],
    ['con tabulaciones', `\t${CODE}\t`],
  ])('tolera un pegado sucio: %s', (_label, dirty) => {
    expect(parseAccessCode(dirty)).toEqual({ profileId: ID, token: TOKEN });
  });

  it('acepta el id en mayúsculas', () => {
    const parsed = parseAccessCode(`${ID.toUpperCase()}.${TOKEN}`);
    expect(parsed?.profileId).toBe(ID.toUpperCase());
    expect(parsed?.token).toBe(TOKEN);
  });

  it('solo separa por el PRIMER punto', () => {
    // Hoy la llave no lleva puntos, pero si algún día los llevara, el id
    // seguiría siendo lo de delante.
    const parsed = parseAccessCode(`${ID}.abc.def`);
    expect(parsed).toEqual({ profileId: ID, token: 'abc.def' });
  });
});

describe('rechazar lo que no vale', () => {
  it.each([
    ['cadena vacía', ''],
    ['solo espacios', '   '],
    ['sin punto separador', `${ID}${TOKEN}`],
    ['solo el id', ID],
    ['solo la llave', TOKEN],
    ['id que no es un UUID', `no-soy-un-uuid.${TOKEN}`],
    ['UUID incompleto', `093ab784-8c8a.${TOKEN}`],
    ['sin llave detrás del punto', `${ID}.`],
    ['punto al principio', `.${TOKEN}`],
  ])('%s', (_label, invalid) => {
    expect(parseAccessCode(invalid)).toBeNull();
  });
});
