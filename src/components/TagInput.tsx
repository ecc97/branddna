/*
  Entrada de palabras clave como etiquetas.

  Sustituye a los chips fijos del prototipo, que eran de panadería
  ('artesanal', 'de barrio', 'fresco') y no servían para ningún otro rubro.
  Aquí el usuario escribe las suyas, que es lo que hace única a una marca.

  El backend guarda `keywords` como un string separado por comas; la conversión
  entre string y array la hace la pantalla, no este componente.
*/

import { useId, useState, type KeyboardEvent } from 'react';

import s from './forms.module.css';

interface TagInputProps {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagInput({ label, hint, value, onChange, placeholder }: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState('');

  function addTag(text: string) {
    const cleaned = text.trim().replace(/,+$/, '').trim();
    if (!cleaned) return;
    // Sin duplicados: comparar en minúsculas evita "Fresco" y "fresco".
    const alreadyPresent = value.some((t) => t.toLowerCase() === cleaned.toLowerCase());
    if (!alreadyPresent) onChange([...value, cleaned]);
    setDraft('');
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // La coma también confirma: mucha gente escribe listas separándolas así.
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(draft);
      return;
    }
    // Retroceso con el campo vacío borra la última etiqueta, como en los
    // campos de destinatarios del correo.
    if (event.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className={s.campo}>
      <label className={s.etiqueta} htmlFor={id}>
        {label}
      </label>
      {hint && <div className={s.pista}>{hint}</div>}

      {value.length > 0 && (
        <div className={s.tags}>
          {value.map((tag, index) => (
            <span key={tag} className={s.tag}>
              {tag}
              <button
                type="button"
                className={s.quitarTag}
                onClick={() => removeTag(index)}
                aria-label={`Quitar ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        id={id}
        className={s.control}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        // Si el usuario escribe algo y hace clic fuera, se guarda igual.
        // Perder lo escrito por no pulsar Enter es una frustración innecesaria.
        onBlur={() => addTag(draft)}
      />
    </div>
  );
}
