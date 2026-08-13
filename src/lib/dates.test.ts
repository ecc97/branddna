/*
  Tests de las utilidades de fecha.

  Lógica pura, sin React ni red: es lo más barato de probar y lo que más se
  agradece, porque aquí vive la trampa que arrastran casi todos los calendarios.

  La zona horaria importa para estos tests. Con desfase negativo —toda
  América— es donde aparece el bug de "todo un día antes", así que si esta
  suite pasa ahí, pasa en cualquier sitio.
*/

import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  dateKey,
  fromDateKey,
  longDate,
  mondayOf,
  monthGridCells,
  monthTitle,
  todayKey,
  weekOf,
  weekTitle,
} from './dates';

describe('la trampa de la zona horaria', () => {
  it.each(['2026-01-01', '2026-09-15', '2026-12-31', '2028-02-29', '2026-03-01'])(
    'clave → Date → clave conserva el día (%s)',
    (key) => {
      expect(dateKey(fromDateKey(key))).toBe(key);
    }
  );

  it('demuestra por qué NO se usa new Date(cadena)', () => {
    /*
      `new Date('2026-09-15')` se interpreta como medianoche UTC. En una zona
      con desfase negativo eso cae en el día 14. Este test no comprueba nuestro
      código: documenta el motivo de que exista `fromDateKey`.
    */
    const conNewDate = dateKey(new Date('2026-09-15'));
    const conNuestro = dateKey(fromDateKey('2026-09-15'));

    expect(conNuestro).toBe('2026-09-15');
    if (new Date().getTimezoneOffset() > 0) {
      // Zona con desfase negativo (América): ahí es donde muerde el bug.
      expect(conNewDate).not.toBe(conNuestro);
    }
  });

  it('todayKey devuelve el día local, no el UTC', () => {
    const now = new Date();
    expect(todayKey()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`
    );
  });
});

describe('semanas', () => {
  it('el lunes de un domingo es el lunes anterior', () => {
    // 2026-09-13 es domingo: su semana empieza el lunes 7.
    expect(dateKey(mondayOf(fromDateKey('2026-09-13')))).toBe('2026-09-07');
  });

  it('el lunes de un lunes es él mismo', () => {
    expect(dateKey(mondayOf(fromDateKey('2026-09-07')))).toBe('2026-09-07');
  });

  it('weekOf devuelve 7 días consecutivos de lunes a domingo', () => {
    expect(weekOf(fromDateKey('2026-09-09')).map(dateKey)).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });
});

describe('rejilla mensual', () => {
  it('siempre son semanas completas', () => {
    for (let month = 0; month < 12; month++) {
      expect(monthGridCells(2026, month).length % 7).toBe(0);
    }
  });

  it('empieza en lunes y contiene el mes entero', () => {
    const cells = monthGridCells(2026, 8); // septiembre
    expect(dateKey(cells[0])).toBe('2026-08-31');
    expect(cells.some((d) => dateKey(d) === '2026-09-01')).toBe(true);
    expect(cells.some((d) => dateKey(d) === '2026-09-30')).toBe(true);
  });

  it('febrero de 2026 empieza en domingo: 5 filas desde el 26 de enero', () => {
    const cells = monthGridCells(2026, 1);
    expect(cells.length).toBe(35);
    expect(dateKey(cells[0])).toBe('2026-01-26');
  });

  it('no deja semanas enteramente fuera del mes', () => {
    for (let month = 0; month < 12; month++) {
      const cells = monthGridCells(2026, month);
      const lastWeek = cells.slice(-7);
      expect(lastWeek.some((d) => d.getMonth() === month)).toBe(true);
    }
  });
});

describe('aritmética', () => {
  it('addDays cruza el cambio de mes', () => {
    expect(dateKey(addDays(fromDateKey('2026-01-31'), 1))).toBe('2026-02-01');
  });

  it('addMonths NO salta de enero a marzo', () => {
    // Sumar un mes al 31 de enero conservando el día daría "31 de febrero",
    // que JavaScript convierte en 3 de marzo. Por eso se ancla al día 1.
    expect(dateKey(addMonths(fromDateKey('2026-01-31'), 1))).toBe('2026-02-01');
  });

  it('addMonths cambia de año', () => {
    expect(dateKey(addMonths(fromDateKey('2026-12-10'), 1))).toBe('2027-01-01');
    expect(dateKey(addMonths(fromDateKey('2026-01-10'), -1))).toBe('2025-12-01');
  });
});

describe('títulos', () => {
  it('mes con la inicial en mayúscula', () => {
    expect(monthTitle(fromDateKey('2026-09-15'))).toBe('Septiembre 2026');
  });

  it('semana dentro del mismo mes', () => {
    expect(weekTitle(fromDateKey('2026-09-09'))).toBe('7 – 13 de septiembre');
  });

  it('semana a caballo entre dos meses', () => {
    expect(weekTitle(fromDateKey('2026-10-01'))).toBe(
      '28 de septiembre – 4 de octubre'
    );
  });

  it('fecha larga', () => {
    expect(longDate('2026-09-15')).toBe('15 de septiembre de 2026');
  });
});
