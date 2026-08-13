/*
  Selector de tono híbrido.

  El prototipo ofrecía 4 tonos fijos; el backend guarda `tone` como texto
  libre. Ninguno de los dos extremos servía:

  - Solo 4 opciones encerraría a todos los negocios del mundo en cuatro voces,
    que es justo lo que el producto promete evitar.
  - Solo texto libre deja al dueño de una pyme mirando un campo vacío sin saber
    qué escribir en "tono de voz".

  La solución: los 4 chips rellenan un campo que sigue siendo editable. Se
  arranca rápido y no hay techo.
*/

import s from './forms.module.css';
import { TextInput } from './TextInput';

type Shape = 'circulo' | 'cuadrado' | 'rombo' | 'triangulo';

interface Tone {
  id: string;
  name: string;
  hint: string;
  /** Lo que se escribe en el campo al elegirlo. Esto es lo que viaja al backend. */
  text: string;
  shape: Shape;
}

const TONES: Tone[] = [
  { id: 'cercano', name: 'Cercano', hint: 'Como en el mostrador', text: 'cercano y cálido', shape: 'circulo' },
  { id: 'formal', name: 'Formal', hint: 'Serio y cuidado', text: 'formal y profesional', shape: 'cuadrado' },
  { id: 'divertido', name: 'Divertido', hint: 'Con chispa', text: 'divertido y desenfadado', shape: 'rombo' },
  { id: 'tecnico', name: 'Técnico', hint: 'Datos al frente', text: 'técnico y directo, con datos', shape: 'triangulo' },
];

function Icon({ shape, color }: { shape: Shape; color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className={s.tonoIcono} aria-hidden="true">
      {shape === 'circulo' && <circle cx="13" cy="13" r="8" stroke={color} strokeWidth="1.6" />}
      {shape === 'cuadrado' && <rect x="5.5" y="5.5" width="15" height="15" rx="2" stroke={color} strokeWidth="1.6" />}
      {shape === 'rombo' && (
        <rect x="13" y="2.6" width="14.7" height="14.7" rx="2" transform="rotate(45 13 2.6)" stroke={color} strokeWidth="1.6" />
      )}
      {shape === 'triangulo' && <path d="M13 5 L21 20 L5 20 Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />}
    </svg>
  );
}

interface ToneSelectorProps {
  value: string;
  onChange: (next: string) => void;
  error?: string;
}

export function ToneSelector({ value, onChange, error }: ToneSelectorProps) {
  return (
    <div className={s.campo}>
      <div className={s.tonos}>
        {TONES.map((tone) => {
          // Un chip se marca activo solo si el campo dice exactamente su texto.
          // En cuanto el usuario lo retoca, ninguno queda marcado: el campo
          // manda, no el chip.
          const isActive = value.trim().toLowerCase() === tone.text.toLowerCase();
          return (
            <button
              key={tone.id}
              type="button"
              className={isActive ? s.tonoActivo : s.tono}
              onClick={() => onChange(tone.text)}
              aria-pressed={isActive}
            >
              <Icon shape={tone.shape} color={isActive ? 'var(--acc-t)' : 'var(--t4)'} />
              <span>
                <span className={s.tonoNombre}>{tone.name}</span>
                <span className={s.tonoPista} style={{ display: 'block' }}>
                  {tone.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <TextInput
        label="Tono"
        required
        value={value}
        error={error}
        onChange={(e) => onChange(e.target.value)}
        placeholder="cercano y cálido"
        hint="Elige uno de arriba o descríbelo con tus palabras."
      />
    </div>
  );
}
