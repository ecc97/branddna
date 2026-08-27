/*
  Pantalla de inicio: el "arriba" de la marca.

  Antes la app no tenía este nivel. El selector de marca era una puerta que se
  cruzaba una vez y quedaba inalcanzable, así que no había forma de cambiar de
  marca ni de crear otra sin pasar por dentro de una.

  Se monta en dos sitios:
  - **Sin marca activa** (`state === 'choosing'`): suelta, sin barra de
    navegación, porque todavía no hay adónde navegar.
  - **Con marca activa**, en la ruta `/`, dentro de la app. Se llega pulsando
    el nombre de la marca en la cabecera.

  La lista sale de lo que este navegador recuerda, no del servidor. Eso la
  mantiene del tamaño correcto —una o tres marcas— por muy grande que se haga
  la base de datos, y evita revelar a nadie qué negocios usan la app.
*/

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { useProfile } from '../profile/profile-context';
import s from './HomePage.module.css';

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué es BrandDNA?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BrandDNA es un generador de contenido con voz de marca para pymes sin equipo de marketing. Define tu tono, público y palabras clave una sola vez y genera copies para Instagram, WhatsApp, Facebook o blog en segundos, siempre con el mismo tono.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo mantiene la voz de marca consistente?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cada generación usa tu perfil de marca —nombre, qué vendes, tono, público, palabras clave, prohibiciones y ejemplos— como contexto fijo del prompt. Además revisa de forma determinista que no aparezcan palabras prohibidas y resalta cualquier violación dentro del texto.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Para quién está pensado?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Para dueños de pymes y encargados de redes que hacen de todo y no tienen tiempo ni formación en marketing. Una sola persona puede generar y organizar contenido sin reescribir el contexto cada vez.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué pasa después de generar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Eliges una de las 3 opciones generadas, la guardas como borrador o aprobada y la programas en un calendario mensual/semanal. Las piezas sin fecha quedan en la bandeja “Sin programar” hasta que les asignes día. Editar el perfil no reescribe lo ya guardado.',
      },
    },
  ],
};

