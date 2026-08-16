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
const DEFAULT_TIMEOUT_MS = 20_000;

/** Cabecera donde viaja la llave de la marca. Debe coincidir con app/auth.py */
const BRAND_TOKEN_HEADER = 'X-Brand-Token';

/*
  Llave de la marca activa, a nivel de módulo.

  En esta app **toda** llamada autenticada es de la marca activa, así que un
  único token evita arrastrarlo por diez sitios y que alguien se olvide en uno.
  `ProfileProvider` es quien lo fija al resolver el perfil.

  Para el caso puntual de comprobar una llave que el usuario acaba de pegar
  —cuando todavía no es la marca activa— cada petición admite un `brandToken`
  propio que tiene prioridad.
*/
let activeBrandToken: string | null = null;

export function setBrandToken(token: string | null): void {
  activeBrandToken = token;
}

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
  get isServerFailure(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

/**
 * Saca de un fallo el mensaje que se le puede enseñar al usuario.
 *
 * Lo que llega a un `catch` es `unknown`: puede ser un `ApiError` —que ya trae
 * la frase en español lista— o cualquier otra cosa (un fallo de programación,
 * un `TypeError`). En el segundo caso el mensaje original no sirve para
 * enseñarlo, así que se usa el texto de respaldo de la pantalla, que sí sabe
 * qué se estaba intentando hacer ("No se pudo guardar", "No se pudo generar…").
 *
 * Existe porque este ternario estaba repetido en nueve sitios. Reunirlo aquí
 * deja un único lugar donde cambiar el criterio: si algún día hay que
 * distinguir "sin conexión" de "servidor caído" —`ApiError.isServerFailure` ya
 * lo permite— se toca esta función y no las nueve pantallas.
 */
export function errorMessage(failure: unknown, fallback: string): string {
  return failure instanceof ApiError ? failure.message : fallback;
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

const FIELD_LABELS: Record<string, string> = {
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
function describeProblem(issue: ValidationIssue): string {
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

function validationMessage(issues: ValidationIssue[]): string {
  const sentences = issues.map((issue) => {
    // `loc` viene como ["body", "channel"] o ["query", "profile_id"].
    // El nombre real del campo es el último tramo de texto.
    const field = [...issue.loc].reverse().find((p) => typeof p === 'string' && p !== 'body' && p !== 'query');
    const label = typeof field === 'string' ? (FIELD_LABELS[field] ?? field) : 'Un dato';
    return `${label} ${describeProblem(issue)}`;
  });

  return sentences.join('. ') + '.';
}

// --------------------------------------------------------------------------
// Interpretación de la respuesta de error
// --------------------------------------------------------------------------
function buildError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;

  // 422: lista de problemas de validación.
  if (Array.isArray(detail)) {
    return new ApiError(status, validationMessage(detail as ValidationIssue[]), detail);
  }

  // 400 / 404 / 502: el backend ya manda un mensaje en español.
  if (typeof detail === 'string' && detail.trim()) {
    return new ApiError(status, detail, detail);
  }

  // Sin cuerpo útil: se explica el código.
  const generic: Record<number, string> = {
    404: 'No se encontró lo que buscabas.',
    500: 'Error interno del servidor.',
    502: 'El servidor no pudo completar la operación.',
    503: 'El servicio no está disponible ahora mismo.',
  };
  return new ApiError(status, generic[status] ?? `Error del servidor (${status}).`, body);
}

// --------------------------------------------------------------------------
// Petición
// --------------------------------------------------------------------------
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Milisegundos. `/generate` necesita mucho más que el resto. */
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Llave para esta llamada concreta. Tiene prioridad sobre la activa. */
  brandToken?: string;
}

function buildHeaders(body: unknown, brandToken?: string): HeadersInit | undefined {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';

  const token = brandToken ?? activeBrandToken;
  if (token) headers[BRAND_TOKEN_HEADER] = token;

  return Object.keys(headers).length ? headers : undefined;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    brandToken,
  } = options;

  // Se combina el timeout propio con un posible AbortSignal del componente
  // (por ejemplo, si el usuario cambia de pantalla mientras carga).
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: buildHeaders(body, brandToken),
      body: body ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
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
  if (response.status === 204) {
    return undefined as T;
  }

  // `responseBody` y no `body`: ese nombre ya lo ocupa el cuerpo de la
  // petición, desestructurado de las opciones más arriba.
  let responseBody: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  }

  if (!response.ok) {
    throw buildError(response.status, responseBody);
  }

  return responseBody as T;
}

/** Expuesto para poder mostrarlo en pantalla al diagnosticar problemas. */
export const API_BASE_URL = BASE_URL;
