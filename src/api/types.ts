/*
  Tipos del contrato de la API.

  Regla que sostiene todo este módulo: **estos tipos son un espejo exacto del
  backend**. Los campos se llaman igual (`is_clean`, no `isClean`;
  `profile_id`, no `profileId`) y los valores de los enums son los mismos
  (`promocion`, `Instagram`).

  Es tentador "arreglar" los nombres a camelCase al estilo JavaScript, pero eso
  obliga a mantener una traducción en las dos direcciones para siempre, y cada
  campo nuevo es una oportunidad de equivocarse en silencio. Lo único que se
  traduce es la **etiqueta que ve el usuario**, y eso vive en `labels.ts`.

  Fuente de verdad: backend/app/schemas.py
*/

// --------------------------------------------------------------------------
// Enumeraciones
//
// Se declaran como `as const` y no como `enum` de TypeScript porque así se
// obtienen dos cosas de una: el tipo para comprobar en compilación y el array
// para recorrer en tiempo de ejecución (pintar los chips de canal, por ej.).
// --------------------------------------------------------------------------
export const CHANNELS = ['Instagram', 'WhatsApp', 'Facebook', 'Blog'] as const;
export type Channel = (typeof CHANNELS)[number];

export const PIECE_TYPES = ['post', 'historia', 'promocion', 'aviso'] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export const PIECE_STATUSES = ['borrador', 'aprobado', 'publicado'] as const;
export type PieceStatus = (typeof PIECE_STATUSES)[number];

// --------------------------------------------------------------------------
// Perfil de marca
// --------------------------------------------------------------------------

/** Lo que se envía al crear un perfil. Los 4 primeros son obligatorios. */
export interface BrandProfileInput {
  business_name: string;
  what_they_sell: string;
  tone: string;
  target_audience: string;
  keywords?: string;
  forbidden?: string;
  good_example?: string;
  bad_example?: string;
}

/** El PUT es parcial: solo se escriben los campos enviados. */
export type BrandProfileUpdate = Partial<BrandProfileInput>;

/** Lo que devuelve la API. Exige la llave de acceso de esa marca. */
export interface BrandProfile extends Required<BrandProfileInput> {
  id: string;
  /**
   * Los términos prohibidos ya extraídos de `forbidden`, que es prosa libre.
   *
   * Los calcula el backend con la misma función que usa el generador, así que
   * lo que aquí se resalta es exactamente lo que allí se vigila. El cliente no
   * reimplementa esa heurística: sería una segunda copia con su propia forma
   * de divergir.
   */
  forbidden_terms: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Respuesta de la creación: la única vez que se ve la llave en claro.
 *
 * A partir de ahí el backend solo guarda su hash, así que ni él mismo puede
 * volver a mostrarla.
 */
export interface BrandProfileCreated extends BrandProfile {
  access_token: string;
}

/** Respuesta al rotar la llave. La anterior deja de servir al instante. */
export interface TokenRotated {
  access_token: string;
}

// --------------------------------------------------------------------------
// Generación
// --------------------------------------------------------------------------
export interface GenerateRequest {
  profile_id: string;
  channel: Channel;
  piece_type: PieceType;
  topic: string;
}

export interface GeneratedOption {
  approach: string;
  text: string;
  /** Palabras prohibidas encontradas en este texto. Vacío = limpio. */
  forbidden_hits: string[];
  is_clean: boolean;
}

export interface GenerateResponse {
  profile_id: string;
  channel: Channel;
  piece_type: PieceType;
  topic: string;
  model: string;
  options: GeneratedOption[];
  /** Qué términos se vigilaron. Útil para explicarle al usuario qué se revisó. */
  forbidden_terms_checked: string[];
  /** true si hubo que pedirle al modelo que corrigiera. */
  regenerated: boolean;
  warnings: string[];
}

// --------------------------------------------------------------------------
// Piezas de contenido
// --------------------------------------------------------------------------
export interface ContentPieceInput {
  profile_id: string;
  channel: Channel;
  piece_type: PieceType;
  topic: string;
  generated_text: string;
  /** Formato YYYY-MM-DD. null = guardada pero sin programar. */
  scheduled_date?: string | null;
  status?: PieceStatus;
}

export interface ContentPieceUpdate {
  generated_text?: string;
  scheduled_date?: string | null;
  status?: PieceStatus;
}

export interface ContentPiece {
  id: string;
  profile_id: string;
  channel: Channel;
  piece_type: PieceType;
  topic: string;
  generated_text: string;
  scheduled_date: string | null;
  status: PieceStatus;
  created_at: string;
  updated_at: string;
}