export function HomePage() {
  const { knownBrands, activeProfile, enterBrand, enterWithCode, forgetBrand } =
    useProfile();
  const navigate = useNavigate();

  const [askingCode, setAskingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasBrands = knownBrands.length > 0;

  async function enter(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const failure = await action();
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    // Entró: lo natural es empezar a generar, no quedarse en el inicio.
    navigate('/generar');
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    if (!codeDraft.trim()) return;
    await enter(() => enterWithCode(codeDraft));
  }

  return (
    <>
      <title>BrandDNA — Generador de contenido con voz de marca para pymes</title>
      <meta
        name="description"
        content="Define la voz de tu marca una vez y genera copies para Instagram, WhatsApp y Facebook con el mismo tono en segundos. Para pymes sin equipo de marketing."
      />
      <meta name='keywords' content='marca, contenido, generar, voz de marca, pymes, instagram, whatsapp, facebook, branddna' />
      <link rel="canonical" href="https://www.branddna.lat/" />
      <meta property="og:title" content="BrandDNA — Generador de contenido con voz de marca para pymes" />
      <meta property="og:url" content="https://www.branddna.lat/" />
      <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>

      <div className={hasBrands ? s.inner : `${s.inner} ${s.intro}`}>
        <div className={s.eyebrow}>BrandDNA</div>

        {hasBrands ? (
          <>
            <h1 className={s.titulo}>Tus marcas</h1>
            <p className={s.lead}>
              BrandDNA es un generador de contenido con voz de marca para pymes: defines tu voz una
              vez y generas copies consistentes para redes en segundos. Elige con cuál trabajar.
            </p>

            <div className={s.lista}>
              {knownBrands.map((brand) => {
                const isActive = brand.id === activeProfile?.id;
                return (
                  <button
                    key={brand.id}
                    type="button"
                    className={isActive ? s.marcaActiva : s.marca}
                    disabled={busy}
                    onClick={() => void enter(() => enterBrand(brand.id))}
                  >
                    <span className={s.nombre}>
                      {/* El nombre puede venir vacío si la marca se migró del
                        formato anterior y aún no se ha entrado en ella. */}
                      {brand.name || 'Marca sin nombre'}
                    </span>
                    {isActive && <span className={s.insignia}>Activa</span>}
                    <span className={s.flecha} aria-hidden="true">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h1 className={s.titulo}>Generador de contenido con voz de marca para pymes</h1>
            <p className={s.lead}>
              BrandDNA es un generador de contenido con voz de marca para pymes sin equipo de
              marketing. Defines cómo habla tu negocio una sola vez —tono, público, palabras propias
              y prohibiciones— y a partir de ahí generas copies para Instagram, WhatsApp, Facebook o
              blog en segundos, siempre con el mismo tono, y los organizas en un calendario.
            </p>
          </>
        )}

        <div className={s.acciones}>
          <button
            type="button"
            className={s.crear}
            onClick={() => navigate('/marca/nueva')}
          >
            {hasBrands ? 'Crear otra marca' : 'Crear mi primera marca'}
          </button>

          {!askingCode && (
            <button
              type="button"
              className={s.secundario}
              onClick={() => {
                setAskingCode(true);
                setCodeDraft('');
                setError(null);
              }}
            >
              {hasBrands
                ? 'Entrar en otra marca con su código'
                : '¿Ya tienes una marca? Entrar con su código'}
            </button>
          )}

          {askingCode && (
            <form className={s.formularioCodigo} onSubmit={submitCode}>
              <label className={s.etiquetaCodigo} htmlFor="codigo-acceso">
                Código de acceso
              </label>
              <p className={s.pistaCodigo}>
                Es la cadena que te dimos al crear la marca. Está en el archivo que
                descargaste, y también puedes verla desde «Mi marca» en un navegador donde
                ya hayas entrado.
              </p>
              <textarea
                id="codigo-acceso"
                className={s.campoCodigo}
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                placeholder="093ab784-8c8a-4b2c-9a39-fb490fbe8cf0.bDx7_Kq2..."
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              <div className={s.accionesCodigo}>
                <button
                  type="submit"
                  className={s.entrar}
                  disabled={busy || !codeDraft.trim()}
                >
                  {busy ? 'Comprobando…' : 'Entrar'}
                </button>
                <button
                  type="button"
                  className={s.cancelar}
                  onClick={() => setAskingCode(false)}
                  disabled={busy}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {error && (
          <div className={s.error} role="alert">
            {error}
          </div>
        )}

        {hasBrands && (
          <p className={s.nota}>
            Estas son las marcas que recuerda <strong>este navegador</strong>. Para entrar
            desde otro dispositivo necesitas su código de acceso.
            {knownBrands.length > 0 && (
              <>
                {' '}
                Si este equipo no es tuyo, puedes{' '}
                <button
                  type="button"
                  className={s.olvidar}
                  onClick={() => knownBrands.forEach((brand) => forgetBrand(brand.id))}
                >
                  olvidarlas todas aquí
                </button>
                . No se borra nada del servidor.
              </>
            )}
          </p>
        )}

        {!hasBrands && (
          <section aria-labelledby="faq-titulo" style={{ marginTop: '3rem', textAlign: 'left' }}>
            <h2 id="faq-titulo" className={s.titulo} style={{ fontSize: '1.5rem' }}>
              Preguntas frecuentes
            </h2>
            <dl>
              <dt style={{ fontWeight: 700, marginTop: '1rem' }}>¿Qué es BrandDNA?</dt>
              <dd style={{ margin: 0, opacity: 0.85 }}>
                BrandDNA es un generador de contenido con voz de marca para pymes sin equipo de
                marketing. Defines tu tono, público y palabras clave una sola vez y generas copies para
                Instagram, WhatsApp, Facebook o blog en segundos, siempre con el mismo tono.
              </dd>
              <dt style={{ fontWeight: 700, marginTop: '1rem' }}>¿Cómo mantiene la voz consistente?</dt>
              <dd style={{ margin: 0, opacity: 0.85 }}>
                Cada generación usa tu perfil de marca —nombre, qué vendes, tono, público, palabras clave,
                prohibiciones y ejemplos— como contexto fijo del prompt y revisa de forma determinista que
                no aparezcan palabras prohibidas.
              </dd>
              <dt style={{ fontWeight: 700, marginTop: '1rem' }}>¿Para quién está pensado?</dt>
              <dd style={{ margin: 0, opacity: 0.85 }}>
                Para dueños de pymes y encargados de redes que hacen de todo y no tienen tiempo ni
                formación en marketing. Una sola persona genera y organiza contenido sin reescribir el
                contexto cada vez.
              </dd>
              <dt style={{ fontWeight: 700, marginTop: '1rem' }}>¿Qué pasa después de generar?</dt>
              <dd style={{ margin: 0, opacity: 0.85 }}>
                Eliges una de las 3 opciones, la guardas como borrador o aprobada y la programas en el
                calendario. Las piezas sin fecha quedan en “Sin programar”. Editar el perfil no reescribe lo
                ya guardado.
              </dd>
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
