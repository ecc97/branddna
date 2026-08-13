/*
  Pantalla del perfil de marca (Flujos 1 y 4 del PRD).

  Cubre tres situaciones con el mismo formulario:
  - **Alta inicial**: no hay ninguna marca todavía.
  - **Edición**: modificar la marca activa.
  - **Marca nueva**: crear otra cuando ya existe alguna.

  Las tres se reducen a una sola pregunta —¿esto crea o actualiza?— resuelta
  por `isCreating`. Mantener tres ramas separadas es justo donde aparecen los
  bugs de "guardé y se sobrescribió lo que no tocaba".

  Regla dura del PRD que se respeta por construcción: editar el perfil NO
  reescribe las piezas ya guardadas. En este archivo no hay ninguna llamada
  que toque `/pieces`; no puede pasar por accidente.
*/

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import {
  ApiError,
  createProfile,
  rotateToken,
  updateProfile,
  type BrandProfile,
} from '../api';
import { TagInput } from '../components/TagInput';
import { TextArea, TextInput } from '../components/TextInput';
import { KeySettings, NewKeyPanel } from '../components/TokenPanel';
import { ToneSelector } from '../components/ToneSelector';
import { Toast, type Notice } from '../components/Toast';
import { useProfile } from '../profile/profile-context';
import s from './BrandPage.module.css';

