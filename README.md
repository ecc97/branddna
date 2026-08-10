# BrandDNA · frontend

React + TypeScript + Vite. Habla con el backend FastAPI de `../backend`.

## Poner en marcha

El backend tiene que estar corriendo primero:

```bash
cd ../backend
./venv/Scripts/python.exe -m uvicorn main:app --reload
```

Después:

```bash
npm install
npm run dev      # http://localhost:5173
```

Si el backend no está en `http://127.0.0.1:8000`, copia `.env.example` como
`.env` y ajusta `VITE_API_URL`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | **Comprueba tipos y compila.** Es la orden fiable para validar tipos |
| `npm run lint` | oxlint |
| `npm run preview` | Sirve el resultado de `build` |

> `npx tsc --noEmit` **no comprueba nada** en este proyecto: Vite usa
> *project references* y el `tsconfig.json` de la raíz solo apunta a los
> otros dos. Usa `npm run build`.

## Estructura

```
src/
├── api/          capa de datos: tipos, cliente fetch y un módulo por recurso
├── components/   piezas reutilizables (formularios, barra, avisos)
├── lib/          lógica pura sin React (fechas, palabras prohibidas)
├── pages/        una por pantalla
├── profile/      resolución del perfil de marca activo
├── styles/       tokens de diseño y estilos base
└── theme/        tema claro / oscuro
```

## Reglas del proyecto

**Los colores nunca se escriben a mano.** Salen de los tokens de
`styles/theme.css`, copiados del prototipo de Claude Design. Un `#fff` suelto
rompe el tema oscuro.

**Los tipos de `api/types.ts` son un espejo del backend.** Mismos nombres
(`is_clean`, no `isClean`) y mismos valores de enum (`promocion`,
`Instagram`). La única traducción es a etiquetas de pantalla, en `api/labels.ts`.

**Las fechas sin hora se tratan como texto.** Nunca `new Date("2026-09-15")`:
eso da el día anterior en cualquier zona con desfase negativo. Ver
`lib/fechas.ts`.

**Toda la interfaz en español neutro**, sin voseo, igual que los prompts.

## Documentación

- Decisiones y su porqué: `../docs/bitacora/` (entradas 04 a 10)
- Prototipo de origen: `../prototypes/BrandDNA web app prototipo/`
