/*
  Pantalla del perfil de marca (Flujos 1 y 4 del PRD).

  Sirve para crear y para editar. Cuál de las dos lo decide `creating`, que
  llega por props desde la ruta (`/marca/nueva` frente a `/marca`) en vez de ser
  estado interno: así el modo está en la URL, se puede enlazar, y no hay una
  máquina de estados que sincronizar dentro del componente.

  El selector de marca que había aquí se fue a la pantalla de inicio. Estaba mal
  colocado por dos motivos: listaba marcas ajenas, y ponía una decisión de
  "¿en qué marca estoy?" dentro de una pantalla que edita *esta* marca.

  Regla dura del PRD que se respeta por construcción: editar el perfil NO
  reescribe las piezas ya guardadas. Aquí no hay ninguna llamada que escriba en
  `/pieces`; no puede pasar por accidente.
*/

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import {
  createProfile,
  deleteProfile,
  errorMessage,
  listPieces,
  rotateToken,
  updateProfile,
  type BrandProfile,
} from '../api';
import { DeleteBrand } from '../components/DeleteBrand';
import { TagInput } from '../components/TagInput';
import { TextArea, TextInput } from '../components/TextInput';
import { KeySettings, NewKeyPanel } from '../components/TokenPanel';
import { ToneSelector } from '../components/ToneSelector';
import { Toast, type Notice } from '../components/Toast';
import { buildAccessCode } from '../lib/access-code';
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

export function BrandPage({ creating = false }: { creating?: boolean }) {
  const { activeProfile, activeCode, knownBrands, registerProfile, forgetBrand } =
    useProfile();
  const navigate = useNavigate();

  const [form, setForm] = useState<BrandForm>(() =>
    creating || !activeProfile ? EMPTY_FORM : fromProfile(activeProfile)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BrandForm, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Código recién emitido. Solo se ve una vez, justo al crear la marca. */
  const [newCode, setNewCode] = useState<string | null>(null);
  /** Cuántas piezas se perderían al borrar. `null` mientras se cuentan. */
  const [pieceCount, setPieceCount] = useState<number | null>(null);

  /*
    Al cambiar de marca activa el formulario pasa a mostrar la nueva. Se observa
    el id y no el objeto: guardar cambios en la MISMA marca devuelve un objeto
    distinto, y eso no debe descartar lo que se escribió.
  */
  const activeId = activeProfile?.id;
  useEffect(() => {
    if (!creating && activeProfile) setForm(fromProfile(activeProfile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, creating]);

  // Para poder decir "y sus 7 piezas" en vez de "y todo tu contenido".
  useEffect(() => {
    if (creating || !activeId) return;
    const controller = new AbortController();
    listPieces(activeId, controller.signal)
      .then((pieces) => setPieceCount(pieces.length))
      .catch(() => setPieceCount(null));
    return () => controller.abort();
  }, [activeId, creating]);

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
      if (creating) {
        const created = await createProfile(payload);
        registerProfile(created, created.access_token);
        setForm(fromProfile(created));
        // No se navega: primero hay que enseñar el código, porque es la única
        // vez que existe en claro.
        setNewCode(buildAccessCode(created.id, created.access_token));
      } else {
        const saved = await updateProfile(activeProfile!.id, payload);
        registerProfile(saved);
        setForm(fromProfile(saved));
        setNotice({ message: 'Voz actualizada. Se aplica al contenido nuevo.' });
      }
    } catch (failure) {
      setFormError(errorMessage(failure, 'No se pudo guardar el perfil.'));
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
      return errorMessage(failure, 'No se pudo rotar el código.');
    }
  }

  async function handleDelete(): Promise<string | null> {
    if (!activeProfile) return 'No hay marca activa.';
    try {
      await deleteProfile(activeProfile.id);
      // Olvidarla también aquí: si no, el navegador seguiría ofreciendo una
      // marca que ya no existe y fallaría al entrar.
      forgetBrand(activeProfile.id);
      navigate('/');
      return null;
    } catch (failure) {
      return errorMessage(failure, 'No se pudo eliminar la marca.');
    }
  }

  const isFirstEver = knownBrands.length === 0;

  return (
    <>
      <header className={s.cabecera}>
        <div className={s.eyebrow}>{creating ? 'Nueva marca' : 'Perfil de marca'}</div>
        <h1 className={s.titulo}>
          {creating ? 'Define su voz.' : 'Tu voz, una sola vez.'}
        </h1>
        <p className={s.lead}>
          {creating
            ? isFirstEver
              ? 'Ocho respuestas cortas. Después la app escribe como escribes tú.'
              : 'Cada marca tiene su propia voz, sus palabras y sus prohibiciones.'
            : 'Los cambios se aplican al contenido nuevo. Lo que ya guardaste no se toca.'}
        </p>
      </header>

      {newCode && activeProfile && (
        <div className={s.llaveNueva}>
          <NewKeyPanel businessName={activeProfile.business_name} code={newCode} />
          <button
            type="button"
            className={s.continuar}
            onClick={() => {
              setNewCode(null);
              navigate('/generar');
            }}
          >
            Ya lo guardé, vamos a generar
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
            {saving ? 'Guardando…' : creating ? 'Crear marca' : 'Guardar cambios'}
          </button>
          {creating && (
            <button
              type="button"
              className={s.cancelar}
              onClick={() => navigate('/')}
              disabled={saving}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {!creating && activeProfile && (
        <>
          <div className={s.seccionLlave}>
            <KeySettings
              businessName={activeProfile.business_name}
              code={activeCode}
              onRotate={handleRotate}
            />
          </div>

          <div className={s.seccionBorrado}>
            <DeleteBrand
              businessName={activeProfile.business_name}
              pieceCount={pieceCount}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
