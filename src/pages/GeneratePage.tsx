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
  ApiError,
  CHANNELS,
  PIECE_TYPES,
  PIECE_TYPE_LABELS,
  crearPieza,
  generarContenido,
  type Channel,
  type GenerateResponse,
  type PieceStatus,
  type PieceType,
} from '../api';
import { Toast, type Aviso } from '../components/Toast';
import { encontrarProhibidas, resaltarProhibidas } from '../lib/prohibidas';
import { usePerfilActivo } from '../profile/profile-context';
import s from './GeneratePage.module.css';

/** Ideas genéricas para arrancar sin quedarse mirando el campo vacío. */
const IDEAS: { etiqueta: string; tema: string }[] = [
  { etiqueta: 'Producto del día', tema: 'el producto destacado de hoy' },
  { etiqueta: 'Horario especial', tema: 'cambio de horario este fin de semana' },
  { etiqueta: 'Novedad', tema: 'algo nuevo que acabamos de sumar' },
  { etiqueta: 'Detrás de escena', tema: 'cómo empieza el día en el negocio' },
];

interface OpcionEnPantalla {
  id: string;
  approach: string;
  texto: string;
  editando: boolean;
}

export function GeneratePage() {
  const perfil = usePerfilActivo();
  const navegar = useNavigate();

  const [canal, setCanal] = useState<Channel>('Instagram');
  const [tipo, setTipo] = useState<PieceType>('post');
  const [tema, setTema] = useState('');

  const [generando, setGenerando] = useState(false);
  const [respuesta, setRespuesta] = useState<GenerateResponse | null>(null);
  const [opciones, setOpciones] = useState<OpcionEnPantalla[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const terminosVigilados = respuesta?.forbidden_terms_checked ?? [];

  async function generar() {
    const temaLimpio = tema.trim();
    if (!temaLimpio) {
      setError('Escribe sobre qué quieres publicar.');
      return;
    }

    setGenerando(true);
    setError(null);
    setOpciones([]);
    setRespuesta(null);

    try {
      const resultado = await generarContenido({
        profile_id: perfil.id,
        channel: canal,
        piece_type: tipo,
        topic: temaLimpio,
      });
      setRespuesta(resultado);
      setOpciones(
        resultado.options.map((opcion, indice) => ({
          id: `${Date.now()}-${indice}`,
          approach: opcion.approach,
          texto: opcion.text,
          editando: false,
        }))
      );
    } catch (fallo) {
      setError(
        fallo instanceof ApiError ? fallo.message : 'No se pudo generar el contenido.'
      );
    } finally {
      setGenerando(false);
    }
  }

  async function guardar(opcion: OpcionEnPantalla, estado: PieceStatus) {
    setGuardandoId(opcion.id);
    try {
      await crearPieza({
        profile_id: perfil.id,
        channel: canal,
        piece_type: tipo,
        topic: tema.trim(),
        generated_text: opcion.texto,
        status: estado,
      });
      // Se quita de la lista: ya está guardada, dejarla invitaría a duplicarla.
      setOpciones((actuales) => actuales.filter((o) => o.id !== opcion.id));
      setAviso({
        mensaje:
          estado === 'aprobado'
            ? 'Aprobada y guardada. Prográmala en el calendario.'
            : 'Guardada como borrador.',
      });
    } catch (fallo) {
      setAviso({
        mensaje: fallo instanceof ApiError ? fallo.message : 'No se pudo guardar.',
        tipo: 'error',
      });
    } finally {
      setGuardandoId(null);
    }
  }

  function editarTexto(id: string, texto: string) {
    setOpciones((actuales) => actuales.map((o) => (o.id === id ? { ...o, texto } : o)));
  }

  function alternarEdicion(id: string) {
    setOpciones((actuales) =>
      actuales.map((o) => (o.id === id ? { ...o, editando: !o.editando } : o))
    );
  }

  function descartar(id: string) {
    // No se llama al backend: estas opciones nunca llegaron a guardarse.
    setOpciones((actuales) => actuales.filter((o) => o.id !== id));
  }

  const hayResultados = !generando && opciones.length > 0;
  const seVaciaronLasOpciones = !generando && respuesta !== null && opciones.length === 0;

  return (
    <>
      <div className={s.eyebrow}>Generar</div>
      <h1 className={s.titulo}>¿Qué contamos hoy?</h1>
      <p className={s.firma}>
        <span className={s.puntoVivo} />
        <span>
          Escribiendo como <span className={s.marca}>{perfil.business_name}</span>, tono{' '}
          <span className={s.marca}>{perfil.tone}</span>
        </span>
      </p>

      <div className={s.grupo}>
        <div className={s.grupoTitulo} id="etiqueta-canal">
          Canal
        </div>
        <div className={s.chips} role="group" aria-labelledby="etiqueta-canal">
          {CHANNELS.map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={opcion === canal ? s.chipActivo : s.chip}
              aria-pressed={opcion === canal}
              onClick={() => setCanal(opcion)}
            >
              {opcion}
            </button>
          ))}
        </div>
      </div>

      <div className={s.grupo}>
        <div className={s.grupoTitulo} id="etiqueta-tipo">
          Tipo de pieza
        </div>
        <div className={s.chips} role="group" aria-labelledby="etiqueta-tipo">
          {PIECE_TYPES.map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={opcion === tipo ? s.chipActivo : s.chip}
              aria-pressed={opcion === tipo}
              onClick={() => setTipo(opcion)}
            >
              {PIECE_TYPE_LABELS[opcion]}
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
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Llegó el pan de centeno de los martes"
        />
        <div className={s.ideas}>
          {IDEAS.map((idea) => (
            <button
              key={idea.etiqueta}
              type="button"
              className={s.idea}
              onClick={() => setTema(idea.tema)}
            >
              {idea.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <button className={s.generar} onClick={generar} disabled={generando}>
        {generando
          ? 'Escribiendo…'
          : opciones.length > 0
            ? 'Generar otras 3'
            : 'Generar 3 opciones'}
      </button>

      {generando && (
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

      {hayResultados && respuesta && (
        <div className={s.resultados}>
          <div className={s.resumen}>
            <div className={s.resumenLinea}>
              <span>3 opciones. Quédate con la que suene a tu marca.</span>
            </div>

            {terminosVigilados.length > 0 ? (
              <div className={s.resumenLinea}>
                <span className={s.escudo}>✓</span>
                <span>
                  Revisado que no aparezcan: {terminosVigilados.join(', ')}.
                  {respuesta.regenerated &&
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
                    onClick={() => navegar('/marca')}
                  >
                    Añádelas en Mi marca
                  </button>{' '}
                  y se revisarán solas.
                </span>
              </div>
            )}

            {respuesta.warnings.map((advertencia) => (
              <div key={advertencia} className={s.resumenLinea}>
                <span className={s.resumenAviso}>⚠ {advertencia}</span>
              </div>
            ))}
          </div>

          {opciones.map((opcion) => {
            // Se recalcula en cada render: si el usuario edita el texto y
            // escribe una palabra prohibida a mano, el aviso aparece al
            // momento sin volver a llamar a la API.
            const coladas = encontrarProhibidas(opcion.texto, terminosVigilados);
            const guardandoEsta = guardandoId === opcion.id;

            return (
              <article
                key={opcion.id}
                className={coladas.length ? s.tarjetaSucia : s.tarjeta}
              >
                <div className={s.tarjetaCabecera}>
                  <div className={s.enfoque}>{opcion.approach}</div>
                  <div className={s.meta}>
                    {canal} · {PIECE_TYPE_LABELS[tipo]}
                  </div>
                </div>

                {opcion.editando ? (
                  <textarea
                    className={s.editor}
                    value={opcion.texto}
                    onChange={(e) => editarTexto(opcion.id, e.target.value)}
                    aria-label={`Editar la opción ${opcion.approach}`}
                  />
                ) : (
                  <div className={s.texto}>
                    {resaltarProhibidas(opcion.texto, terminosVigilados)}
                  </div>
                )}

                {coladas.length > 0 && (
                  <div className={s.aviso}>
                    <span aria-hidden="true">⚠</span>
                    <span>
                      Usa {coladas.length === 1 ? 'una palabra' : 'palabras'} que pediste
                      evitar: <strong>{coladas.join(', ')}</strong>. Edítala o descártala.
                    </span>
                  </div>
                )}

                <div className={s.acciones}>
                  <button
                    className={coladas.length ? s.aprobarAviso : s.aprobar}
                    disabled={guardandoEsta}
                    onClick={() => guardar(opcion, 'aprobado')}
                  >
                    {guardandoEsta
                      ? 'Guardando…'
                      : coladas.length
                        ? 'Aprobar igualmente'
                        : 'Aprobar'}
                  </button>
                  <button
                    className={s.borrador}
                    disabled={guardandoEsta}
                    onClick={() => guardar(opcion, 'borrador')}
                  >
                    Guardar borrador
                  </button>
                </div>

                <div className={s.accionesSecundarias}>
                  <button
                    className={s.textual}
                    onClick={() => alternarEdicion(opcion.id)}
                  >
                    {opcion.editando ? 'Listo' : 'Editar'}
                  </button>
                  <button className={s.descartar} onClick={() => descartar(opcion.id)}>
                    Descartar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {seVaciaronLasOpciones && (
        <div className={s.vacio}>
          No queda ninguna opción sobre la mesa.
          <br />
          Genera otras tres o revisa lo guardado en el calendario.
        </div>
      )}

      <Toast aviso={aviso} onCerrar={() => setAviso(null)} />
    </>
  );
}
