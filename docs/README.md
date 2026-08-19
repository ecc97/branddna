# BrandDNA

Generador de contenido para redes sociales con voz de marca consistente,
pensado para pymes sin equipo de marketing.

Una pyme define su voz **una sola vez** —tono, público, palabras propias,
prohibiciones— y a partir de ahí genera copies para Instagram, WhatsApp,
Facebook o blog en segundos, siempre con ese mismo tono, y los organiza en un
calendario.

## Qué lo diferencia

No es un envoltorio de un chat con IA. La promesa es la **consistencia**, y se
sostiene con dos cosas concretas:

- **El perfil de marca es contexto fijo** en cada generación, no algo que haya
  que reescribir cada vez.
- **Las prohibiciones se comprueban de verdad.** El prompt le pide al modelo
  que no use ciertas palabras, pero un modelo no garantiza nada: el backend
  revisa cada texto generado, y si algo se cuela le pide una corrección y avisa
  al usuario. Ver `backend/app/services/brand_guard.py`.

## Llave de acceso

Cada marca recibe un **código de acceso** al crearse. El backend guarda solo el
hash de la llave y lo muestra una sola vez: ni él mismo puede recuperarlo
después. Toda operación sobre esa marca exige la llave en la cabecera
`X-Brand-Token`.

El código combina el identificador y la llave en una sola cadena, para que
entrar desde otro dispositivo sea copiar y pegar una cosa en lugar de dos.

El servidor **no enumera marcas**: las que conoce cada navegador las guarda él
mismo. Si el código se filtra, se puede **rotar** desde la app y el anterior
deja de servir al instante.

## Puesta en marcha

**1. Base de datos.** En Supabase → SQL Editor, ejecutar
`backend/sql/schema.sql`.

**2. Backend.**

```bash
cd backend
cp .env.example .env          # rellenar con las claves reales
./venv/Scripts/python.exe -m uvicorn main:app --reload
```

`SUPABASE_KEY` debe ser la clave **secreta** (`sb_secret_...`). Con la
publishable, RLS devuelve cero filas sin mensaje de error.

Datos de ejemplo: `./venv/Scripts/python.exe seed.py`

**3. Frontend.**

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

## Estructura

```
backend/     FastAPI + Supabase + Groq. Sin ORM, consultas directas.
frontend/    React + TypeScript + Vite.
docs/        PRD, guía de pruebas manuales y bitácora de decisiones.
prototypes/  Prototipo visual de Claude Design (origen del diseño).
```

## Documentación

| Necesitas | Ve a |
|---|---|
| **Referencia completa del proyecto** | **[/docs/documentacion-del-proyecto.md](documentacion-del-proyecto.md)** |
| Qué hace el producto y por qué | [`/docs/PRD_generador_contenido_marca.md`](PRD_generador_contenido_marca.md) |
| Probar la API a mano | [`docs/guia-pruebas-manuales.md`](https://github.com/ecc0503/branddna-apibackend/blob/main/docs/guia-pruebas-manuales.md) |
| Contrato de endpoints en vivo | http://127.0.0.1:8000/docs |

## Estado

Backend y frontend completos: los cuatro flujos del PRD funcionan de punta a
punta. 93 tests en el backend y 71 en el frontend.

**Fuera de alcance en esta versión** (por decisión del PRD): publicación
automática en redes, generación de imágenes, analítica, y **cuentas de usuario
con correo y contraseña** — su papel lo cumple la llave por marca, que encaja
con lo que el PRD define: un perfil, un administrador, sin roles.

**Limitación asumida:** sin cuentas de usuario, quien pierda su código de
acceso y no lo tenga guardado en ningún navegador pierde el acceso a esa marca.
Y borrar una marca es irreversible: este proyecto no tiene copias de seguridad
configuradas en Supabase, y la interfaz lo advierte antes de confirmar.
