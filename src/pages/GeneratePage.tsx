/*
  Generador de contenido (Flujo 2 del PRD).

  Dos ideas gobiernan esta pantalla:

  1. **Generar no guarda.** Se piden 3 opciones, el usuario elige una y solo
     entonces se escribe en la base. Lo descartado no ensucia el calendario.

  2. **El control de voz de marca se ve.** El backend ya vigilaba las palabras
     prohibidas, pero hasta ahora era invisible: aquí se resalta la palabra
     dentro del copy, se avisa en la tarjeta y se dice qué se revisó. Es la
     diferencia entre "confía en nosotros" y "míralo tú mismo".
*/

import { useState } from 'react';
import { useNavigate } from 'react-router';

import {
  CHANNELS,
  PIECE_TYPES,
  PIECE_TYPE_LABELS,
  createPiece,
  errorMessage,
  generateContent,
  type Channel,
  type GenerateResponse,
  type PieceStatus,
  type PieceType,
} from '../api';
import { Toast, type Notice } from '../components/Toast';
import { findForbidden, highlightForbidden } from '../lib/forbidden';
import { useActiveProfile } from '../profile/profile-context';
import s from './GeneratePage.module.css';

/** Ideas genéricas para arrancar sin quedarse mirando el campo vacío. */
const IDEAS: { label: string; topic: string }[] = [
  { label: 'Producto del día', topic: 'el producto destacado de hoy' },
  { label: 'Horario especial', topic: 'cambio de horario este fin de semana' },
  { label: 'Novedad', topic: 'algo nuevo que acabamos de sumar' },
  { label: 'Detrás de escena', topic: 'cómo empieza el día en el negocio' },
];

interface DisplayOption {
  id: string;
  approach: string;
  text: string;
  editing: boolean;
}

