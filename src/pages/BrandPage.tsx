/*
  Pantalla del perfil de marca (Flujos 1 y 4 del PRD).

  Sirve para dos situaciones con la misma forma:
  - Primera vez, sin ningún perfil: crea el primero y entra a la app.
  - Edición: modifica el existente.

  Regla dura del PRD que conviene tener presente al leer esto: editar el perfil
  NO reescribe las piezas ya guardadas. El perfil es contexto para generar
  contenido nuevo, no una plantilla que se reaplique a lo aprobado. Por eso
  aquí no hay ninguna llamada que toque `/pieces`.
*/

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { ApiError, actualizarPerfil, crearPerfil, type BrandProfile } from '../api';
import { TagInput } from '../components/TagInput';
import { TextArea, TextInput } from '../components/TextInput';
import { ToneSelector } from '../components/ToneSelector';
import { Toast, type Aviso } from '../components/Toast';
import { useProfile } from '../profile/profile-context';
import s from './BrandPage.module.css';

interface Formulario {
  business_name: string;
  what_they_sell: string;
  tone: string;
  target_audience: string;
  /** En el formulario es una lista; al backend viaja como texto con comas. */
  keywords: string[];
  forbidden: string;
  good_example: string;
  bad_example: string;
}

const VACIO: Formulario = {
  business_name: '',
  what_they_sell: '',
  tone: '',
  target_audience: '',
  keywords: [],
  forbidden: '',
  good_example: '',
  bad_example: '',
};

function desdePerfil(perfil: BrandProfile): Formulario {
  return {
    business_name: perfil.business_name,
    what_they_sell: perfil.what_they_sell,
    tone: perfil.tone,
    target_audience: perfil.target_audience,
    keywords: perfil.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    forbidden: perfil.forbidden,
    good_example: perfil.good_example,
    bad_example: perfil.bad_example,
  };
}

const OBLIGATORIOS: { campo: keyof Formulario; aviso: string }[] = [
  { campo: 'business_name', aviso: 'Escribe el nombre del negocio.' },
  { campo: 'what_they_sell', aviso: 'Cuenta qué vendes.' },
  { campo: 'tone', aviso: 'Elige o describe el tono.' },
  { campo: 'target_audience', aviso: 'Di a quién le hablas.' },
];

