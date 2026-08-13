/*
  Campo de texto de una línea y de varias.

  Cada componente pinta su propia etiqueta, pista y error en vez de exigir un
  `<Field>` envolvente. Es menos "composable" en abstracto, pero en la práctica
  todos los campos de esta app tienen exactamente esa forma, y así una pantalla
  se lee de un vistazo.

  El `id` se genera con `useId()` para que la etiqueta quede asociada al
  control: pulsar el texto enfoca el campo, y un lector de pantalla anuncia
  cuál es. Escribirlo a mano en cada uso acabaría produciendo duplicados.
*/

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import s from './forms.module.css';

interface CommonProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /**
   * Oculta la etiqueta a la vista, pero la mantiene para lectores de pantalla.
   * Para cuando otro elemento visible ya identifica el campo.
   */
  labelHidden?: boolean;
}

function FieldLabels({
  id,
  label,
  hint,
  error,
  required,
  labelHidden,
}: CommonProps & { id: string }) {
  return (
    <>
      <label className={labelHidden ? s.etiquetaOculta : s.etiqueta} htmlFor={id}>
        {label}
        {required && <span className={s.obligatorio}>*</span>}
      </label>
      {hint && !error && <div className={s.pista}>{hint}</div>}
    </>
  );
}

type TextInputProps = CommonProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export function TextInput({ label, hint, error, required, labelHidden, ...props }: TextInputProps) {
  const id = useId();
  return (
    <div className={s.campo}>
      <FieldLabels id={id} label={label} hint={hint} error={error} required={required} labelHidden={labelHidden} />
      <input
        id={id}
        className={`${s.control} ${error ? s.controlConError : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <div className={s.error} id={`${id}-error`}>
          {error}
        </div>
      )}
    </div>
  );
}

type TextAreaProps = CommonProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;

export function TextArea({ label, hint, error, required, labelHidden, ...props }: TextAreaProps) {
  const id = useId();
  return (
    <div className={s.campo}>
      <FieldLabels id={id} label={label} hint={hint} error={error} required={required} labelHidden={labelHidden} />
      <textarea
        id={id}
        className={`${s.area} ${error ? s.controlConError : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <div className={s.error} id={`${id}-error`}>
          {error}
        </div>
      )}
    </div>
  );
}
