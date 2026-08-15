/*
  Tests del almacenamiento local de marcas.

  Aquí vive la llave de acceso del usuario: si esto se corrompe o se pierde,
  alguien se queda fuera de su propia marca. Por eso se prueban sobre todo los
  casos feos —JSON manipulado a mano, formato antiguo, almacenamiento
  bloqueado— y no solo el camino feliz.
*/

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  readActiveId,
  readKnownBrands,
  toBrandList,
  writeActiveId,
  writeKnownBrands,
} from './brand-storage';
import { KNOWN_BRANDS_KEY, LEGACY_TOKENS_KEY } from './profile-context';

const ID_A = '093ab784-8c8a-4b2c-9a39-fb490fbe8cf0';
const ID_B = '1011eadb-c251-491c-ad4d-2400ce7bd7f3';

/*
  Doble en memoria de `localStorage`.

  Vitest corre en Node, donde no existe. Se podría instalar jsdom o happy-dom,
  pero lo que se prueba aquí es **nuestro** manejo de errores y de datos
  corruptos, no la implementación del navegador: un doble de diez líneas lo
  cubre igual, sin dependencia nueva y sin arrancar un DOM entero.
*/
function createFakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
}

let storage: ReturnType<typeof createFakeStorage>;

beforeEach(() => {
  vi.restoreAllMocks();
  storage = createFakeStorage();
  vi.stubGlobal('localStorage', storage);
});

describe('ida y vuelta', () => {
  it('lo guardado se recupera igual', () => {
    const brands = { [ID_A]: { name: 'Panadería Luz', token: 'llave-a' } };
    writeKnownBrands(brands);
    expect(readKnownBrands()).toEqual(brands);
  });

  it('sin nada guardado devuelve un registro vacío', () => {
    expect(readKnownBrands()).toEqual({});
  });

  it('recuerda y olvida la marca activa', () => {
    writeActiveId(ID_A);
    expect(readActiveId()).toBe(ID_A);
    writeActiveId(null);
    expect(readActiveId()).toBeNull();
  });
});

describe('datos manipulados o corruptos', () => {
  it('descarta un JSON inválido en vez de reventar', () => {
    localStorage.setItem(KNOWN_BRANDS_KEY, 'esto no es json');
    expect(readKnownBrands()).toEqual({});
  });

  it('descarta un valor que no es un objeto', () => {
    localStorage.setItem(KNOWN_BRANDS_KEY, '"una cadena"');
    expect(readKnownBrands()).toEqual({});
  });

  it('filtra las entradas incompletas y conserva las buenas', () => {
    // Esta clave es editable desde las herramientas del navegador, así que no
    // se puede confiar en su forma.
    localStorage.setItem(
      KNOWN_BRANDS_KEY,
      JSON.stringify({
        [ID_A]: { name: 'Buena', token: 'llave-a' },
        [ID_B]: { name: 'Sin llave' },
        'otro-id': 'una cadena suelta',
      })
    );
    expect(readKnownBrands()).toEqual({ [ID_A]: { name: 'Buena', token: 'llave-a' } });
  });
});

describe('migración del formato anterior', () => {
  it('convierte { id: llave } al formato con nombre', () => {
    localStorage.setItem(LEGACY_TOKENS_KEY, JSON.stringify({ [ID_A]: 'llave-vieja' }));

    expect(readKnownBrands()).toEqual({ [ID_A]: { name: '', token: 'llave-vieja' } });
  });

  it('deja migrado el almacenamiento y retira la clave antigua', () => {
    localStorage.setItem(LEGACY_TOKENS_KEY, JSON.stringify({ [ID_A]: 'llave-vieja' }));
    readKnownBrands();

    expect(localStorage.getItem(LEGACY_TOKENS_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(KNOWN_BRANDS_KEY)!)).toEqual({
      [ID_A]: { name: '', token: 'llave-vieja' },
    });
  });

  it('no migra si ya existe el formato nuevo', () => {
    writeKnownBrands({ [ID_A]: { name: 'Actual', token: 'llave-actual' } });
    localStorage.setItem(LEGACY_TOKENS_KEY, JSON.stringify({ [ID_B]: 'llave-vieja' }));

    expect(readKnownBrands()).toEqual({ [ID_A]: { name: 'Actual', token: 'llave-actual' } });
  });
});

describe('almacenamiento bloqueado', () => {
  it('leer no rompe la app', () => {
    // Modo incógnito o almacenamiento denegado por el navegador.
    storage.getItem = () => {
      throw new Error('acceso denegado');
    };
    expect(readKnownBrands()).toEqual({});
    expect(readActiveId()).toBeNull();
  });

  it('escribir no rompe la app', () => {
    storage.setItem = () => {
      throw new Error('cuota superada');
    };
    // Se pierde la persistencia, no la sesión: no debe lanzar.
    expect(() => writeKnownBrands({ [ID_A]: { name: 'X', token: 'y' } })).not.toThrow();
    expect(() => writeActiveId(ID_A)).not.toThrow();
  });
});

describe('lista para la interfaz', () => {
  it('ordena por nombre para que no baile entre recargas', () => {
    const list = toBrandList({
      [ID_A]: { name: 'Veterinaria Patitas', token: 'a' },
      [ID_B]: { name: 'Panadería Luz', token: 'b' },
    });
    expect(list.map((b) => b.name)).toEqual(['Panadería Luz', 'Veterinaria Patitas']);
  });

  it('incluye el id de cada marca', () => {
    const list = toBrandList({ [ID_A]: { name: 'Una', token: 'a' } });
    expect(list).toEqual([{ id: ID_A, name: 'Una', token: 'a' }]);
  });
});
