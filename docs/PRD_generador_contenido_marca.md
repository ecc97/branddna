# PRD: Generador de Contenido con Voz de Marca para Pymes

## Contexto del reto

Las pymes saben que deben estar en redes, pero no logran publicar con constancia. Una sola persona se encarga de todo, se le acaban las ideas y el tiempo. El resultado es contenido irregular, sin voz propia, que parece salir de negocios distintos cada vez.

El reto pide una solución con IA que genere ideas, copies y piezas para redes con voz de marca consistente, adaptadas a cada canal, organizadas en un calendario. Debe ser demostrable desde el primer día.

---

## 🎯 Visión del producto

Es una web app donde una pyme define su voz de marca una sola vez y después genera contenido para redes en segundos, siempre con ese mismo tono. Resuelve el problema de la inconsistencia y la falta de tiempo, no el de la creatividad pura.

Está pensada para negocios pequeños sin equipo de marketing: una panadería, un consultorio, una tienda de ropa. Cualquier pyme que hoy publica cuando se acuerda y sin un mensaje claro.

---

## 👥 Usuarios objetivo

**Dueño de pyme sin equipo de marketing**
Necesita publicar en redes pero no tiene tiempo para pensar copies todos los días. Se frustra cuando el contenido queda genérico o cuando pasa semanas sin publicar. Usa el celular más que la computadora, así que la app debe ser simple de operar.

**Encargado de redes en una pyme pequeña**
Es una sola persona que hace de todo: atiende clientes, responde WhatsApp y también publica en Instagram. No tiene formación en marketing. Necesita ideas rápidas que respeten un tono ya definido, sin tener que preguntarle al dueño cada vez "así suena bien?".

---

## ⚙️ Funcionalidades core

**Cuando el usuario crea su perfil de marca por primera vez, el sistema guarda esos datos como base fija para toda generación futura.**
El perfil incluye nombre del negocio, qué vende, tono, público objetivo, palabras clave, prohibiciones y ejemplos de qué sí y qué no suena a la marca.

**Cuando el usuario pide contenido nuevo, el sistema genera 2 o 3 opciones de copy usando el perfil de marca como contexto fijo.**
El usuario elige canal (Instagram, WhatsApp, Facebook, blog), tipo de pieza (post, historia, promoción, aviso) y tema puntual.

**Cuando el usuario aprueba una pieza, el sistema la guarda con fecha programada y estado.**
Los estados posibles son borrador, aprobado y publicado.

**Cuando el usuario abre el calendario, el sistema muestra las piezas ordenadas por fecha programada.**
Vista simple, semanal o mensual, para ver qué hay planeado y qué huecos faltan llenar.

**Cuando el usuario edita el perfil de marca, el sistema aplica los cambios a partir de esa generación en adelante.**
No reescribe piezas ya generadas, solo afecta contenido nuevo.

---

## 🔄 Flujos de usuario

**Flujo 1: Crear perfil de marca (primera vez)**
1. El usuario entra a la app y ve un formulario corto.
2. Llena nombre del negocio, qué vende, tono, público objetivo, palabras clave, prohibiciones y dos ejemplos (uno bueno, uno malo).
3. Guarda el perfil.
4. El sistema confirma que el perfil quedó listo para usarse.

**Flujo 2: Generar una pieza de contenido**
1. El usuario entra a la sección de generador.
2. Elige canal, tipo de pieza y escribe el tema puntual.
3. El sistema envía el perfil de marca más estos datos al modelo de IA.
4. El sistema muestra 2 o 3 opciones de texto generado.
5. El usuario elige una, la edita si quiere, y decide guardarla como borrador o aprobarla directamente.

**Flujo 3: Programar contenido en el calendario**
1. El usuario abre una pieza guardada como borrador o aprobada.
2. Asigna una fecha programada.
3. El sistema la ubica en la vista de calendario según esa fecha.
4. El usuario revisa el calendario completo y detecta días sin contenido asignado.

**Flujo 4: Actualizar el perfil de marca**
1. El usuario entra a su perfil existente.
2. Modifica algún campo, por ejemplo el tono o las palabras clave.
3. Guarda los cambios.
4. Las próximas generaciones usan el perfil actualizado. Las piezas anteriores no cambian.

---

## 🧱 Stack técnico

**Frontend:** React.

**Backend:** Python, sin framework de ORM. Consultas directas usando el cliente oficial de Supabase para Python (supabase-py).

**Base de datos:** Supabase (Postgres administrado). Dos tablas principales:
- `perfil_marca`: datos fijos de voz de marca por negocio.
- `piezas_contenido`: cada pieza generada, con canal, tipo, tema, texto, fecha programada y estado.

Tabla `canales` queda fuera del alcance inicial, opcional para una fase futura si se necesita guardar reglas propias por canal (límite de caracteres, formato, horario ideal).

**Generación de IA:** API de Groq, con capa gratuita, usando modelos abiertos disponibles ahí (por ejemplo variantes de Llama). Confirmar en la documentación oficial de Groq los límites y modelos vigentes antes de integrar, porque cambian con el tiempo.

**Herramientas de desarrollo:** Claude Code para construir la lógica y el código del proyecto. Claude Design para el prototipo visual de la interfaz antes o en paralelo a la construcción funcional.

**Datos de prueba:** script de seed en Python que inserta un perfil de marca de ejemplo y piezas de contenido asociadas, usando el mismo cliente de Supabase.

---

## Prompt del generador de contenido

Este es el prompt base que el backend envía al modelo de IA cada vez que el usuario pide contenido nuevo. Se construye combinando los campos del perfil de marca con los datos puntuales de la pieza solicitada.

```
Eres un redactor de contenido para redes sociales de la marca "{nombre_negocio}".

Datos de la marca:
- Qué vende: {que_vende}
- Tono de voz: {tono}
- Público objetivo: {publico_objetivo}
- Palabras clave que definen la marca: {palabras_clave}
- Está prohibido: {prohibido}

Ejemplo de un texto que sí representa la marca:
"{ejemplo_bueno}"

Ejemplo de un texto que NO representa la marca:
"{ejemplo_malo}"

Ahora genera contenido para:
- Canal: {canal}
- Tipo de pieza: {tipo}
- Tema: {tema}

Reglas:
- Usa el tono definido arriba en todo momento.
- Respeta las palabras y frases prohibidas.
- Adapta la extensión y el estilo al canal indicado (Instagram corto y directo, WhatsApp cercano y personal, blog más extenso, Facebook informativo).
- No inventes datos del negocio que no estén en el perfil.
- Genera 3 versiones distintas del texto, cada una con un enfoque distinto (informativo, emocional, con llamado a la acción directo).
```

---

## 🚫 Fuera de alcance

- Publicación automática o programada directa en redes sociales. El sistema genera y organiza contenido, no lo publica por sí mismo en esta versión.
- Generación de imágenes o video. Solo texto (copies).
- Múltiples usuarios o roles dentro de un mismo negocio. Un perfil de marca corresponde a un solo usuario administrador.
- Analítica de desempeño de las publicaciones (alcance, interacciones, conversiones).
- Traducción automática a otros idiomas.
- Tabla de canales con reglas propias por canal. Queda como mejora futura opcional.
- Edición colaborativa o comentarios entre varios miembros del equipo sobre una pieza.
- Integración con calendarios externos (Google Calendar, Outlook).