interface BrandForm {
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

const EMPTY_FORM: BrandForm = {
  business_name: '',
  what_they_sell: '',
  tone: '',
  target_audience: '',
  keywords: [],
  forbidden: '',
  good_example: '',
  bad_example: '',
};

function fromProfile(profile: BrandProfile): BrandForm {
  return {
    business_name: profile.business_name,
    what_they_sell: profile.what_they_sell,
    tone: profile.tone,
    target_audience: profile.target_audience,
    keywords: profile.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    forbidden: profile.forbidden,
    good_example: profile.good_example,
    bad_example: profile.bad_example,
  };
}

const REQUIRED_FIELDS: { field: keyof BrandForm; notice: string }[] = [
  { field: 'business_name', notice: 'Escribe el nombre del negocio.' },
  { field: 'what_they_sell', notice: 'Cuenta qué vendes.' },
  { field: 'tone', notice: 'Elige o describe el tono.' },
  { field: 'target_audience', notice: 'Di a quién le hablas.' },
];

export function BrandPage() {
  const { activeProfile, activeToken, profiles, registerProfile, selectProfile } =
    useProfile();
  const navigate = useNavigate();

  /** 'nueva' es una marca adicional; el alta inicial no necesita modo. */
  const [mode, setMode] = useState<'editar' | 'nueva'>('editar');
  const isCreating = activeProfile === null || mode === 'nueva';
  const isFirstEver = activeProfile === null;

  const [form, setForm] = useState<BrandForm>(() =>
    activeProfile ? fromProfile(activeProfile) : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BrandForm, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Llave recién emitida. Solo se ve una vez, justo al crear la marca. */
  const [newKey, setNewKey] = useState<string | null>(null);

  /*
    Al cambiar de marca activa, el formulario pasa a mostrar la nueva.
    Se observa el id y no el objeto: guardar cambios en la MISMA marca
    devuelve un objeto distinto, y eso no debe descartar lo que se escribió.
  */
  const activeId = activeProfile?.id;
  useEffect(() => {
    if (activeProfile && mode === 'editar') setForm(fromProfile(activeProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function updateField<C extends keyof BrandForm>(field: C, value: BrandForm[C]) {
    setForm((current) => ({ ...current, [field]: value }));
    // El error de un campo desaparece en cuanto el usuario lo toca: mantenerlo
    // mientras escribe la corrección resulta acusador y molesto.
    setErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;
      const next = { ...currentErrors };
      delete next[field];
      return next;
    });
  }

  function startNewBrand() {
    setMode('nueva');
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setNewKey(null);
  }

  function cancelNewBrand() {
    setMode('editar');
    setForm(activeProfile ? fromProfile(activeProfile) : EMPTY_FORM);
    setErrors({});
    setFormError(null);
  }

  function validate(): boolean {
    const found: Partial<Record<keyof BrandForm, string>> = {};
    for (const { field, notice: message } of REQUIRED_FIELDS) {
      if (!String(form[field]).trim()) found[field] = message;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const payload = {
      business_name: form.business_name.trim(),
      what_they_sell: form.what_they_sell.trim(),
      tone: form.tone.trim(),
      target_audience: form.target_audience.trim(),
      keywords: form.keywords.join(', '),
      forbidden: form.forbidden.trim(),
      good_example: form.good_example.trim(),
      bad_example: form.bad_example.trim(),
    };

    setSaving(true);
    try {
      if (isCreating) {
        const created = await createProfile(payload);
        // La llave viaja solo en esta respuesta: se entrega al provider para
        // que la recuerde, y se muestra una vez en pantalla.
        registerProfile(created, created.access_token);
        setForm(fromProfile(created));
        setMode('editar');
        setNewKey(created.access_token);
        // Antes se navegaba a /generar al crear la primera marca. Ya no:
        // primero hay que enseñar la llave, porque es la única vez que se ve.
      } else {
        const saved = await updateProfile(activeProfile!.id, payload);
        registerProfile(saved);
        setForm(fromProfile(saved));
        setNotice({ message: 'Voz actualizada. Se aplica al contenido nuevo.' });
      }
    } catch (failure) {
      setFormError(
        failure instanceof ApiError ? failure.message : 'No se pudo guardar el perfil.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRotate(): Promise<string | null> {
    if (!activeProfile) return 'No hay marca activa.';
    try {
      const { access_token } = await rotateToken(activeProfile.id);
      registerProfile(activeProfile, access_token);
      return null;
    } catch (failure) {
      return failure instanceof ApiError ? failure.message : 'No se pudo rotar la llave.';
    }
  }

  async function switchBrand(id: string) {
    const failure = await selectProfile(id);
    if (failure) setFormError(failure);
  }

  return (
    <>
      <header className={s.cabecera}>
        <div className={s.eyebrow}>{isCreating ? 'Nueva marca' : 'Perfil de marca'}</div>
        <h1 className={s.titulo}>
          {isCreating ? 'Define su voz.' : 'Tu voz, una sola vez.'}
        </h1>
        <p className={s.lead}>
          {isFirstEver
            ? 'Ocho respuestas cortas. Después la app escribe como escribes tú.'
            : isCreating
              ? 'Cada marca tiene su propia voz, sus palabras y sus prohibiciones.'
              : 'Los cambios se aplican al contenido nuevo. Lo que ya guardaste no se toca.'}
        </p>

        {/* Sin autenticación pueden convivir varias marcas en la misma base.
            Sin esto, la app se quedaría atada a la primera. */}
        {!isCreating && activeProfile && (
          <div className={s.selector}>
            {profiles.length > 1 && (
              <>
                <label htmlFor="cambiar-marca">Marca activa:</label>
                <select
                  id="cambiar-marca"
                  className={s.select}
                  value={activeProfile.id}
                  onChange={(e) => void switchBrand(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.business_name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button type="button" className={s.enlace} onClick={startNewBrand}>
              + Nueva marca
            </button>
          </div>
        )}
      </header>

      {newKey && activeProfile && (
        <div className={s.llaveNueva}>
          <NewKeyPanel businessName={activeProfile.business_name} token={newKey} />
          <button
            type="button"
            className={s.continuar}
            onClick={() => {
              setNewKey(null);
              navigate('/generar');
            }}
          >
            Ya la guardé, vamos a generar
          </button>
        </div>
      )}

      <form className={s.formulario} onSubmit={submit} noValidate>
        <TextInput
          label="Nombre del negocio"
          required
          value={form.business_name}
          error={errors.business_name}
          onChange={(e) => updateField('business_name', e.target.value)}
          placeholder="Panadería La Espiga"
        />

        <TextArea
          label="¿Qué vendes?"
          required
          rows={2}
          value={form.what_they_sell}
          error={errors.what_they_sell}
          onChange={(e) => updateField('what_they_sell', e.target.value)}
          placeholder="Pan de masa madre y postres caseros"
          hint="Ej.: «Pan de masa madre, horneado cada mañana»"
        />

        <ToneSelector
          value={form.tone}
          error={errors.tone}
          onChange={(value) => updateField('tone', value)}
        />

        <TextInput
          label="¿A quién le hablas?"
          required
          value={form.target_audience}
          error={errors.target_audience}
          onChange={(e) => updateField('target_audience', e.target.value)}
          placeholder="Vecinos del barrio, 30 a 60 años"
        />

        <TagInput
          label="Palabras que te representan"
          value={form.keywords}
          onChange={(value) => updateField('keywords', value)}
          placeholder="Escribe una y pulsa Enter"
          hint="Aparecen en los textos generados. Escribe las tuyas: son las que hacen única a tu marca."
        />

        <TextInput
          label="Nunca digas"
          value={form.forbidden}
          onChange={(e) => updateField('forbidden', e.target.value)}
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
              labelHidden
              rows={2}
              value={form.good_example}
              onChange={(e) => updateField('good_example', e.target.value)}
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
              labelHidden
              rows={2}
              value={form.bad_example}
              onChange={(e) => updateField('bad_example', e.target.value)}
              placeholder="«¡¡PROMO IMPERDIBLE!! ¡Corre ya!!!»"
            />
          </div>
        </div>

        {formError && (
          <div className={s.errorGeneral} role="alert">
            {formError}
          </div>
        )}

        <div className={s.acciones}>
          <button className={s.guardar} type="submit" disabled={saving}>
            {saving
              ? 'Guardando…'
              : isFirstEver
                ? 'Guardar mi voz'
                : isCreating
                  ? 'Crear marca'
                  : 'Guardar cambios'}
          </button>
          {mode === 'nueva' && (
            <button
              type="button"
              className={s.cancelar}
              onClick={cancelNewBrand}
              disabled={saving}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {!isCreating && activeProfile && (
        <div className={s.seccionLlave}>
          <KeySettings
            businessName={activeProfile.business_name}
            token={activeToken}
            onRotate={handleRotate}
          />
        </div>
      )}

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
