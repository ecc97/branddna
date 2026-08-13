/*
  Elegir marca al arrancar.

  Existe porque no hay autenticación: la base puede contener varias marcas y la
  app no tiene forma de deducir cuál corresponde.

  Desde que cada marca tiene llave hay dos casos, y la diferencia se ve:
  - Las marcas cuya llave recuerda este navegador se abren de un toque.
  - Las demás piden la llave. Es el flujo de "entrar desde otro dispositivo".

  El listado que se muestra es el público (`GET /profiles`), que solo trae id y
  nombre. Ver el nombre de una marca no da acceso a nada.
*/

import { useState, type FormEvent } from 'react';

import { useProfile } from '../profile/profile-context';
import s from './ProfilePicker.module.css';

export function ProfilePicker() {
  const { profiles, hasKeyFor, selectProfile } = useProfile();

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enter(id: string, token?: string) {
    setBusy(true);
    setError(null);
    const failure = await selectProfile(id, token);
    setBusy(false);
    // Si entró, este componente se desmonta: no hay que limpiar nada.
    if (failure) setError(failure);
  }

  function choose(id: string) {
    if (hasKeyFor(id)) {
      void enter(id);
      return;
    }
    setPendingId(id);
    setKeyDraft('');
    setError(null);
  }

  async function submitKey(event: FormEvent) {
    event.preventDefault();
    if (!pendingId || !keyDraft.trim()) return;
    await enter(pendingId, keyDraft.trim());
  }

  return (
    <div className={s.pantalla}>
      <div className={s.caja}>
        <div className={s.eyebrow}>Bienvenido</div>
        <h1 className={s.titulo}>¿Con qué marca trabajamos?</h1>
        <p className={s.lead}>
          Elige una. Si este navegador no recuerda su llave, te la pedirá.
        </p>

        <div className={s.lista}>
          {profiles.map((profile) => {
            const known = hasKeyFor(profile.id);
            const asking = pendingId === profile.id;

            return (
              <div key={profile.id}>
                <button
                  type="button"
                  className={s.opcion}
                  onClick={() => choose(profile.id)}
                  disabled={busy}
                >
                  <span className={s.nombre}>{profile.business_name}</span>
                  <span className={known ? s.detalleListo : s.detalle}>
                    {known ? 'Llave guardada · entrar' : 'Necesita su llave de acceso'}
                  </span>
                </button>

                {asking && (
                  <form className={s.formularioLlave} onSubmit={submitKey}>
                    <label className={s.etiquetaLlave} htmlFor={`llave-${profile.id}`}>
                      Pega la llave de «{profile.business_name}»
                    </label>
                    <input
                      id={`llave-${profile.id}`}
                      className={s.campoLlave}
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      placeholder="La recibiste al crear la marca"
                      autoComplete="off"
                      autoFocus
                    />
                    <div className={s.accionesLlave}>
                      <button
                        type="submit"
                        className={s.entrar}
                        disabled={busy || !keyDraft.trim()}
                      >
                        {busy ? 'Comprobando…' : 'Entrar'}
                      </button>
                      <button
                        type="button"
                        className={s.cancelarLlave}
                        onClick={() => setPendingId(null)}
                        disabled={busy}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className={s.error} role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
