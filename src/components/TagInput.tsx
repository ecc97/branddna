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
  onChange: (siguiente: string[]) => void;
  placeholder?: string;
}

export function TagInput({ label, hint, value, onChange, placeholder }: TagInputProps) {
  const id = useId();
  const [borrador, setBorrador] = useState('');

  function agregar(texto: string) {
    const limpio = texto.trim().replace(/,+$/, '').trim();
    if (!limpio) return;
    // Sin duplicados: comparar en minúsculas evita "Fresco" y "fresco".
    const yaEsta = value.some((t) => t.toLowerCase() === limpio.toLowerCase());
    if (!yaEsta) onChange([...value, limpio]);
    setBorrador('');
  }

  function quitar(indice: number) {
    onChange(value.filter((_, i) => i !== indice));
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    // La coma también confirma: mucha gente escribe listas separándolas así.
    if (evento.key === 'Enter' || evento.key === ',') {
      evento.preventDefault();
      agregar(borrador);
      return;
    }
    // Retroceso con el campo vacío borra la última etiqueta, como en los
    // campos de destinatarios del correo.
    if (evento.key === 'Backspace' && !borrador && value.length > 0) {
      quitar(value.length - 1);
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
          {value.map((etiqueta, indice) => (
            <span key={etiqueta} className={s.tag}>
              {etiqueta}
              <button
                type="button"
                className={s.quitarTag}
                onClick={() => quitar(indice)}
                aria-label={`Quitar ${etiqueta}`}
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
        value={borrador}
        placeholder={placeholder}
        onChange={(e) => setBorrador(e.target.value)}
        onKeyDown={alPulsarTecla}
        // Si el usuario escribe algo y hace clic fuera, se guarda igual.
        // Perder lo escrito por no pulsar Enter es una frustración innecesaria.
        onBlur={() => agregar(borrador)}
      />
    </div>
  );
}
