/*
  Utilidades de fecha para el calendario.

  ── La trampa que evita este módulo ──────────────────────────────────────

  El backend guarda `scheduled_date` como fecha suelta: "2026-09-15", sin hora
  ni zona horaria. Es un día del calendario, no un instante.

  Pero `new Date('2026-09-15')` NO devuelve el 15 de septiembre local: la
  norma dice que una cadena de solo fecha se interpreta como **medianoche
  UTC**. En cualquier zona con desfase negativo (toda América) eso se muestra
  como el día 14. Es el bug de calendario más repetido que existe: todo
  aparece un día antes y solo para algunos usuarios.

  Aquí no se usa `new Date(cadena)` en ningún sitio. Las fechas se manejan
  como la propia cadena "AAAA-MM-DD" para agrupar y comparar, y cuando hace
  falta un `Date` se construye con año, mes y día por separado, que sí es
  local.
*/

export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Empieza en lunes, como el calendario en español. */
export const DAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DAY_SHORT_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Convierte un Date local a la clave "AAAA-MM-DD" que usa el backend. */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Construye un Date LOCAL a partir de "AAAA-MM-DD". Nunca `new Date(cadena)`. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date: Date, months: number): Date {
  // Se ancla al día 1 para evitar el salto del 31 de enero + 1 mes, que en
  // JavaScript da 3 de marzo. El calendario solo necesita el mes.
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Lunes de la semana a la que pertenece la fecha. */
export function mondayOf(date: Date): Date {
  // getDay(): 0 = domingo. Se rota para que el lunes sea 0.
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

/** Los 7 días de la semana de esa fecha, de lunes a domingo. */
export function weekOf(date: Date): Date[] {
  const monday = mondayOf(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Celdas de la rejilla mensual, siempre semanas completas de lunes a domingo.
 *
 * Incluye los días de relleno del mes anterior y siguiente, porque una rejilla
 * de 7 columnas los necesita. Se recortan las semanas finales que quedaran
 * enteramente fuera del mes: si no, febrero pintaría una fila vacía.
 */
export function monthGridCells(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(year, month, 1 - offset + i));
  }

  while (cells.length > 28) {
    const lastWeek = cells.slice(-7);
    const hasDayOfMonth = lastWeek.some((d) => d.getMonth() === month);
    if (hasDayOfMonth) break;
    cells.length -= 7;
  }
  return cells;
}

export function monthTitle(date: Date): string {
  const month = MONTHS[date.getMonth()];
  return `${month[0].toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

export function weekTitle(date: Date): string {
  const days = weekOf(date);
  const start = days[0];
  const end = days[6];

  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} de ${MONTHS[start.getMonth()]}`;
  }
  return `${start.getDate()} de ${MONTHS[start.getMonth()]} – ${end.getDate()} de ${MONTHS[end.getMonth()]}`;
}

/** "15 de septiembre de 2026", a partir de la clave. */
export function longDate(key: string): string {
  const date = fromDateKey(key);
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}
