/*
  Selector de fecha híbrido: – / campo nativo / +

  Los dos controles resuelven tareas distintas y por eso conviven:

  - Los botones – y + sirven para **ajustar**: "esto va un día después".
    Un toque. Es lo que tenía el prototipo.
  - El campo del centro sirve para **saltar**: "esto va el 3 de noviembre".
    Con solo los botones eso serían más de 80 pulsaciones.

  El campo es `<input type="date">`, dibujado por el navegador. Tiene dos
  ventajas que no son estéticas:

  1. Su valor es exactamente "AAAA-MM-DD", el mismo formato que
     `scheduled_date` en el backend. Cero conversión, y nunca se construye un
     objeto Date, así que la trampa de zona horaria (ver lib/fechas.ts) no
     puede aparecer.
  2. Admite el valor vacío de forma natural, que es justo lo que necesitamos:
     una pieza guardada sin programar tiene `scheduled_date: null`.

  A cambio, el calendario emergente lo pinta el navegador y no se puede
  estilizar. Solo se le puede pedir que respete el tema, y eso se hace con
  `color-scheme` en theme.css.
*/

import { claveDeHoy, claveFecha, desdeClave, fechaLarga, sumarDias } from '../lib/fechas';
import s from './DateStepper.module.css';

interface DateStepperProps {
  /** "AAAA-MM-DD" o null si la pieza no está programada. */
  value: string | null;
  onChange: (siguiente: string | null) => void;
}

export function DateStepper({ value, onChange }: DateStepperProps) {
  function desplazar(dias: number) {
    if (!value) return;
    // Toda la aritmética pasa por lib/fechas: local y sin objetos Date sueltos.
    onChange(claveFecha(sumarDias(desdeClave(value), dias)));
  }

  return (
    <div className={s.grupo}>
      <div className={s.fila}>
        <button
          type="button"
          className={s.paso}
          onClick={() => desplazar(-1)}
          disabled={!value}
          aria-label="Un día antes"
        >
          –
        </button>

        <input
          type="date"
          className={s.campo}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          aria-label="Fecha programada"
        />

        <button
          type="button"
          className={s.paso}
          onClick={() => desplazar(1)}
          disabled={!value}
          aria-label="Un día después"
        >
          +
        </button>
      </div>

      <div className={s.atajos}>
        <button type="button" className={s.atajo} onClick={() => onChange(claveDeHoy())}>
          Hoy
        </button>
        <button
          type="button"
          className={s.atajo}
          onClick={() => onChange(claveFecha(sumarDias(new Date(), 1)))}
        >
          Mañana
        </button>
        <button
          type="button"
          className={s.atajo}
          onClick={() => onChange(claveFecha(sumarDias(new Date(), 7)))}
        >
          En una semana
        </button>
        {value && (
          <button type="button" className={s.quitar} onClick={() => onChange(null)}>
            Quitar fecha
          </button>
        )}
      </div>

      <div className={s.leyenda}>
        {value
          ? `Programada para el ${fechaLarga(value)}.`
          : 'Sin programar. Aparecerá al final del calendario hasta que le pongas fecha.'}
      </div>
    </div>
  );
}
