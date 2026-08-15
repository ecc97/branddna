/*
  El código de acceso de una marca, en pantalla.

  Dos situaciones distintas y por eso dos componentes:

  - `NewKeyPanel`: acaba de crearse la marca. Es **la única vez** que el código
    existe en claro, así que el panel es llamativo y ofrece copiar y descargar.
    Después el backend solo guarda el hash de la llave: ni él mismo puede
    volver a mostrarla.
  - `KeySettings`: dentro de «Mi marca». Está oculto tras un botón —no conviene
    dejarlo a la vista de quien pase por detrás— y permite copiarlo o rotarlo.

  Se muestra el **código** (`id.llave`) y no la llave suelta porque es lo que el
  usuario necesita para entrar desde otro dispositivo: una sola cadena, sin
  tener que entender que dentro hay dos datos.

  Sin dependencias nuevas: `navigator.clipboard` y un `Blob` con un enlace de
  descarga.
*/

import { useState } from 'react';

import s from './TokenPanel.module.css';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // El portapapeles falla en contextos no seguros o si el usuario lo deniega.
    // No es motivo para romper nada: el código sigue visible para copiarlo a mano.
    return false;
  }
}

function downloadKeyFile(businessName: string, code: string): void {
  const content = [
    'Código de acceso de BrandDNA',
    '',
    `Marca: ${businessName}`,
    '',
    code,
    '',
    'Guarda este archivo. Este código es lo único que permite entrar a la',
    'marca desde otro navegador, y no hay forma de recuperarlo si se pierde.',
    'Trátalo como una contraseña: quien lo tenga puede leer y editar tu',
    'contenido.',
  ].join('\n');

  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  // Nombre de archivo sin espacios ni acentos, que viajan mal entre sistemas.
  link.download = `branddna-codigo-${businessName
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

interface Feedback {
  message: string;
  ok: boolean;
}

interface CopyButtonProps {
  code: string;
  onFeedback: (feedback: Feedback) => void;
}

function CopyButton({ code, onFeedback }: CopyButtonProps) {
  return (
    <button
      type="button"
      className={s.primary}
      onClick={async () => {
        const ok = await copyToClipboard(code);
        onFeedback({
          message: ok
            ? 'Código copiado al portapapeles.'
            : 'No se pudo copiar. Selecciónalo a mano.',
          ok,
        });
      }}
    >
      Copiar
    </button>
  );
}

// --------------------------------------------------------------------------
// Marca recién creada
// --------------------------------------------------------------------------
interface NewKeyPanelProps {
  businessName: string;
  code: string;
}

export function NewKeyPanel({ businessName, code }: NewKeyPanelProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  return (
    <div className={s.callout} role="status">
      <div className={s.calloutTitle}>Este es el código de acceso de tu marca</div>
      <p className={s.calloutText}>
        Guárdalo ahora: <strong>no volvemos a mostrarlo</strong>. Lo necesitas para
        entrar a «{businessName}» desde otro navegador. Este ya lo recuerda.
      </p>

      <code className={s.key}>{code}</code>

      <div className={s.actions}>
        <CopyButton code={code} onFeedback={setFeedback} />
        <button
          type="button"
          className={s.button}
          onClick={() => downloadKeyFile(businessName, code)}
        >
          Descargar .txt
        </button>
      </div>

      {feedback && (
        <div className={feedback.ok ? s.feedback : s.warning}>{feedback.message}</div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Dentro de «Mi marca»
// --------------------------------------------------------------------------
interface KeySettingsProps {
  businessName: string;
  code: string | null;
  onRotate: () => Promise<string | null>;
}

export function KeySettings({ businessName, code, onRotate }: KeySettingsProps) {
  const [revealed, setRevealed] = useState(false);
  const [confirmingRotation, setConfirmingRotation] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Este navegador no recuerda el código: se entró de otra forma o se limpió.
  if (!code) {
    return (
      <div className={s.section}>
        <div className={s.sectionTitle}>Código de acceso</div>
        <p className={s.sectionText}>
          Este navegador no tiene guardado el código de esta marca. Si lo perdiste, la
          única salida es rotarlo desde un navegador que sí lo recuerde.
        </p>
      </div>
    );
  }

  async function rotate() {
    setRotating(true);
    const failure = await onRotate();
    setRotating(false);
    setConfirmingRotation(false);
    setRevealed(true);
    setFeedback(
      failure
        ? { message: failure, ok: false }
        : { message: 'Código rotado. El anterior ya no sirve.', ok: true }
    );
  }

  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>Código de acceso</div>
      <p className={s.sectionText}>
        Es lo que permite entrar a esta marca desde otro dispositivo. Trátalo como una
        contraseña: quien lo tenga puede leer y editar tu contenido.
      </p>

      <code className={revealed ? s.key : s.hidden}>
        {revealed ? code : '•'.repeat(28)}
      </code>

      <div className={s.actions}>
        <button
          type="button"
          className={s.button}
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? 'Ocultar' : 'Mostrar'}
        </button>
        {revealed && (
          <>
            <CopyButton code={code} onFeedback={setFeedback} />
            <button
              type="button"
              className={s.button}
              onClick={() => downloadKeyFile(businessName, code)}
            >
              Descargar .txt
            </button>
          </>
        )}
        <button
          type="button"
          className={s.danger}
          onClick={() => setConfirmingRotation(true)}
          disabled={confirmingRotation || rotating}
        >
          Rotar código
        </button>
      </div>

      {confirmingRotation && (
        <div className={s.confirm}>
          <div className={s.confirmText}>
            Se generará un código nuevo y <strong>el actual dejará de funcionar</strong>.
            Los navegadores donde hayas entrado con el viejo tendrán que usar el nuevo.
          </div>
          <div className={s.actions}>
            <button type="button" className={s.primary} onClick={rotate} disabled={rotating}>
              {rotating ? 'Rotando…' : 'Sí, rotar'}
            </button>
            <button
              type="button"
              className={s.button}
              onClick={() => setConfirmingRotation(false)}
              disabled={rotating}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className={feedback.ok ? s.feedback : s.warning}>{feedback.message}</div>
      )}
    </div>
  );
}
