/*
  Código de acceso: el identificador y la llave de una marca, en una sola
  cadena.

  ── Por qué existe ────────────────────────────────────────────────────────

  Para entrar en una marca desde otro navegador hacen falta dos datos: su `id`
  (va en la URL de `GET /profiles/{id}`) y su llave (va en la cabecera). Pedir
  dos campos obliga al usuario a entender que su marca tiene un identificador
  además de una contraseña, que es una distinción que a él no le importa.

  Así que se combinan en una sola cadena que copiar y pegar:

      093ab784-8c8a-4b2c-9a39-fb490fbe8cf0.bDx7_Kq2mN...
      └────────────── id ───────────────┘ └── llave ──┘

  ── Esto NO es un formato de protocolo ────────────────────────────────────

  El backend no sabe que esto existe: sigue recibiendo el id en la ruta y la
  llave en la cabecera. El código se parte aquí, en el cliente, antes de llamar
  a la API. Es una comodidad de interfaz, y conviene que siga siéndolo: en
  cuanto el servidor entendiera este formato, cambiarlo dejaría de ser gratis.

  ── Por qué el punto separa bien ──────────────────────────────────────────

  El id es un UUID, que solo tiene dígitos hexadecimales y guiones. La llave
  viene de `secrets.token_urlsafe`, que usa el alfabeto base64 seguro para URL:
  letras, dígitos, `-` y `_`. **Ninguno de los dos contiene un punto**, así que
  partir por el primero es inequívoco.
*/

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AccessCode {
  profileId: string;
  token: string;
}

export function buildAccessCode(profileId: string, token: string): string {
  return `${profileId}.${token}`;
}

/**
 * Interpreta un código pegado por el usuario. Devuelve `null` si no vale.
 *
 * Tolera espacios y saltos de línea alrededor —y dentro— porque copiar de un
 * `.txt`, de un mensaje o de un correo arrastra basura invisible con mucha
 * facilidad, y fallar por eso sería incomprensible para quien lo pega.
 */
export function parseAccessCode(raw: string): AccessCode | null {
  const cleaned = raw.replace(/\s+/gu, '');
  if (!cleaned) return null;

  // Solo el PRIMER punto separa: si algún día la llave llevara puntos, el id
  // seguiría siendo lo de delante.
  const separator = cleaned.indexOf('.');
  if (separator === -1) return null;

  const profileId = cleaned.slice(0, separator);
  const token = cleaned.slice(separator + 1);

  if (!UUID_PATTERN.test(profileId) || !token) return null;

  return { profileId, token };
}