export function GeneratePage() {
  const profile = useActiveProfile();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<Channel>('Instagram');
  const [pieceType, setPieceType] = useState<PieceType>('post');
  const [topic, setTopic] = useState('');

  const [generating, setGenerating] = useState(false);
  const [response, setResponse] = useState<GenerateResponse | null>(null);
  const [options, setOptions] = useState<DisplayOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const watchedTerms = response?.forbidden_terms_checked ?? [];

  async function generate() {
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setError('Escribe sobre qué quieres publicar.');
      return;
    }

    setGenerating(true);
    setError(null);
    setOptions([]);
    setResponse(null);

    try {
      const result = await generateContent({
        profile_id: profile.id,
        channel: channel,
        piece_type: pieceType,
        topic: cleanTopic,
      });
      setResponse(result);
      setOptions(
        result.options.map((option, index) => ({
          id: `${Date.now()}-${index}`,
          approach: option.approach,
          text: option.text,
          editing: false,
        }))
      );
    } catch (failure) {
      setError(errorMessage(failure, 'No se pudo generar el contenido.'));
    } finally {
      setGenerating(false);
    }
  }

  async function save(option: DisplayOption, status: PieceStatus) {
    setSavingId(option.id);
    try {
      await createPiece({
        profile_id: profile.id,
        channel: channel,
        piece_type: pieceType,
        topic: topic.trim(),
        generated_text: option.text,
        status: status,
      });
      // Se quita de la lista: ya está guardada, dejarla invitaría a duplicarla.
      setOptions((current) => current.filter((o) => o.id !== option.id));
      setNotice({
        message:
          status === 'aprobado'
            ? 'Aprobada y guardada. Prográmala en el calendario.'
            : 'Guardada como borrador.',
      });
    } catch (failure) {
      setNotice({
        message: errorMessage(failure, 'No se pudo guardar.'),
        kind: 'error',
      });
    } finally {
      setSavingId(null);
    }
  }

  function editText(id: string, text: string) {
    setOptions((current) => current.map((o) => (o.id === id ? { ...o, text } : o)));
  }

  function toggleEditing(id: string) {
    setOptions((current) =>
      current.map((o) => (o.id === id ? { ...o, editing: !o.editing } : o))
    );
  }

  function discard(id: string) {
    // No se llama al backend: estas opciones nunca llegaron a guardarse.
    setOptions((current) => current.filter((o) => o.id !== id));
  }

  const hasResults = !generating && options.length > 0;
  const allOptionsCleared = !generating && response !== null && options.length === 0;

  return (
    <>
      <title>Generar contenido — BrandDNA</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className={s.eyebrow}>Generar</div>
      <h1 className={s.titulo}>¿Qué contamos hoy?</h1>
      <p className={s.firma}>
        <span className={s.puntoVivo} />
        <span>
          Escribiendo como <span className={s.marca}>{profile.business_name}</span>, tono{' '}
          <span className={s.marca}>{profile.tone}</span>
        </span>
      </p>

      <div className={s.grupo}>
        <div className={s.grupoTitulo} id="etiqueta-canal">
          Canal
        </div>
        <div className={s.chips} role="group" aria-labelledby="etiqueta-canal">
          {CHANNELS.map((option) => (
            <button
              key={option}
              type="button"
              className={option === channel ? s.chipActivo : s.chip}
              aria-pressed={option === channel}
              onClick={() => setChannel(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className={s.grupo}>
        <div className={s.grupoTitulo} id="etiqueta-tipo">
          Tipo de pieza
        </div>
        <div className={s.chips} role="group" aria-labelledby="etiqueta-tipo">
          {PIECE_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              className={option === pieceType ? s.chipActivo : s.chip}
              aria-pressed={option === pieceType}
              onClick={() => setPieceType(option)}
            >
              {PIECE_TYPE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className={s.grupo}>
        <label className={s.grupoTitulo} htmlFor="tema">
          Tema
        </label>
        <textarea
          id="tema"
          className={s.tema}
          rows={2}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Llegó el pan de centeno de los martes"
        />
        <div className={s.ideas}>
          {IDEAS.map((idea) => (
            <button
              key={idea.label}
              type="button"
              className={s.idea}
              onClick={() => setTopic(idea.topic)}
            >
              {idea.label}
            </button>
          ))}
        </div>
      </div>

      <button className={s.generar} onClick={generate} disabled={generating}>
        {generating
          ? 'Escribiendo…'
          : options.length > 0
            ? 'Generar otras 3'
            : 'Generar 3 opciones'}
      </button>

      {generating && (
        <>
          <div className={s.esqueletos} aria-hidden="true">
            <div className={s.esqueleto} />
            <div className={s.esqueleto} style={{ animationDelay: '0.15s' }} />
            <div className={s.esqueleto} style={{ animationDelay: '0.3s' }} />
          </div>
          <p className={s.esperando} role="status">
            Escribiendo con tu voz de marca. Puede tardar unos segundos.
          </p>
        </>
      )}

      {error && (
        <div className={s.error} role="alert">
          {error}
        </div>
      )}

      {hasResults && response && (
        <div className={s.resultados}>
          <div className={s.resumen}>
            <div className={s.resumenLinea}>
              <span>3 opciones. Quédate con la que suene a tu marca.</span>
            </div>

            {watchedTerms.length > 0 ? (
              <div className={s.resumenLinea}>
                <span className={s.escudo}>✓</span>
                <span>
                  Revisado que no aparezcan: {watchedTerms.join(', ')}.
                  {response.regenerated &&
                    ' Se le pidió una corrección al modelo y la aplicó.'}
                </span>
              </div>
            ) : (
              <div className={s.resumenLinea}>
                <span>
                  No definiste palabras prohibidas.{' '}
                  <button
                    type="button"
                    className={s.enlace}
                    onClick={() => navigate('/marca')}
                  >
                    Añádelas en Mi marca
                  </button>{' '}
                  y se revisarán solas.
                </span>
              </div>
            )}

            {response.warnings.map((warning) => (
              <div key={warning} className={s.resumenLinea}>
                <span className={s.resumenAviso}>⚠ {warning}</span>
              </div>
            ))}
          </div>

          {options.map((option) => {
            // Se recalcula en cada render: si el usuario edita el texto y
            // escribe una palabra prohibida a mano, el aviso aparece al
            // momento sin volver a llamar a la API.
            const slipped = findForbidden(option.text, watchedTerms);
            const savingThis = savingId === option.id;

            return (
              <article
                key={option.id}
                className={slipped.length ? s.tarjetaSucia : s.tarjeta}
              >
                <div className={s.tarjetaCabecera}>
                  <div className={s.enfoque}>{option.approach}</div>
                  <div className={s.meta}>
                    {channel} · {PIECE_TYPE_LABELS[pieceType]}
                  </div>
                </div>

                {option.editing ? (
                  <textarea
                    className={s.editor}
                    value={option.text}
                    onChange={(e) => editText(option.id, e.target.value)}
                    aria-label={`Editar la opción ${option.approach}`}
                  />
                ) : (
                  <div className={s.texto}>
                    {highlightForbidden(option.text, watchedTerms)}
                  </div>
                )}

                {slipped.length > 0 && (
                  <div className={s.aviso}>
                    <span aria-hidden="true">⚠</span>
                    <span>
                      Usa {slipped.length === 1 ? 'una palabra' : 'palabras'} que pediste
                      evitar: <strong>{slipped.join(', ')}</strong>. Edítala o descártala.
                    </span>
                  </div>
                )}

                <div className={s.acciones}>
                  <button
                    className={slipped.length ? s.aprobarAviso : s.aprobar}
                    disabled={savingThis}
                    onClick={() => save(option, 'aprobado')}
                  >
                    {savingThis
                      ? 'Guardando…'
                      : slipped.length
                        ? 'Aprobar igualmente'
                        : 'Aprobar'}
                  </button>
                  <button
                    className={s.borrador}
                    disabled={savingThis}
                    onClick={() => save(option, 'borrador')}
                  >
                    Guardar borrador
                  </button>
                </div>

                <div className={s.accionesSecundarias}>
                  <button
                    className={s.textual}
                    onClick={() => toggleEditing(option.id)}
                  >
                    {option.editing ? 'Listo' : 'Editar'}
                  </button>
                  <button className={s.descartar} onClick={() => discard(option.id)}>
                    Descartar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {allOptionsCleared && (
        <div className={s.vacio}>
          No queda ninguna opción sobre la mesa.
          <br />
          Genera otras tres o revisa lo guardado en el calendario.
        </div>
      )}

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