export function BrandPage() {
  const { perfilActivo, perfiles, registrarPerfil, seleccionar } = useProfile();
  const navegar = useNavigate();

  const esPrimeraVez = perfilActivo === null;

  const [datos, setDatos] = useState<Formulario>(() =>
    perfilActivo ? desdePerfil(perfilActivo) : VACIO
  );
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function cambiar<C extends keyof Formulario>(campo: C, valor: Formulario[C]) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    // El error de un campo desaparece en cuanto el usuario lo toca: mantenerlo
    // mientras escribe la corrección resulta acusador y molesto.
    setErrores((actuales) => {
      if (!actuales[campo]) return actuales;
      const siguiente = { ...actuales };
      delete siguiente[campo];
      return siguiente;
    });
  }

  function validar(): boolean {
    const encontrados: Partial<Record<keyof Formulario, string>> = {};
    for (const { campo, aviso: mensaje } of OBLIGATORIOS) {
      if (!String(datos[campo]).trim()) encontrados[campo] = mensaje;
    }
    setErrores(encontrados);
    return Object.keys(encontrados).length === 0;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);
    if (!validar()) return;

    const cuerpo = {
      business_name: datos.business_name.trim(),
      what_they_sell: datos.what_they_sell.trim(),
      tone: datos.tone.trim(),
      target_audience: datos.target_audience.trim(),
      keywords: datos.keywords.join(', '),
      forbidden: datos.forbidden.trim(),
      good_example: datos.good_example.trim(),
      bad_example: datos.bad_example.trim(),
    };

    setGuardando(true);
    try {
      const guardado = perfilActivo
        ? await actualizarPerfil(perfilActivo.id, cuerpo)
        : await crearPerfil(cuerpo);

      registrarPerfil(guardado);
      setDatos(desdePerfil(guardado));

      if (esPrimeraVez) {
        // Recién creado: lo natural es llevarle a generar su primer contenido.
        navegar('/generar');
      } else {
        setAviso({ mensaje: 'Voz actualizada. Se aplica al contenido nuevo.' });
      }
    } catch (fallo) {
      setErrorGeneral(
        fallo instanceof ApiError ? fallo.message : 'No se pudo guardar el perfil.'
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <header className={s.cabecera}>
        <div className={s.eyebrow}>Perfil de marca</div>
        <h1 className={s.titulo}>Tu voz, una sola vez.</h1>
        <p className={s.lead}>
          {esPrimeraVez
            ? 'Ocho respuestas cortas. Después la app escribe como escribes tú.'
            : 'Los cambios se aplican al contenido nuevo. Lo que ya guardaste no se toca.'}
        </p>

        {/* Sin autenticación pueden convivir varias marcas en la misma base.
            Sin este selector, la app se quedaría atada a la primera. */}
        {perfiles.length > 1 && perfilActivo && (
          <div className={s.selector}>
            <label htmlFor="cambiar-marca">Marca activa:</label>
            <select
              id="cambiar-marca"
              className={s.select}
              value={perfilActivo.id}
              onChange={(e) => {
                seleccionar(e.target.value);
                const elegido = perfiles.find((p) => p.id === e.target.value);
                if (elegido) setDatos(desdePerfil(elegido));
              }}
            >
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <form className={s.formulario} onSubmit={enviar} noValidate>
        <TextInput
          label="Nombre del negocio"
          required
          value={datos.business_name}
          error={errores.business_name}
          onChange={(e) => cambiar('business_name', e.target.value)}
          placeholder="Panadería La Espiga"
        />

        <TextArea
          label="¿Qué vendes?"
          required
          rows={2}
          value={datos.what_they_sell}
          error={errores.what_they_sell}
          onChange={(e) => cambiar('what_they_sell', e.target.value)}
          placeholder="Pan de masa madre y postres caseros"
          hint="Ej.: «Pan de masa madre, horneado cada mañana»"
        />

        <ToneSelector
          value={datos.tone}
          error={errores.tone}
          onChange={(valor) => cambiar('tone', valor)}
        />

        <TextInput
          label="¿A quién le hablas?"
          required
          value={datos.target_audience}
          error={errores.target_audience}
          onChange={(e) => cambiar('target_audience', e.target.value)}
          placeholder="Vecinos del barrio, 30 a 60 años"
        />

        <TagInput
          label="Palabras que te representan"
          value={datos.keywords}
          onChange={(valor) => cambiar('keywords', valor)}
          placeholder="Escribe una y pulsa Enter"
          hint="Aparecen en los textos generados. Escribe las tuyas: son las que hacen única a tu marca."
        />

        <TextInput
          label="Nunca digas"
          value={datos.forbidden}
          onChange={(e) => cambiar('forbidden', e.target.value)}
          placeholder="no usar la palabra gourmet, ni premium"
          hint="Esto no es solo una sugerencia al modelo: la app revisa cada texto generado y avisa si alguna de estas palabras se cuela."
        />

        <div className={s.ejemplos}>
          <div className={s.ejemplosTitulo}>Enséñale con dos ejemplos</div>

          <div>
            <div className={s.ejemploBueno}>
              <span className={s.punto} style={{ background: 'var(--ok)' }} />
              Así sí me gusta
            </div>
            <TextArea
              label="Ejemplo que sí suena a tu marca"
              labelOculta
              rows={2}
              value={datos.good_example}
              onChange={(e) => cambiar('good_example', e.target.value)}
              placeholder="«Recién salido del horno. Pasa antes de que se acabe.»"
            />
          </div>

          <div>
            <div className={s.ejemploMalo}>
              <span className={s.punto} style={{ background: 'var(--warn)' }} />
              Así no
            </div>
            <TextArea
              label="Ejemplo que NO suena a tu marca"
              labelOculta
              rows={2}
              value={datos.bad_example}
              onChange={(e) => cambiar('bad_example', e.target.value)}
              placeholder="«¡¡PROMO IMPERDIBLE!! ¡Corre ya!!!»"
            />
          </div>
        </div>

        {errorGeneral && (
          <div className={s.errorGeneral} role="alert">
            {errorGeneral}
          </div>
        )}

        <button className={s.guardar} type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : esPrimeraVez ? 'Guardar mi voz' : 'Guardar cambios'}
        </button>
      </form>

      <Toast aviso={aviso} onCerrar={() => setAviso(null)} />
    </>
  );
}
