/*
  Ventana que aparece justo al crear una marca nueva.

  Es la única vez que el código de acceso existe en claro, así que se muestra
  de forma llamativa y no se descarta por tiempo: el usuario debe decidir
  guardarlo antes de irse por su cuenta. El botón principal lleva a /generar.

  Se mantiene simple a propósito: es un overlay fijo con el panel de la llave
  y dos acciones.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import s from './AccessModal.module.css';

interface AccessModalProps {
  businessName: string;
  code: string;
  onClose: () => void;
}

export function AccessModal({ businessName, code, onClose }: AccessModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // El portapapeles puede fallar en contextos no seguros. El código sigue
      // visible para copiarlo a mano, así que no pasa nada.
    }
  }

  function goGenerate() {
    onClose();
    navigate('/generar');
  }

  return (
    <div className={s.overlay} role="presentation" onClick={onClose}>
      <div
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={s.callout}>
          <div className={s.title} id="access-modal-title">
            Código de acceso de tu marca
          </div>
          <p className={s.text}>
            Guárdalo ahora: <strong>no volvemos a mostrarlo</strong>. Lo necesitas
            para entrar a «{businessName}» desde otro navegador.
          </p>

          <code className={s.key}>{code}</code>

          <button
            type="button"
            className={s.copy}
            onClick={copyCode}
            aria-live="polite"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <div className={s.actions}>
          <button type="button" className={s.primary} onClick={goGenerate}>
            Ya lo guardé, vamos a generar
          </button>
          <button type="button" className={s.secondary} onClick={onClose}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
