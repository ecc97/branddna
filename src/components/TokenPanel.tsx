/*
  La llave de acceso de una marca, en pantalla.

  Dos situaciones distintas y por eso dos componentes:

  - `NewKeyPanel`: acaba de crearse la marca. Es **la única vez** que la llave
    existe en claro, así que el panel es llamativo y ofrece copiar y descargar.
    Después el backend solo guarda su hash: ni él mismo puede volver a
    mostrarla.
  - `KeySettings`: dentro de «Mi marca». La llave está oculta tras un botón
    —no conviene dejarla a la vista de quien pase por detrás— y permite
    copiarla o rotarla.

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
    // No es motivo para romper nada: la llave sigue visible para copiarla a mano.
    return false;
  }
}

function downloadKeyFile(businessName: string, token: string): void {
  const content = [
    `Llave de acceso de BrandDNA`,
    ``,
    `Marca: ${businessName}`,
    `Llave: ${token}`,
    ``,
    `Guarda este archivo. Sin esta llave no se puede entrar a la marca`,
    `desde otro navegador, y no hay forma de recuperarla.`,
  ].join('\n');

  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  // Nombre de archivo sin espacios ni acentos, que viajan mal entre sistemas.
  link.download = `branddna-llave-${businessName
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

interface CopyButtonProps {
  token: string;
  onFeedback: (message: string, ok: boolean) => void;
}

function CopyButton({ token, onFeedback }: CopyButtonProps) {
  return (
    <button
      type="button"
      className={s.primary}
      onClick={async () => {
        const ok = await copyToClipboard(token);
        onFeedback(
          ok ? 'Llave copiada al portapapeles.' : 'No se pudo copiar. Selecciónala a mano.',
          ok
        );
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
  token: string;
}

export function NewKeyPanel({ businessName, token }: NewKeyPanelProps) {
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  return (
    <div className={s.callout} role="status">
      <div className={s.calloutTitle}>Esta es la llave de tu marca</div>
      <p className={s.calloutText}>
        Guárdala ahora: <strong>no volvemos a mostrarla</strong>. La necesitas para entrar
        a «{businessName}» desde otro navegador. Este navegador ya la recuerda.
      </p>

      <code className={s.key}>{token}</code>

      <div className={s.actions}>
        <CopyButton token={token} onFeedback={(message, ok) => setFeedback({ message, ok })} />
        <button
          type="button"
          className={s.button}
          onClick={() => downloadKeyFile(businessName, token)}
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
  token: string | null;
  onRotate: () => Promise<string | null>;
}

export function KeySettings({ businessName, token, onRotate }: KeySettingsProps) {
  const [revealed, setRevealed] = useState(false);
  const [confirmingRotation, setConfirmingRotation] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  // Este navegador no recuerda la llave: se entró de otra forma o se limpió.
  if (!token) {
    return (
      <div className={s.section}>
        <div className={s.sectionTitle}>Llave de acceso</div>
        <p className={s.sectionText}>
          Este navegador no tiene guardada la llave de esta marca. Si la perdiste, la
          única salida es rotarla desde un navegador que sí la recuerde.
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
        : { message: 'Llave rotada. La anterior ya no sirve.', ok: true }
    );
  }

  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>Llave de acceso</div>
      <p className={s.sectionText}>
        Es lo que permite entrar a esta marca desde otro navegador. Trátala como una
        contraseña: quien la tenga puede leer y editar tu contenido.
      </p>

      <code className={revealed ? s.key : s.hidden}>
        {revealed ? token : '•'.repeat(24)}
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
          <CopyButton token={token} onFeedback={(message, ok) => setFeedback({ message, ok })} />
        )}
        {revealed && (
          <button
            type="button"
            className={s.button}
            onClick={() => downloadKeyFile(businessName, token)}
          >
            Descargar .txt
          </button>
        )}
        <button
          type="button"
          className={s.danger}
          onClick={() => setConfirmingRotation(true)}
          disabled={confirmingRotation || rotating}
        >
          Rotar llave
        </button>
      </div>

      {confirmingRotation && (
        <div className={s.confirm}>
          <div className={s.confirmText}>
            Se generará una llave nueva y <strong>la actual dejará de funcionar</strong>. Los
            navegadores donde hayas entrado con la vieja tendrán que usar la nueva.
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
