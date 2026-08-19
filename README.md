# BrandDNA · frontend

Interfaz de BrandDNA: generar contenido para redes con la voz de una marca,
guardarlo y programarlo en un calendario.

React 19 + TypeScript + Vite. Habla **solo** con el backend FastAPI de
[API BrandDNA](https://github.com/ecc0503/branddna-apibackend); nunca con Supabase ni con Groq directamente.

---

## Poner en marcha

Requisitos: Node 20.19+ o 22.12+ (lo pide Vite 8).

El backend tiene que estar corriendo primero:

```bash
cd ../backend
./venv/Scripts/python.exe -m uvicorn main:app --reload   # Windows
```

Después:

```bash
npm install
npm run dev      # http://localhost:5173
```

Si el backend no está en `http://127.0.0.1:8000`, copia `.env.example` como
`.env` y ajusta `VITE_API_URL`.

> Todo lo que empiece por `VITE_` se compila **dentro** del bundle que descarga
> el navegador: es público. Ahí nunca va una clave de Supabase ni de Groq.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | **Comprueba tipos y compila.** Es la orden fiable para validar tipos |
| `npm run lint` | oxlint |
| `npm test` | Vitest sobre la lógica pura de `lib/` y `profile/` |
| `npm run test:watch` | Lo mismo, en modo continuo |
| `npm run preview` | Sirve el resultado de `build` |

> `npx tsc --noEmit` **no comprueba nada** en este proyecto: hay *project
> references* y el `tsconfig.json` de la raíz solo apunta a los otros dos. Usa
> `npm run build`.

---

## Estructura

```
src/
├── api/          capa de datos: tipos, cliente fetch y un módulo por recurso
├── components/   piezas reutilizables (formularios, armazón, avisos)
├── lib/          lógica pura sin React (fechas, código de acceso, prohibidas)
├── pages/        una por pantalla
├── profile/      marca activa y marcas que recuerda este navegador
├── styles/       tokens de diseño y estilos base
└── theme/        tema claro / oscuro
```

El flujo de dependencias va en una sola dirección:

```
pages/ ─┬─> components/ ─┐
        ├─> profile/ ────┼─> api/ ──> backend FastAPI
        └─> lib/ <───────┘
```

`lib/` no importa React (salvo `forbidden.tsx`, que solo envuelve texto en
`<mark>`), y `api/` no sabe que existe una interfaz. Eso es lo que permite
probar la lógica sin montar un DOM.

### La capa `api/`

El resto de la app importa siempre desde `../api`, nunca de los archivos
sueltos:

| Archivo | Qué hay |
|---|---|
| `client.ts` | `fetch` con timeout, cabecera `X-Brand-Token`, y **traducción de errores** de FastAPI a frases en español (`ApiError`, `errorMessage`) |
| `types.ts` | Espejo exacto de `backend/app/schemas.py` |
| `labels.ts` | Única traducción valor → etiqueta de pantalla |
| `profiles.ts` | `getProfile`, `createProfile`, `updateProfile`, `deleteProfile`, `rotateToken` |
| `pieces.ts` | `listPieces`, `getPiece`, `createPiece`, `updatePiece`, `deletePiece` |
| `generate.ts` | `generateContent` (timeout de 120 s: por dentro llama a Groq) |

En desarrollo, `main.tsx` expone esa capa en la consola del navegador como
`window.api`. Vite elimina ese bloque del build de producción.

### Rutas

| Ruta | Pantalla | Para qué |
|---|---|---|
| `/` | `HomePage` | Elegir marca, entrar con código o crear una nueva |
| `/generar` | `GeneratePage` | Flujo 2: 3 opciones, elegir una y guardarla |
| `/calendario` | `CalendarPage` | Flujo 3: mes/semana y bandeja «Sin programar» |
| `/pieza/:id` | `PiecePage` | Editar texto, fecha y estado de una pieza |
| `/marca` | `BrandPage` | Flujo 4: editar perfil, rotar llave, eliminar marca |
| `/marca/nueva` | `BrandPage creating` | Flujo 1: alta de marca |

`App.tsx` es una compuerta de estado antes del enrutado. Los cuatro estados de
`ProfileProvider` pasan de verdad:

| Estado | Qué se ve |
|---|---|
| `loading` | Comprobando la marca recordada contra el servidor |
| `error` | El backend no responde, con instrucciones para levantarlo |
| `choosing` | Sin marca activa: inicio suelto, **sin barra de navegación** |
| `ready` | App completa dentro de `AppShell` |

Si este navegador no conoce ninguna marca, `choosing` se alcanza **sin tocar la
red**: la app abre al instante.

---

## Cómo se entra en una marca

No hay cuentas de usuario. Cada marca tiene una **llave de acceso** y el
servidor no enumera marcas (no existe `GET /profiles`, y no debe volver a
existir: revelaría qué negocios usan la app).

1. Al crear la marca, el backend devuelve la llave **una sola vez**. Después
   solo guarda su hash: ni él mismo puede recuperarla.
2. El navegador guarda en `localStorage` las marcas que conoce
   (`branddna-brands`: `{ [id]: { name, token } }`) y cuál fue la última
   activa (`branddna-profile-id`). Todo el manejo está en
   `profile/brand-storage.ts`, envuelto en `try/catch` porque en incógnito o
   con el almacenamiento bloqueado `localStorage` lanza excepción: se pierde la
   persistencia, no la sesión.
3. Para entrar desde otro dispositivo se pega el **código de acceso**, que es
   `id.llave` en una sola cadena (`lib/access-code.ts`). El backend no conoce
   ese formato: se parte en el cliente, y el id va en la ruta y la llave en la
   cabecera `X-Brand-Token`. Es comodidad de interfaz, no protocolo.
4. `client.ts` guarda la llave activa a nivel de módulo y la adjunta a cada
   petición. Cada llamada admite además un `brandToken` propio, para comprobar
   una llave recién pegada antes de que esa marca sea la activa.
5. Si el servidor responde 403 o 404, la marca se **olvida** en este navegador:
   guardar una llave muerta solo repetiría el error en cada recarga.

---

## Reglas del proyecto

**Los colores nunca se escriben a mano.** Salen de los tokens de
`styles/theme.css`, copiados del prototipo de Claude Design con los mismos
nombres y valores. Un `#fff` suelto rompe el tema oscuro.

**Los tipos de `api/types.ts` son un espejo del backend.** Mismos nombres
(`is_clean`, no `isClean`) y mismos valores de enum (`promocion`,
`Instagram`). La única traducción es a etiquetas de pantalla, en `api/labels.ts`.

**Las fechas sin hora se tratan como texto.** Nunca `new Date("2026-09-15")`:
eso da el día anterior en cualquier zona con desfase negativo. Toda la
aritmética pasa por `lib/dates.ts`.

**Idioma.** Código, funciones, variables, tipos y nombres de test en inglés.
Comentarios, textos de interfaz, mensajes de error y valores de enum que
coinciden con la base (`promocion`, `borrador`) en español. Toda la interfaz en
**español neutro**, sin voseo, igual que los prompts. Las clases CSS no se
renombraron: son un espacio de nombres de estilos.

**TypeScript estricto con `erasableSyntaxOnly`.** No se admiten propiedades de
constructor ni `enum` de TypeScript: solo sintaxis que se pueda borrar sin
cambiar el JavaScript resultante. Por eso los enums son `as const` y `ApiError`
asigna sus campos a mano.

**Estado global: Context, no Zustand.** Se evaluó y se descartó. Solo hay un
estado global real —la marca activa—, cambia tres veces por sesión, y
`ProfileProvider` no tiene tests. Señal para reconsiderarlo: que aparezca un
segundo estado verdaderamente global y haya que anidar providers; si se hace,
primero tests del provider.

**Lo que se pueda probar sin React va a `lib/`, y se prueba.**

---

## Tests

`npm test` — 71 tests en 4 archivos, sin DOM y sin red:

| Archivo | Qué cubre |
|---|---|
| `lib/dates.test.ts` | Aritmética de fechas como texto, rejillas de mes y semana |
| `lib/access-code.test.ts` | Construir y parsear `id.llave`, con basura alrededor |
| `lib/forbidden-core.test.ts` | Detección de términos prohibidos: tildes, la ñ, normalización |
| `profile/brand-storage.test.ts` | `localStorage` corrupto, formato antiguo, almacenamiento bloqueado |

Vitest corre en Node. `brand-storage.test.ts` usa un doble de `localStorage` de
diez líneas en vez de instalar jsdom: lo que se prueba es nuestro manejo de
datos corruptos, no la implementación del navegador.

---

## Detalles que suelen sorprender

- **El tema se aplica antes de React.** Un script en `index.html` pone
  `data-theme` en `<html>` antes del primer pintado; sin eso se vería un
  parpadeo claro al cargar en oscuro. `ThemeProvider` solo lee ese valor.
- **`color-scheme` no es decorativo.** Le dice al navegador de qué color pintar
  lo que dibuja él: el calendario emergente de `<input type="date">`, las
  barras de desplazamiento. Sin él, en tema oscuro se abre un calendario
  blanco.
- **Generar no guarda.** `/generate` no escribe nada en la base, por diseño. La
  pieza se crea con `createPiece` solo cuando el usuario elige una opción.
- **Editar el perfil no reescribe piezas guardadas.** `BrandPage` no tiene
  ninguna llamada que escriba en `/pieces`; no puede pasar por accidente.
- **Las palabras prohibidas las extrae el backend** (`forbidden_terms` del
  perfil), con la misma función que usa el generador. El cliente solo resalta;
  no reimplementa la heurística.
- **Eliminar una marca es irreversible** y exige escribir su nombre: no hay
  copias de seguridad de las que restaurar.

## Documentación

- Referencia completa: [Documentación](./docs/documentacion-del-proyecto.md)
- Readme General: [README.md GENERAL](./docs/README.md)
- Backend: [Repositorio Backend](https://github.com/ecc0503/branddna-apibackend)
- API interactiva del backend: http://127.0.0.1:8000/docs
