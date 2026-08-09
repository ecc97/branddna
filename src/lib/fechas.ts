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

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Empieza en lunes, como el calendario en español. */
export const DIAS_INICIAL = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Convierte un Date local a la clave "AAAA-MM-DD" que usa el backend. */
export function claveFecha(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Construye un Date LOCAL a partir de "AAAA-MM-DD". Nunca `new Date(cadena)`. */
export function desdeClave(clave: string): Date {
  const [anio, mes, dia] = clave.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function claveDeHoy(): string {
  return claveFecha(new Date());
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

export function sumarMeses(fecha: Date, meses: number): Date {
  // Se ancla al día 1 para evitar el salto del 31 de enero + 1 mes, que en
  // JavaScript da 3 de marzo. El calendario solo necesita el mes.
  return new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1);
}

/** Lunes de la semana a la que pertenece la fecha. */
export function lunesDe(fecha: Date): Date {
  // getDay(): 0 = domingo. Se rota para que el lunes sea 0.
  const desplazamiento = (fecha.getDay() + 6) % 7;
  return sumarDias(fecha, -desplazamiento);
}

/** Los 7 días de la semana de esa fecha, de lunes a domingo. */
export function semanaDe(fecha: Date): Date[] {
  const lunes = lunesDe(fecha);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/**
 * Celdas de la rejilla mensual, siempre semanas completas de lunes a domingo.
 *
 * Incluye los días de relleno del mes anterior y siguiente, porque una rejilla
 * de 7 columnas los necesita. Se recortan las semanas finales que quedaran
 * enteramente fuera del mes: si no, febrero pintaría una fila vacía.
 */
export function celdasDelMes(anio: number, mes: number): Date[] {
  const primerDia = new Date(anio, mes, 1);
  const desplazamiento = (primerDia.getDay() + 6) % 7;

  const celdas: Date[] = [];
  for (let i = 0; i < 42; i++) {
    celdas.push(new Date(anio, mes, 1 - desplazamiento + i));
  }

  while (celdas.length > 28) {
    const ultimaSemana = celdas.slice(-7);
    const alguna = ultimaSemana.some((d) => d.getMonth() === mes);
    if (alguna) break;
    celdas.length -= 7;
  }
  return celdas;
}

export function tituloDelMes(fecha: Date): string {
  const mes = MESES[fecha.getMonth()];
  return `${mes[0].toUpperCase()}${mes.slice(1)} ${fecha.getFullYear()}`;
}

export function tituloDeLaSemana(fecha: Date): string {
  const dias = semanaDe(fecha);
  const inicio = dias[0];
  const fin = dias[6];

  if (inicio.getMonth() === fin.getMonth()) {
    return `${inicio.getDate()} – ${fin.getDate()} de ${MESES[inicio.getMonth()]}`;
  }
  return `${inicio.getDate()} de ${MESES[inicio.getMonth()]} – ${fin.getDate()} de ${MESES[fin.getMonth()]}`;
}

/** "15 de septiembre de 2026", a partir de la clave. */
export function fechaLarga(clave: string): string {
  const fecha = desdeClave(clave);
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}
