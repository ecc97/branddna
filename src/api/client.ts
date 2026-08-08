/*
  Cliente HTTP del backend.

  Su trabajo real no es hacer `fetch` — eso son tres líneas — sino **convertir
  cualquier forma de fallo en un mensaje que se le pueda enseñar a un dueño de
  pyme**. FastAPI devuelve errores de validación en inglés y con una estructura
  anidada; aquí se traducen a una frase en español. El resto de la app solo
  tiene que hacer `catch (e) { mostrar(e.message) }`.
*/

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(
  /\/+$/,
  ''
);

/** 20 s cubre de sobra cualquier consulta a Supabase. */
const TIMEOUT_POR_DEFECTO = 20_000;

/**
 * Error de la API con el estado HTTP y un mensaje ya listo para mostrar.
 * `status: 0` significa que la petición nunca llegó a salir (red caída,
 * servidor apagado, CORS).
 */
export class ApiError extends Error {
  /*
    Los campos se declaran y asignan a mano en vez de usar propiedades de
    constructor (`constructor(readonly status: number)`). Esa sintaxis genera
    código en tiempo de ejecución y el proyecto usa `erasableSyntaxOnly`: solo
    se admite TypeScript que se pueda borrar sin cambiar el JavaScript
    resultante, que es lo que permite a Vite compilar sin type-checker.
  */
  readonly status: number;
  readonly detail?: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }

  /** true si el problema es del servidor o de la red, no de lo que envió el usuario. */
  get esFalloDelServidor(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

// --------------------------------------------------------------------------
// Traducción de los errores de validación de FastAPI (422)
// --------------------------------------------------------------------------
interface ValidationIssue {
  type: string;
  loc: (string | number)[];
  msg: string;
  ctx?: { expected?: string };
}

const ETIQUETAS_CAMPO: Record<string, string> = {
  business_name: 'El nombre del negocio',
  what_they_sell: 'Qué vende',
  tone: 'El tono',
  target_audience: 'El público objetivo',
  keywords: 'Las palabras clave',
  forbidden: 'Las prohibiciones',
  good_example: 'El ejemplo bueno',
  bad_example: 'El ejemplo malo',
  profile_id: 'El perfil',
  channel: 'El canal',
  piece_type: 'El tipo de pieza',
  topic: 'El tema',
  generated_text: 'El texto',
  scheduled_date: 'La fecha programada',
  status: 'El estado',
};

/**
 * Pydantic devuelve `msg` en inglés ("Input should be 'Instagram', ...").
 * Se traducen los tipos de error frecuentes; para el resto se deja el original,
 * que es mejor que nada.
 */
function explicarProblema(issue: ValidationIssue): string {
  switch (issue.type) {
    case 'missing':
      return 'es obligatorio';
    case 'enum':
      return `tiene un valor no válido. Opciones: ${issue.ctx?.expected ?? '—'}`;
    case 'string_too_short':
      return 'no puede quedar vacío';
    case 'string_too_long':
      return 'es demasiado largo';
    case 'uuid_parsing':
    case 'uuid_type':
      return 'no es un identificador válido';
    case 'date_parsing':
    case 'date_type':
    case 'date_from_datetime_parsing':
      return 'no es una fecha válida (formato AAAA-MM-DD)';
    default:
      return issue.msg;
  }
}

function mensajeDeValidacion(issues: ValidationIssue[]): string {
  const frases = issues.map((issue) => {
    // `loc` viene como ["body", "channel"] o ["query", "profile_id"].
    // El nombre real del campo es el último tramo de texto.
    const campo = [...issue.loc].reverse().find((p) => typeof p === 'string' && p !== 'body' && p !== 'query');
    const etiqueta = typeof campo === 'string' ? (ETIQUETAS_CAMPO[campo] ?? campo) : 'Un dato';
    return `${etiqueta} ${explicarProblema(issue)}`;
  });

  return frases.join('. ') + '.';
}

// --------------------------------------------------------------------------
// Interpretación de la respuesta de error
// --------------------------------------------------------------------------
function construirError(status: number, cuerpo: unknown): ApiError {
  const detail = (cuerpo as { detail?: unknown } | null)?.detail;

  // 422: lista de problemas de validación.
  if (Array.isArray(detail)) {
    return new ApiError(status, mensajeDeValidacion(detail as ValidationIssue[]), detail);
  }

  // 400 / 404 / 502: el backend ya manda un mensaje en español.
  if (typeof detail === 'string' && detail.trim()) {
    return new ApiError(status, detail, detail);
  }

  // Sin cuerpo útil: se explica el código.
  const genericos: Record<number, string> = {
    404: 'No se encontró lo que buscabas.',
    500: 'Error interno del servidor.',
    502: 'El servidor no pudo completar la operación.',
    503: 'El servicio no está disponible ahora mismo.',
  };
  return new ApiError(status, genericos[status] ?? `Error del servidor (${status}).`, cuerpo);
}

// --------------------------------------------------------------------------
// Petición
// --------------------------------------------------------------------------
interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Milisegundos. `/generate` necesita mucho más que el resto. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function request<T>(path: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = TIMEOUT_POR_DEFECTO, signal } = opciones;

  // Se combina el timeout propio con un posible AbortSignal del componente
  // (por ejemplo, si el usuario cambia de pantalla mientras carga).
  const porTiempo = AbortSignal.timeout(timeoutMs);
  const señal = signal ? AbortSignal.any([signal, porTiempo]) : porTiempo;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: señal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(0, 'El servidor tardó demasiado en responder. Inténtalo de nuevo.');
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'Petición cancelada.');
    }
    // TypeError de fetch: servidor apagado, sin red, o CORS mal configurado.
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Comprueba que el backend esté corriendo en ' +
        BASE_URL
    );
  }

  // 204 No Content: DELETE correcto, sin cuerpo que leer.
  if (respuesta.status === 204) {
    return undefined as T;
  }

  let cuerpo: unknown = null;
  const texto = await respuesta.text();
  if (texto) {
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      cuerpo = texto;
    }
  }

  if (!respuesta.ok) {
    throw construirError(respuesta.status, cuerpo);
  }

  return cuerpo as T;
}

/** Expuesto para poder mostrarlo en pantalla al diagnosticar problemas. */
export const API_BASE_URL = BASE_URL;
