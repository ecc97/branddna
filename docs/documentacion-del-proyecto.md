# BrandDNA — Documentación del proyecto

Documento de referencia del estado actual: qué es, cómo funciona por dentro,
qué decisiones se tomaron y por qué, qué está verificado, qué queda fuera de
alcance y qué deuda hay abierta.

**Última actualización:** 2026-08-14
**Estado:** backend y frontend completos. Los cuatro flujos del PRD funcionan
de punta a punta.

---

## Índice

1. [Qué es BrandDNA](#1-qué-es-branddna)
2. [Qué lo diferencia](#2-qué-lo-diferencia)
3. [Arquitectura](#3-arquitectura)
4. [Stack técnico](#4-stack-técnico)
5. [Los cuatro flujos, de punta a punta](#5-los-cuatro-flujos-de-punta-a-punta)
6. [Base de datos](#6-base-de-datos)
7. [Backend](#7-backend)
8. [Frontend](#8-frontend)
9. [Decisiones de arquitectura](#9-decisiones-de-arquitectura)
10. [Cronología del desarrollo](#10-cronología-del-desarrollo)
11. [Bugs y trampas encontrados](#11-bugs-y-trampas-encontrados)
12. [Qué está verificado y qué no](#12-qué-está-verificado-y-qué-no)
13. [Alcance](#13-alcance)
14. [Deuda técnica](#14-deuda-técnica)
15. [Cómo levantar el proyecto](#15-cómo-levantar-el-proyecto)
16. [Convenciones del código](#16-convenciones-del-código)
17. [Índice de documentación](#17-índice-de-documentación)

---

## 1. Qué es BrandDNA

Una web app donde una pyme define su **voz de marca una sola vez** y después
genera contenido para redes en segundos, siempre con ese mismo tono,
organizándolo en un calendario.

### El problema

Las pymes saben que deben estar en redes pero no logran publicar con
constancia. Una sola persona se encarga de todo, se le acaban las ideas y el
tiempo. El resultado es contenido irregular, sin voz propia, que parece salir
de negocios distintos cada vez.

### La observación que ordena el producto

Debajo del envoltorio de "generador de contenido con IA", lo que el producto
resuelve es:

> **Convertir la voz de marca en un dato persistente y reutilizable**, en vez
> de algo que vive en la cabeza del dueño del negocio.

Eso define qué es valioso:

- El valor **no** está en generar texto. Un chat con IA ya hace eso gratis.
- El valor está en que el usuario **no vuelve a escribir el contexto nunca
  más**. Define su marca una vez y las 200 generaciones siguientes salen
  consistentes.
- El calendario es el otro 50%: hace visible el hueco ("el jueves no tengo
  nada"), que es lo que realmente provoca la inconsistencia de publicación.

**Consecuencia técnica:** `brand_profiles` es la entidad central del sistema,
no `content_pieces`. Todo gira en torno a "el perfil es contexto inmutable en
el momento de generar".

### Usuarios objetivo

| Perfil | Situación |
|---|---|
| Dueño de pyme sin equipo de marketing | Necesita publicar pero no tiene tiempo de pensar copies a diario. Usa más el celular que la computadora. |
| Encargado de redes en una pyme pequeña | Hace de todo: atiende, responde WhatsApp y publica. Sin formación en marketing. Necesita ideas rápidas que respeten un tono ya definido. |

---

## 2. Qué lo diferencia

La promesa es la **consistencia**, y se sostiene con dos mecanismos concretos,
no con un prompt bonito.

### 2.1 El perfil de marca como contexto fijo

Cada llamada a `/generate` reconstruye el prompt combinando los ocho campos del
perfil con el canal, el tipo y el tema. El usuario nunca vuelve a escribir su
tono ni su público.

### 2.2 El control determinista de prohibiciones

Este es el mecanismo que separa el producto de un envoltorio de ChatGPT.

El prompt *le pide* al modelo que no use ciertas palabras, **pero un modelo no
garantiza nada**. Si "gourmet" se cuela una de cada veinte veces, se rompe la
única promesa que el producto hace de forma explícita.

Cómo funciona la cadena completa:

```
1. El usuario escribe en su perfil:  "no usar la palabra gourmet, ni premium"
                                              ↓
2. brand_guard.extract_forbidden_terms()  →  ['gourmet', 'premium']
                                              ↓
3. Los términos se inyectan en el prompt como lista explícita
   ("al modelo le resulta más fácil obedecer una lista que una frase en prosa")
                                              ↓
4. Groq genera 3 opciones
                                              ↓
5. brand_guard.find_violations() revisa cada texto
   — minúsculas, sin tildes (pero conservando la ñ), límite de palabra, plural
                                              ↓
6. ¿Hay violaciones?
   NO  →  se devuelven las 3 opciones, is_clean: true
   SÍ  →  UN reintento correctivo: se le devuelve al modelo su propia
          respuesta señalando el fallo
                                              ↓
7. Solo se acepta el reintento si MEJORA (menos violaciones que el original)
                                              ↓
8. Si algo queda sin resolver, se marca `is_clean: false`, se listan los
   términos en `forbidden_hits` y se añade un aviso en `warnings`.
   Nunca se oculta el problema.
```

Y en el frontend, la palabra prohibida se **resalta dentro del copy**, no se
lista aparte. El aviso se recalcula en vivo mientras el usuario edita.

### Lo que la práctica reveló

Se creó un perfil de prueba prohibiendo **"cafe"** y **"taza"** a una
cafetería, y se pidió contenido sobre *"el café recién molido de la mañana"* —
una prohibición casi imposible de esquivar. El modelo la esquivó **sin
necesidad de reintento**: escribió *"grano recién molido"*.

Buena noticia para el producto, dato incómodo para la verificación: **la ruta
de aviso casi nunca se dispara sola**. Sigue siendo necesaria en tres
situaciones reales: cuando el usuario edita y mete la palabra a mano, cuando el
modelo falla de vez en cuando (los fallos raros son justo los que no se
detectan probando a mano), y cuando el reintento no arregla.

---

## 3. Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  NAVEGADOR                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  frontend/  React + TypeScript + Vite                  │  │
│  │                                                        │  │
│  │  pages/      4 pantallas + detalle de pieza            │  │
│  │  components/ formularios, barra, avisos, fecha         │  │
│  │  lib/        lógica pura (fechas, palabras prohibidas) │  │
│  │  api/        cliente tipado + traducción de errores    │  │
│  │  profile/    resolución del perfil activo              │  │
│  │  theme/      tema claro / oscuro                       │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTP · JSON
                            │  (CORS: localhost:5173)
┌───────────────────────────▼──────────────────────────────────┐
│  backend/  FastAPI                                           │
│                                                              │
│  main.py      monta la app y traduce excepciones a HTTP      │
│  routers/     profiles · generate · pieces                   │
│  services/    groq_service · brand_guard                     │
│  prompts.py   construcción del prompt                        │
│  schemas.py   contratos Pydantic (enums, validación)         │
│  db.py        acceso a Supabase, sin ORM                     │
│  config.py    configuración validada al arrancar             │
└──────────┬────────────────────────────────┬──────────────────┘
           │                                │
           │ supabase-py                    │ requests
           │ (clave sb_secret_)             │
┌──────────▼──────────────┐   ┌─────────────▼──────────────────┐
│  SUPABASE (Postgres)    │   │  GROQ                          │
│  brand_profiles         │   │  llama-3.3-70b-versatile       │
│  content_pieces         │   │  response_format: json_object  │
│  RLS activo sin polít.  │   │  capa gratuita                 │
└─────────────────────────┘   └────────────────────────────────┘
```

### Regla de capas del backend

`db.py` y `services/` **no importan FastAPI**. Lanzan excepciones propias
(`DatabaseError`, `GroqError`) y `main.py` las traduce a códigos HTTP con
`@app.exception_handler`.

**Por qué importa:** la lógica se puede probar sin levantar servidor — que es
exactamente cómo se probó todo. La suite de 67 tests corre en poco más de un
segundo porque no necesita ni servidor ni red.

### El frontend nunca habla con Supabase

React llama a FastAPI; FastAPI llama a Supabase y a Groq. Ninguna clave del
`backend/.env` llega jamás al navegador.

---

## 4. Stack técnico

### Backend — Python 3.14.6

| Paquete | Versión | Para qué |
|---|---|---|
| fastapi | 0.141.1 | API y validación |
| uvicorn | 0.52.1 | Servidor ASGI |
| supabase | 2.31.0 | Cliente oficial, sin ORM |
| requests | 2.34.2 | Llamadas a Groq |
| pydantic | 2.13.4 | Contratos y enums |
| python-dotenv | 1.2.2 | Carga de `.env` |
| pytest | 9.1.1 | Tests (solo desarrollo) |

### Frontend — Node 24.11.1

| Paquete | Versión | Para qué |
|---|---|---|
| react / react-dom | 19.2.8 | Interfaz |
| react-router | 8.3.0 | Navegación por URL |
| vite | 8.2.0 | Build y desarrollo |
| typescript | ~6.0.2 | Tipos |
| oxlint | 1.75.0 | Linter |

Sin librería de estado de servidor (TanStack Query y similares): diez endpoints
no justifican la dependencia. Sin Tailwind: el diseño ya está resuelto en
tokens CSS y Tailwind obligaría a reescribirlo en utilidades.

### Servicios externos

| Servicio | Uso | Nota |
|---|---|---|
| Supabase | Postgres administrado | Clave **secreta** (`sb_secret_...`) en el backend |
| Groq | Generación de texto | `llama-3.3-70b-versatile`, verificado vigente el 2026-08-06 |

### Tamaño del proyecto

| | Archivos | Líneas |
|---|---|---|
| `backend/app` | 12 `.py` | ~1.040 |
| `backend/tests` + conftest | 5 `.py` | ~830 |
| `frontend/src` | 41 (16 tsx, 12 ts, 13 css) | ~3.050 (sin CSS) |

---

## 5. Los cuatro flujos, de punta a punta

### Flujo 1 · Crear el perfil de marca

**Pantalla:** `pages/BrandPage.tsx` (`/marca`)

1. Al abrir la app, `ProfileProvider` mira qué marcas recuerda este navegador.
   Si no conoce ninguna, **ni siquiera llama al backend**.
2. La pantalla de inicio ofrece crear la primera marca o entrar con un código
   de acceso. El formulario de alta se muestra **sin barra de navegación**:
   todavía no hay adónde navegar.
3. El usuario rellena ocho campos. Cuatro son obligatorios: nombre, qué vende,
   tono y público.
   - **Tono híbrido:** cuatro chips (Cercano, Formal, Divertido, Técnico)
     rellenan un campo de texto que sigue siendo editable. Un chip solo aparece
     marcado si el campo dice exactamente su texto: en cuanto se retoca,
     ninguno queda marcado. *El campo manda, no el chip.*
   - **Palabras clave:** se escriben y se convierten en etiquetas. Enter o coma
     confirman; Retroceso con el campo vacío borra la última; `onBlur` también
     guarda.
4. Validación en cliente antes de enviar (no se llama al backend si falta algo).
5. `POST /profiles` → 201.
6. La respuesta trae el **código de acceso**, que se muestra una sola vez con
   opción de copiar y descargar. No se navega automáticamente: primero hay que
   guardarlo, porque es la única vez que existe en claro.
7. El navegador lo recuerda junto al id y el nombre de la marca.

### Flujo 2 · Generar una pieza

**Pantalla:** `pages/GeneratePage.tsx` (`/generar`)

1. El usuario elige canal (4 opciones), tipo de pieza (4 opciones) y escribe un
   tema. Hay cuatro chips de ideas para arrancar sin quedarse en blanco.
2. `POST /generate` con `{profile_id, channel, piece_type, topic}`.
   Timeout de 120 s: por dentro puede haber dos llamadas a Groq.
3. Mientras espera: skeleton de tres tarjetas pulsando + *"Escribiendo con tu
   voz de marca. Puede tardar unos segundos."*
4. **En el backend:**
   - Se busca el perfil (404 claro si no existe).
   - `brand_guard` extrae los términos prohibidos.
   - `prompts.build_user_prompt()` combina perfil + canal + tipo + tema, y
     añade las reglas del canal (`CHANNEL_GUIDELINES`).
   - Una sola llamada a Groq para las tres versiones, con
     `response_format: json_object`.
   - Parseo defensivo en cascada: JSON directo → dentro de un bloque de código
     → substring `{...}` → texto numerado → `GroqError` con el crudo recortado.
   - Control de prohibiciones y, si hace falta, un reintento correctivo.
5. La respuesta trae **una lista** de opciones, no un bloque de texto:
   ```json
   {
     "options": [{"approach": "informativo", "text": "…",
                  "forbidden_hits": [], "is_clean": true}, …],
     "forbidden_terms_checked": ["gourmet", "premium"],
     "regenerated": false,
     "warnings": []
   }
   ```
6. Sobre las tarjetas se muestra qué se revisó. En cada tarjeta: enfoque,
   canal, texto, y botones **Aprobar** / **Guardar borrador** / Editar /
   Descartar.
7. Si una opción usa una palabra prohibida: borde de aviso, palabra
   **resaltada dentro del texto**, mensaje explícito, y el botón principal pasa
   a decir **"Aprobar igualmente"**.
8. **`/generate` no guarda nada.** Descartar no llama al backend: esas opciones
   nunca existieron en la base.

### Flujo 3 · Guardar y programar

**Pantallas:** `GeneratePage` → `CalendarPage` → `PiecePage`

1. Al aprobar: `POST /pieces` con `status: "aprobado"` y **sin fecha**.
   La tarjeta desaparece de la lista (dejarla invitaría a guardarla dos veces).
2. La pieza nace con `scheduled_date: null`.
3. En `/calendario` aparece en la bandeja **"Sin programar"**, bajo el
   calendario. *(Sin esta bandeja, el contenido recién aprobado desaparecería
   de la vista.)*
4. Al abrirla se llega a `/pieza/:id`, donde se puede:
   - editar el texto,
   - cambiar el estado (borrador / aprobado / publicado),
   - poner fecha con el selector híbrido: `–` / campo nativo / `+`, más atajos
     Hoy · Mañana · En una semana,
   - eliminar la pieza, con confirmación en la propia página.
5. **Guardado explícito:** la barra "Guardar cambios" solo aparece cuando hay
   algo que guardar; si no, se lee "Todo guardado". Se envía **solo lo que
   cambió**, aprovechando que el `PUT` es parcial.
6. Con fecha, la pieza aparece en el calendario (mes o semana), con el color de
   su estado.

### Flujo 4 · Editar el perfil

**Pantalla:** `pages/BrandPage.tsx`

1. Se modifica cualquier campo y se guarda con `PUT /profiles/{id}`.
2. **Las piezas ya guardadas no cambian.** El perfil es contexto para generar
   contenido nuevo, no una plantilla que se reaplique a lo aprobado.
3. La siguiente generación sí usa el perfil actualizado.

Esta regla se respeta **por construcción**: `BrandPage.tsx` no contiene ninguna
llamada que toque `/pieces`, así que no puede romperla por accidente. Y hay un
test que lo verifica: `test_editar_perfil_no_toca_las_piezas_guardadas`.

---

## 6. Base de datos

### Esquema

Definido en `backend/sql/schema.sql`. Tablas y columnas en inglés; los valores
que ve el usuario, en español.

```sql
brand_profiles
  id              uuid PK  default gen_random_uuid()
  business_name   text not null
  what_they_sell  text not null
  tone            text not null
  target_audience text not null
  keywords        text not null default ''
  forbidden       text not null default ''
  good_example    text not null default ''
  bad_example     text not null default ''
  access_token_hash text        ← hash de la llave; el token NUNCA se guarda
  created_at      timestamptz not null default now()
  updated_at      timestamptz not null default now()   ← trigger

content_pieces
  id             uuid PK
  profile_id     uuid → brand_profiles(id) ON DELETE CASCADE
  channel        text  check (Instagram | WhatsApp | Facebook | Blog)
  piece_type     text  check (post | historia | promocion | aviso)
  topic          text not null
  generated_text text not null
  scheduled_date date          ← NULL = guardada pero sin programar
  status         text  check (borrador | aprobado | publicado)  default 'borrador'
  created_at     timestamptz
  updated_at     timestamptz   ← trigger

índice: (profile_id, scheduled_date)
```

### Los `check` son la segunda barrera

Pydantic ya rechaza un canal inválido con un 422. Pero si alguien escribe en la
base sin pasar por la API —un script, el dashboard de Supabase, un seed mal
hecho—, el `check` es lo único que impide meter basura que después rompe el
frontend.

### `updated_at` se hace en la base, no en Python

Con un trigger. Así es imposible olvidarlo en un endpoint nuevo, y sigue siendo
cierto si algún día se edita una fila desde el dashboard.

### Seguridad: RLS y la clave correcta

Este punto costó una decisión y merece entenderse.

Supabase entrega **dos claves**:

| Clave | Rol | Pensada para | ¿Se salta RLS? |
|---|---|---|---|
| `sb_publishable_...` | `anon` | Vivir **dentro del navegador**. Es pública por diseño. | ❌ No |
| `sb_secret_...` | `service_role` | Vivir en un **servidor de confianza** | ✅ Sí |

Como el PRD deja la autenticación fuera de alcance, `auth.uid()` siempre es
NULL y RLS no puede distinguir un perfil de otro. Eso dejaba dos arquitecturas
posibles:

| Opción | Implica |
|---|---|
| Publishable + RLS desactivado | Cualquiera con la URL y la clave pública lee y borra toda la base **saltándose la API** |
| **Secreta + RLS activado sin políticas** | La base queda cerrada a todos menos al backend |

**Se eligió la segunda.** El esquema activa RLS sin crear políticas: el backend
entra porque `service_role` se salta RLS; nadie más entra.

> **Aviso importante:** con la clave equivocada, RLS **no lanza un error de
> permisos: devuelve cero filas en silencio.** Es de los bugs más
> desconcertantes de depurar. Por eso `config.supabase_key_warning()` avisa al
> arrancar si detecta una clave publishable.

En esta arquitectura la clave publishable **no tiene ningún consumidor**: el
frontend habla con FastAPI, nunca con Supabase. Por eso no se guarda en ninguna
variable — config sin uso es config que alguien usará por error.

### 6.1 · Llave de acceso por marca

Cada marca recibe una llave aleatoria al crearse (`secrets.token_urlsafe(32)`,
~256 bits). El backend guarda **solo su hash SHA-256** en `access_token_hash` y
la muestra una sola vez: ni él mismo puede recuperarla después.

**Por qué SHA-256 y no bcrypt:** bcrypt es lento a propósito para encarecer los
ataques de diccionario contra contraseñas humanas. Este token no lo elige nadie,
así que no hay diccionario que aplicar y el coste extra no compra seguridad. Lo
que sí es imprescindible es comparar en **tiempo constante**
(`hmac.compare_digest`): una comparación normal tarda un poco más cuanto más
largo sea el prefijo acertado, y eso permite reconstruir el valor.

**Falla cerrado:** un perfil sin hash —una fila anterior a la migración— se
rechaza con 403. Nunca se deja pasar.

**Rotación:** `POST /profiles/{id}/rotate-token` emite una llave nueva e
invalida la anterior. Exige la llave actual: si bastara con el id, rotar sería
una forma de robar la marca.

**En el navegador:** un mapa `{ id: llave }` en `localStorage`. Si una llave deja
de valer (rotada desde otro dispositivo), el 403 la descarta y se vuelve a pedir.

### Archivos SQL

| Archivo | Uso |
|---|---|
| `sql/schema.sql` | Crea todo. Usa `if not exists`: **se puede reejecutar sin miedo** |
| `sql/add-access-token.sql` | Migración de un solo uso: añade `access_token_hash` |
| `sql/drop-legacy-tables.sql` | **Borra datos.** Un solo uso, de una limpieza puntual |

`backend/backfill_tokens.py` asigna llave a los perfiles anteriores a la
migración y las imprime. Sin él, esas marcas quedan inaccesibles.

Están separados a propósito: mezclarlos significaría que alguien que reejecuta
el esquema por rutina se lleva la base por delante.

---

## 7. Backend

### Estructura

```
backend/
├── main.py              monta la app, CORS, traduce excepciones a HTTP
├── seed.py              datos de prueba (idempotente)
├── conftest.py          credenciales falsas antes de importar app
├── pytest.ini
├── requirements.txt / requirements-dev.txt
├── sql/                 schema.sql · drop-legacy-tables.sql
├── app/
│   ├── config.py        configuración validada al importar
│   ├── db.py            cliente Supabase + DatabaseError
│   ├── schemas.py       contratos Pydantic, enums
│   ├── prompts.py       construcción del prompt
│   ├── routers/         profiles.py · generate.py · pieces.py
│   └── services/        groq_service.py · brand_guard.py
└── tests/               4 archivos, 67 tests
```

### Los 10 endpoints

| Método | Ruta | Qué hace | Llave |
|---|---|---|---|
| `GET` | `/` | Estado del servicio, modelo en uso | — |
| `POST` | `/profiles` | Crear marca → 201. **Devuelve la llave una vez** | — |
| `GET` | `/profiles/{id}` | Ver un perfil completo | ✅ |
| `PUT` | `/profiles/{id}` | Editar (parcial) | ✅ |
| `DELETE` | `/profiles/{id}` | Borrar la marca y sus piezas en cascada | ✅ |
| `POST` | `/profiles/{id}/rotate-token` | Emitir llave nueva, invalidar la anterior | ✅ |
| `POST` | `/generate` | 3 opciones. **No guarda nada** | ✅ |
| `POST` | `/pieces` | Guardar la elegida → 201 | ✅ |
| `GET` | `/pieces?profile_id=` | Calendario del perfil | ✅ |
| `PUT` | `/pieces/{id}` | Editar texto, fecha o estado (parcial) | ✅ |
| `DELETE` | `/pieces/{id}` | Borrar → 204 | ✅ |

**No hay endpoint de listado.** Lo hubo, y se retiró en el hito 13: revelaba a
cualquiera qué negocios usan la app. Ahora el servidor no enumera nada, solo
responde por una marca concreta a quien tenga su llave.

La llave viaja en la cabecera **`X-Brand-Token`**. En cabecera y no en la URL a
propósito: los parámetros de consulta acaban en los registros del servidor, en
el historial del navegador y en la cabecera `Referer` al salir del sitio.

`PUT` y `DELETE /pieces/{id}` **no reciben `profile_id`**: hay que leer la pieza
primero para saber a quién pertenece y validar después. Es el único caso que
necesita dos consultas para autorizar.

Hubo un `GET /profiles` que listaba las marcas, para que el frontend pudiera
ofrecer un selector al arrancar. Se retiró en el hito 13: revelaba qué negocios
usan la app. Ahora esa lista la mantiene el navegador.

Documentación interactiva en `http://127.0.0.1:8000/docs`, generada por FastAPI
a partir de los tipos de `schemas.py`. No hay una línea escrita a mano para esa
página.

### `config.py` — falla al arrancar, no en la primera petición

La configuración se valida al importar el módulo. Si falta una variable, el
servidor no arranca y dice cuál. Es preferible a descubrirlo con un 500 en
producción tres días después.

### `prompts.py` — el prompt es el producto

Vive en su propio módulo porque es donde se codifica la promesa de
consistencia. Tenerlo separado del código de red permite leerlo, versionarlo y
ajustarlo sin tocar la integración.

Contiene:
- `SYSTEM_PROMPT` con las cuatro reglas que el modelo no rompe.
- `CHANNEL_GUIDELINES`: cómo cambia el copy según el canal. Instagram máximo 90
  palabras con 3-5 hashtags; WhatsApp 2-4 líneas sin hashtags; Facebook 80-150
  palabras; Blog 250-400 con título.
- `PIECE_TYPE_GUIDELINES` y los tres enfoques.
- `build_correction_prompt()` para el reintento.

### `services/groq_service.py`

Tres decisiones que conviene entender:

1. **Salida estructurada.** Se pide `response_format: json_object`. Aun así hay
   parseo defensivo en cascada: un modelo puede desobedecer, y un fallo de
   formato no debe tumbar la petición.
2. **Una sola llamada para las 3 versiones.** Tres llamadas paralelas gastarían
   más cuota, triplicarían los tokens del perfil y darían versiones que no se
   conocen entre sí (riesgo de que salgan casi idénticas).
3. **Un único reintento correctivo.** Acota latencia y consumo. Si el reintento
   falla por red, se devuelve el primer intento marcado en vez de un error.

### `services/brand_guard.py`

Lógica pura, sin red ni base de datos. Extrae los términos del texto libre del
perfil (`"no usar la palabra gourmet, ni premium"` → `['gourmet', 'premium']`)
y los busca en los textos generados.

**Limitación conocida y aceptada:** la extracción es heurística porque el campo
es prosa libre. Por eso la API devuelve `forbidden_terms_checked`: el usuario
ve exactamente qué se vigiló y puede reformular su perfil.

### Tests — 67, sin red ni base de datos

| Archivo | Tests | Qué protege |
|---|---|---|
| `test_api.py` | 27 | Los endpoints: códigos, validación y flujos del PRD |
| `test_auth.py` | 20 | Llave de acceso: aislamiento entre marcas y fallo cerrado |
| `test_brand_guard.py` | 20 | Extracción y detección de términos |
| `test_parsing.py` | 13 | Las formas en que un LLM rompe el contrato JSON |
| `test_generation.py` | 7 | Reintento correctivo y degradación ante fallos |

**Ningún test toca la red.** `backend/conftest.py` fija credenciales falsas
*antes* de importar `app`; funciona porque `load_dotenv()` no sobrescribe
variables ya presentes en el entorno. Si un test intentara salir a internet,
fallaría de forma ruidosa en vez de gastar cuota o escribir en la base real.

Tres tests codifican **reglas duras del PRD**, no detalles de implementación:

- `test_generar_no_guarda_nada`
- `test_editar_perfil_no_toca_las_piezas_guardadas`
- `test_las_piezas_no_se_mezclan_entre_perfiles`

Si alguien rompe una de esas reglas "optimizando" algo, el test lo dice **y
además dice por qué estaba así**.

---

## 8. Frontend

### Estructura

```
frontend/src/
├── main.tsx              monta ThemeProvider → App
├── App.tsx               router + compuerta de estado
├── api/
│   ├── types.ts          espejo del contrato del backend
│   ├── labels.ts         valor → etiqueta y color de pantalla
│   ├── client.ts         fetch + traducción de errores al español
│   ├── profiles.ts · generate.ts · pieces.ts
│   └── index.ts          punto de entrada único
├── components/
│   ├── AppShell.tsx      barra inferior + layout
│   ├── TextInput.tsx     TextInput y TextArea
│   ├── TagInput.tsx      palabras clave escribibles
│   ├── ToneSelector.tsx  tono híbrido
│   ├── DateStepper.tsx   – / campo nativo / +
│   └── Toast.tsx         aviso temporal
├── lib/
│   ├── fechas.ts         utilidades de fecha, sin dependencias
│   ├── prohibidas-core.ts detección (lógica pura, testeable en Node)
│   └── prohibidas.tsx    resaltado con <mark>
├── pages/
│   ├── HomePage.tsx      inicio: marcas conocidas, crear, entrar con código
│   ├── BrandPage.tsx     perfil de marca (crear y editar)
│   ├── GeneratePage.tsx  generador
│   ├── CalendarPage.tsx  calendario mes / semana
│   └── PiecePage.tsx     detalle de pieza
├── profile/              resolución del perfil activo
├── styles/               theme.css (tokens) · global.css
└── theme/                tema claro / oscuro
```

### Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Inicio: marcas conocidas y entrada por código |
| `/marca/nueva` | Alta de una marca |
| `/generar` | Generador |
| `/calendario` | Calendario |
| `/pieza/:id` | Detalle de pieza |
| `/marca` | Perfil de marca |
| cualquier otra | redirige a `/generar` |

Se usa react-router y no un estado de pestaña por tres razones concretas: el
botón "atrás" del navegador funciona, recargar no te devuelve al inicio, y una
pieza concreta se puede enlazar.

### Los cinco estados de arranque

Sin autenticación, al abrir la app no se sabe con qué marca se trabaja. Antes
de montar el router hay que resolverlo, y los cinco estados son situaciones
reales:

| Estado | Cuándo | Qué se muestra |
|---|---|---|
| `loading` | comprobando la marca recordada | "Un momento…" |
| `error` | backend apagado | Mensaje + **el comando para levantarlo** + reintentar |
| `choosing` | sin marca activa | Pantalla de inicio |
| `ready` | hay marca activa | La app con sus rutas |

**El navegador guarda `{ id, nombre, llave }` de cada marca que conoce**, y esa
lista es la que se ofrece al arrancar. Nunca viene del servidor, así que su
tamaño no depende del de la base de datos.

Si la marca recordada ya no existe (404) o su llave dejó de valer porque se
rotó desde otro dispositivo (403), se olvida y se vuelve al inicio: guardarla
solo produciría el mismo error en cada recarga.

**Si este navegador no conoce ninguna marca, el arranque no toca la red.**

### Sistema de diseño

Los tokens vienen del prototipo de Claude Design
(`prototypes/BrandDNA web app prototipo/BrandDNA.dc.html`), **copiados con los
mismos nombres y los mismos valores**. Así el diseño implementado es el
aprobado, no una aproximación, y cualquier ajuste futuro del prototipo se
traslada comparando un archivo.

| Grupo | Tokens |
|---|---|
| Superficies | `--s0` … `--s3`, `--p1`, `--p2` |
| Bordes | `--b0` … `--b2` |
| Texto | `--t0` … `--t6` |
| Acento | `--acc`, `--acc-h`, `--acc-t`, `--acc-soft`, `--on-acc` |
| Semánticos | `--ok`, `--warn` |
| Estados de pieza | `--st-d` (borrador), `--ok` (aprobado), `--st-p` (publicado) |

Tipografía: **Instrument Serif** para títulos, **Instrument Sans** para el
resto.

**Ningún color se escribe a mano.** Es lo que hace que el tema oscuro salga
gratis. Se auditó con `grep` al cerrar el proyecto y apareció un incumplimiento
real (ver §11).

### Detalles del tema

- **Script anti-parpadeo** en `index.html`: aplica `data-theme` *antes de que
  React exista*. Si se hiciera desde React se vería un destello en claro antes
  de saltar a oscuro. Respeta `prefers-color-scheme` la primera vez.
- **`color-scheme: dark`** en el tema oscuro: le dice al navegador de qué color
  pintar lo que dibuja él y nosotros no controlamos — el calendario emergente
  de `<input type="date">`, las barras de desplazamiento, los desplegables.
  Sin esa línea se abriría un calendario blanco deslumbrante.
- **`prefers-reduced-motion`** respetado en `global.css`.

### La capa de API

Su trabajo real no es hacer `fetch` —eso son tres líneas— sino **convertir
cualquier forma de fallo en un mensaje que se le pueda enseñar a un dueño de
pyme**.

FastAPI devuelve esto:

```json
{"detail":[{"type":"enum","loc":["body","channel"],
            "msg":"Input should be 'Instagram', ...",
            "ctx":{"expected":"'Instagram', 'WhatsApp', 'Facebook' or 'Blog'"}}]}
```

Y el cliente lo convierte en:

> El canal tiene un valor no válido. Opciones: 'Instagram', 'WhatsApp', 'Facebook' or 'Blog'.

Traduce por **tipo** de error de Pydantic (`missing` → "es obligatorio",
`uuid_parsing` → "no es un identificador válido"). Los 400/404/502 pasan tal
cual porque el backend ya los manda en español. Y si el servidor está apagado,
`status: 0` con un mensaje que incluye la URL a la que se intentó llegar.

### Un solo vocabulario

`api/types.ts` es un **espejo exacto** del backend: mismos nombres
(`is_clean`, no `isClean`) y mismos valores de enum (`promocion`, `Instagram`).

Se descartó explícitamente convertir a camelCase "al estilo JavaScript": obliga
a mantener una traducción en dos direcciones para siempre, y cada campo nuevo
es una oportunidad de equivocarse en silencio. **La única traducción va en una
dirección** —valor → etiqueta de pantalla— y vive aislada en `labels.ts`.

---

## 9. Decisiones de arquitectura

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| 1 | Código y BD en inglés, valores y prompts en español | Todo en español | Los docs se contradecían; la nota más reciente pedía inglés |
| 2 | Backend modular en `app/` | Todo en `main.py` | `/generate` concentra prompt + red + parseo + validación |
| 3 | `db.py` y `services/` no importan FastAPI | Lanzar `HTTPException` desde el servicio | Permite probar sin servidor; 67 tests en 1 s |
| 4 | Clave secreta + RLS sin políticas | Publishable + RLS desactivado | La segunda deja la base abierta a quien tenga la URL |
| 5 | `/generate` no guarda nada | Guardar las 3 y borrar las descartadas | Separa "proponer" de "confirmar"; no ensucia el calendario |
| 6 | Salida JSON estructurada del modelo | Devolver el texto crudo | El frontend necesita 3 objetos, no un bloque |
| 7 | Una llamada para las 3 versiones | Tres llamadas paralelas | Menos cuota, menos tokens, y el modelo ve las tres a la vez |
| 8 | Un solo reintento correctivo | Reintentar hasta que salga limpio | Acota latencia y consumo de la capa gratuita |
| 9 | Tipos del frontend = espejo del backend | camelCase idiomático | Traducción bidireccional = bugs silenciosos |
| 10 | react-router | Estado de pestaña | Atrás, recarga y enlaces directos |
| 11 | CSS Modules + tokens | Tailwind | El diseño ya está resuelto en tokens |
| 12 | Hooks propios | TanStack Query | Diez endpoints no justifican la dependencia |
| 13 | Sin marco de teléfono | Copiar el 412×872 del prototipo | El PRD dice que el usuario *usa* el móvil, no que la app sea solo móvil |
| 14 | Tono híbrido (chips + campo) | Solo 4 tonos / solo texto libre | Cuatro voces para todos los negocios, o pantalla en blanco |
| 15 | Keywords escribibles | Chips fijos | Los del prototipo eran de panadería |
| 16 | Fechas sin hora como texto | Convertir a `Date` | `new Date("2026-09-15")` da el día anterior en América |
| 17 | Selector de fecha híbrido | Solo stepper / solo nativo | Ajustar y saltar son tareas distintas |
| 18 | Guardado explícito en el detalle | Guardar al cambiar cada campo | Menos peticiones, sin estados imposibles, permite arrepentirse |

---

## 10. Cronología del desarrollo

Cuatro días, diez hitos. Cada uno tiene su entrada en `docs/bitacora/`.

| Día | Hito | Qué se cerró |
|---|---|---|
| 06/08 | **01** Setup, esquema y backend | Desempate de los docs, backend modular completo, decisión de la clave secreta |
| 07/08 | **02** Suite de tests | 67 tests con pytest; **encontraron 2 bugs reales** |
| 07/08 | **03** Esquema y flujo end-to-end | Tablas en Supabase, 14 garantías verificadas contra Postgres, pasos 6-9 de la guía |
| 08/08 | **04** Frontend paso 1 | Análisis del prototipo, Vite + React + TS, tokens de diseño |
| 08/08 | **05** Frontend paso 2 | Capa de API tipada con traducción de errores |
| 09/08 | **06** Frontend paso 3 | Router, resolución del perfil activo, pantalla de marca |
| 09/08 | **07** Frontend paso 4 | Generador **con el control de marca por fin visible** |
| 09/08 | **08** Frontend paso 5 | Calendario con fechas reales y bandeja "Sin programar" |
| 09/08 | **09** Frontend paso 6 | Detalle de pieza: editar, estado, fecha, eliminar |
| 09/08 | **10** Frontend paso 7 | Crear otra marca, retirar andamiaje, auditoría, README |
| 09/08 | **11** Llave de acceso | Cierre de la deuda grande + renombrado de todo el código a inglés |
| 09/08 | **12** Deuda pequeña | `GET /pieces/{id}`, términos prohibidos en el perfil, Vitest y cobertura |
| 14/08 | **13** Inicio y código de acceso | Pantalla de inicio, código único, fuera el listado, borrado de marca |

---

## 11. Bugs y trampas encontrados

Esta sección existe porque cada uno enseñó algo reutilizable.

### Bugs reales en el código

**1. Comilla pegada al término prohibido** *(hito 02)*

```
entrada : no usar "gourmet"
obtenido: ['"gourmet']       ← nunca coincidiría con nada
```

Las comillas se limpiaban de los extremos antes de quitar el prefijo, pero en
`no usar "gourmet"` la comilla de apertura queda en medio. **Impacto: el
control de marca habría fallado en silencio** — el usuario cree que su
prohibición está activa y no lo está. Es la peor forma de fallar.

**2. Relleno tratado como término** *(hito 02)*

`"no usar"` a secas producía el término `['no usar']`, que habría marcado
cualquier copy que dijera "no usar".

**3. La ñ desaparecía** *(hito 02)*

`normalize()` convertía `ñ` en `n` porque NFD trata la ñ como "n + tilde". En
español es una letra propia. Consecuencia: una marca que prohibiera **"ano"**
habría marcado cualquier texto con **"año"**.

**4. Un negro invisible en tema oscuro** *(hito 10)*

```css
.quitarTag:hover { background: rgb(0 0 0 / 8%); }
```

Funciona sobre el chip claro y es invisible sobre el oscuro — exactamente el
fallo que la regla "ningún color a mano" existe para evitar. Lo encontró un
`grep`, no la vista.

**5. El temporizador del Toast se reiniciaba en cada render** *(hito 06)*

`onCerrar={() => setAviso(null)}` crea una función nueva cada render; al estar
en las dependencias del efecto, el contador volvía a cero. Con un padre que se
re-renderice, el aviso se quedaría en pantalla para siempre.

> **Patrón que conviene reconocer:** una función en las dependencias de un
> efecto casi siempre es un temporizador o una suscripción que se reinicia sin
> querer.

### Trampas del entorno

**6. `new Date('2026-09-15')` devuelve el día 14** *(hito 08)*

Una cadena de solo fecha se interpreta como **medianoche UTC**. En cualquier
zona con desfase negativo —toda América— se muestra un día antes. Es el bug de
calendario más repetido que existe, y solo lo sufren algunos usuarios: quien
programa desde Europa nunca lo ve.

**7. `pkill` no mata procesos de Windows** *(hito 03)*

Imprimía "servidor detenido" y el uvicorn seguía vivo sirviendo **el código
viejo**. Se detectó por un `[Errno 10048] bind` en el arranque siguiente.

**8. El `&` de bash se lleva toda la cadena al fondo** *(hito 03)*

```bash
set -a && . ./.env && set +a && uvicorn main:app &   # MAL
```

Síntoma: `KeyError: 'SUPABASE_URL'` en el script siguiente, con el `.env`
perfecto.

**9. `npx tsc --noEmit` no comprueba nada** *(hito 05)*

Vite genera *project references*; el tsconfig raíz solo apunta a los otros dos.
La orden fiable es `npm run build`.

**10. Caracteres invisibles en el código** *(hito 07)*

Una clase de caracteres `[◌̀-◌ͯ]` con marcas combinantes, invisibles en el
editor. Cualquier copia o formateo las rompe sin que se vea nada. Se sustituyó
por `\p{Mn}`, la propiedad Unicode con nombre.

**11. Tablas fantasma de una sesión anterior** *(hito 03)*

Al comprobar Supabase aparecieron dos tablas con nombres incompatibles que no
figuraban en ningún documento. Comprobar el estado real del entorno costó dos
comandos; descubrirlo a mitad del hito habría costado una tarde.

### Errores de método (no del código)

**12. Tests con expectativas mal calculadas** *(hito 08)*

Dos "fallos" iniciales de las pruebas de fecha eran del test: un caso
`2026-02-29` (2026 no es bisiesto) y esperar 28 celdas para un febrero que
empieza en domingo y necesita 35.

> **Lección:** cuando un test falla, la primera hipótesis no debe ser siempre
> que el código está mal.

**13. Fechas de bitácora escritas sin comprobar** *(hito 08)*

Siete entradas fechadas todas el 6 de agosto cuando el proyecto abarcaba del 6
al 9. Se corrigieron con la fecha real de modificación de cada archivo. En una
bitácora la fecha no es adorno: es lo que permite reconstruir el orden y el
ritmo de las decisiones.

---

## 12. Qué está verificado y qué no

### Verificado

| Qué | Cómo | Resultado |
|---|---|---|
| Backend completo | pytest, sin red ni BD | **93/93**, 91% de cobertura |
| Frontend: lógica pura y almacenamiento | Vitest | **71/71** |
| Llave de acceso end-to-end | Backend real, dos marcas | **18/18** |
| Garantías de Postgres | Llamadas directas a PostgREST, sin pasar por FastAPI | **14/14** |
| Utilidades de fecha | esbuild + Node, en zona UTC−5 | **24/24** |
| Paridad del algoritmo de prohibidas JS ≡ Python | esbuild + Node vs `brand_guard` | **16/16** |
| Actualización parcial (`PUT`) | Contra el backend real | **14/14** |
| Tipos del frontend vs backend | Comparación campo por campo | **10/10** |
| Modelo de Groq vigente | `GET /openai/v1/models` | ✅ |
| CORS desde `localhost:5173` | Preflight + petición real | ✅ |
| Flujo end-to-end con Groq real | Pasos 6-9 de la guía | ✅ |
| Sin colores a mano · sin `new Date(cadena)` | `grep` sobre `src/` | ✅ |

**Detalle de las 14 garantías de Postgres:** insertar, defaults, `created_at` /
`updated_at` automáticos, trigger de `updated_at`, `created_at` inmutable, los
tres `check` (canal, tipo, estado), la clave foránea, `status` por defecto,
`scheduled_date` nace NULL, orden con nulos al final, borrado en cascada, base
limpia al terminar.

**El caso más delicado de la actualización parcial:** enviar
`{"scheduled_date": null}` tiene que **desprogramar**, y eso depende de que el
backend use `exclude_unset=True` y no `exclude_none=True`. Con la segunda
opción, quitar la fecha no habría hecho nada y nadie se habría dado cuenta
hasta ver el calendario mal. Verificado que funciona.

### No verificado

- **Las pantallas del frontend no tienen tests.** Solo la lógica pura de
  `lib/`. Los componentes se verifican con build, linter y pruebas manuales.
- **El doble de Supabase de los tests imita el cliente, no Postgres.** No
  valida los `check`, las claves foráneas ni el orden real con nulos — eso solo
  se comprueba contra la base real, y por eso se hizo aparte.
- **No hay pruebas en navegadores distintos** ni en dispositivos reales.

---

## 13. Alcance

### Dentro

- Perfil de marca: crear, editar, varias marcas, cambiar entre ellas
- Generación de 3 opciones por canal y tipo de pieza
- Control de palabras prohibidas con reintento correctivo y aviso visible
- Guardar piezas como borrador o aprobado
- Calendario en vista de mes y semana, con navegación y huecos visibles
- Bandeja de piezas sin programar
- Detalle de pieza: editar texto, estado, fecha, eliminar
- Tema claro y oscuro, persistente
- Interfaz responsive, mobile-first

### Fuera, por decisión del PRD

| Fuera de alcance | Nota |
|---|---|
| Publicación automática en redes | El sistema genera y organiza; no publica |
| Generación de imágenes o vídeo | Solo texto |
| Varios usuarios o roles por negocio | Un perfil = un administrador |
| Analítica de desempeño | Sin alcance ni interacciones |
| Traducción automática | Solo español |
| Tabla de canales con reglas propias | Las reglas están en `prompts.py` |
| Edición colaborativa | — |
| Integración con Google Calendar / Outlook | — |
| Cuentas con correo y contraseña | Su papel lo cumple la llave por marca (§6.1) |

---

## 14. Deuda técnica

Ordenada por lo que costaría arreglarla.

### Cerradas en el hito 12

- ~~Falta `GET /pieces/{id}`~~ → añadido, con la llave exigida.
- ~~El perfil no expone los términos prohibidos~~ → campo calculado
  `forbidden_terms`, que no puede desincronizarse de `forbidden` y usa la misma
  función que el generador.
- ~~Sin tests en el frontend~~ → 39 tests con Vitest sobre `lib/`.
- ~~Sin `pytest-cov`~~ → activado por defecto, 91%.

### Menor

**Aviso de deprecación de starlette sobre `httpx`.** Informativo, no afecta.

### Cerrada en el hito 11

**~~No hay autenticación.~~** Resuelta con la **llave de acceso por marca**
(ver §6.1). Conocer un `profile_id` ya no basta para nada: cada operación exige
la llave de esa marca.

### Cerrado en el hito 13

**~~`GET /profiles` es público.~~** El endpoint se eliminó. El servidor ya no
enumera marcas: solo responde por una concreta a quien tenga su llave.

### Limitaciones asumidas del modelo

**La llave vive en `localStorage`.** Un XSS la expondría — la misma superficie
que cualquier bearer token en una SPA.

**Sin cuentas, perder el código es perder el acceso.** Quien pierda su código
de acceso y no lo tenga guardado en ningún navegador no puede recuperar esa
marca. Es la contrapartida de no tener login, y se dice en la interfaz al
entregar el código.

**El borrado de marca es irreversible.** El plan de Supabase de este proyecto
no incluye recuperación a un punto en el tiempo. La interfaz lo advierte con
esas palabras y exige escribir el nombre de la marca para confirmar.

### Si algún día crece a producto real

Con varios administradores por negocio o recuperación de acceso robusta, tocaría
migrar a Supabase Auth: cuentas, `user_id` en `brand_profiles`, políticas RLS por
`auth.uid()`, y que el backend **propague el token del usuario** en vez de usar
la clave secreta. Es un hito propio, y hoy no hace falta: el PRD define un
perfil, un administrador, sin roles ni colaboración — que es exactamente el papel
que cumple la llave.

---

## 15. Cómo levantar el proyecto

### Requisitos

- Python 3.14 y Node 24
- Un proyecto de Supabase
- Una API key de Groq (capa gratuita)

### 1 · Base de datos

En Supabase → **SQL Editor** → ejecutar `backend/sql/schema.sql`.

### 2 · Backend

```bash
cd backend
cp .env.example .env      # rellenar con las claves reales
./venv/Scripts/python.exe -m uvicorn main:app --reload   # Windows
uvicorn main:app --reload                                # con el venv activado
```

`SUPABASE_KEY` debe ser la clave **secreta** (`sb_secret_...`).

Datos de ejemplo (idempotente):

```bash
./venv/Scripts/python.exe seed.py
```

Tests:

```bash
./venv/Scripts/python.exe -m pytest
```

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # comprueba tipos y compila
npm run lint
```

### Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| Listas vacías, sin error | `SUPABASE_KEY` no es la secreta. RLS devuelve cero filas en silencio |
| `502` al generar | Groq: límite de la capa gratuita, sin red, o modelo inexistente |
| El servidor no arranca y dice "falta la variable X" | Falta algo en `.env`; comparar con `.env.example` |
| Cambias código y no se refleja | Un uvicorn zombi en el 8000 sirviendo la versión vieja |

Para el uvicorn zombi, en PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 16. Convenciones del código

Recogidas en `CLAUDE.md`, que es lo que se lee al abrir el proyecto.

**Idioma.** **Todo el código en inglés**: funciones, variables, tipos, fixtures
y nombres de test. En **español**: comentarios y docstrings, textos de la
interfaz, mensajes de error, los prompts, y los **valores** de enum que deben
coincidir con la base (`promocion`, `borrador`, `aviso`). Las clases CSS no se
renombraron: son un espacio de nombres de estilos.

**Capas del backend.** `db.py` y `services/` no importan FastAPI. Lanzan
excepciones propias y `main.py` las traduce a HTTP.

**Enums, no strings.** Canal, tipo y estado son `Enum` en `schemas.py`. Añadir
un canal nuevo implica tocar el `Enum`, el `check` de `sql/schema.sql` y
`CHANNEL_GUIDELINES` en `prompts.py`. Los tres sitios.

**Frontend: los colores nunca se escriben a mano.** Salen de los tokens de
`styles/theme.css`.

**Frontend: los tipos son un espejo del backend.** Mismos nombres, mismos
valores de enum.

**Frontend: las fechas sin hora se tratan como texto.** Nunca
`new Date("2026-09-15")`.

**Comprobar tipos con `npm run build`**, no con `npx tsc --noEmit`.

**Bitácora.** Al terminar un hito, dejar entrada en `docs/bitacora/`: contexto,
decisión, alternativas descartadas, consecuencias y cómo verificarlo.

---

## 17. Índice de documentación

| Necesitas | Documento |
|---|---|
| Qué hace el producto y por qué | `docs/PRD_generador_contenido_marca.md` |
| Visión general y arranque rápido | `README.md` |
| Probar la API a mano, paso a paso | `docs/guia-pruebas-manuales.md` |
| Contrato de endpoints en vivo | http://127.0.0.1:8000/docs |
| Convenciones al escribir código | `CLAUDE.md` |
| Frontend en detalle | `frontend/README.md` |
| **Por qué el código es así** | `docs/bitacora/01` a `10` |
| Este documento | `docs/documentacion-del-proyecto.md` |

### Documentos descartados

Se conservan como registro histórico, **no deben usarse**:

- `docs/como-probar-flujo-backend.md` — rutas y claves en español
- `docs/indicaciones-endpoints-backend.md` — ejemplos con claves en español

### La bitácora, hito por hito

| Entrada | Contenido |
|---|---|
| `01-setup-esquema-y-backend.md` | Desempate de los docs, backend modular, clave secreta de Supabase |
| `02-suite-de-tests.md` | 67 tests y los 2 bugs que encontraron |
| `03-esquema-y-flujo-end-to-end.md` | Tablas fantasma, 14 garantías de Postgres, flujo completo |
| `04-frontend-paso1-sistema-de-diseno.md` | Análisis del prototipo y tokens de diseño |
| `05-frontend-paso2-capa-de-api.md` | Tipos espejo y traducción de errores |
| `06-frontend-paso3-arranque-y-marca.md` | Los cinco estados de arranque |
| `07-frontend-paso4-generador.md` | El control de marca hecho visible |
| `08-frontend-paso5-calendario.md` | La trampa de zona horaria |
| `09-frontend-paso6-detalle-de-pieza.md` | Selector híbrido y guardado explícito |
| `10-frontend-paso7-pulido.md` | Cierre, auditoría y deuda final |
| `11-llave-de-acceso-por-marca.md` | Token por marca y renombrado a inglés |
| `12-deuda-pequena.md` | Cierre de la deuda técnica |
| `13-inicio-codigo-de-acceso-y-borrado.md` | Pantalla de inicio, código único y borrado |
