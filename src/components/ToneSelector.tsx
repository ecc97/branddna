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

type Forma = 'circulo' | 'cuadrado' | 'rombo' | 'triangulo';

interface Tono {
  id: string;
  nombre: string;
  pista: string;
  /** Lo que se escribe en el campo al elegirlo. Esto es lo que viaja al backend. */
  texto: string;
  forma: Forma;
}

const TONOS: Tono[] = [
  { id: 'cercano', nombre: 'Cercano', pista: 'Como en el mostrador', texto: 'cercano y cálido', forma: 'circulo' },
  { id: 'formal', nombre: 'Formal', pista: 'Serio y cuidado', texto: 'formal y profesional', forma: 'cuadrado' },
  { id: 'divertido', nombre: 'Divertido', pista: 'Con chispa', texto: 'divertido y desenfadado', forma: 'rombo' },
  { id: 'tecnico', nombre: 'Técnico', pista: 'Datos al frente', texto: 'técnico y directo, con datos', forma: 'triangulo' },
];

function Icono({ forma, color }: { forma: Forma; color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className={s.tonoIcono} aria-hidden="true">
      {forma === 'circulo' && <circle cx="13" cy="13" r="8" stroke={color} strokeWidth="1.6" />}
      {forma === 'cuadrado' && <rect x="5.5" y="5.5" width="15" height="15" rx="2" stroke={color} strokeWidth="1.6" />}
      {forma === 'rombo' && (
        <rect x="13" y="2.6" width="14.7" height="14.7" rx="2" transform="rotate(45 13 2.6)" stroke={color} strokeWidth="1.6" />
      )}
      {forma === 'triangulo' && <path d="M13 5 L21 20 L5 20 Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />}
    </svg>
  );
}

interface ToneSelectorProps {
  value: string;
  onChange: (siguiente: string) => void;
  error?: string;
}

export function ToneSelector({ value, onChange, error }: ToneSelectorProps) {
  return (
    <div className={s.campo}>
      <div className={s.tonos}>
        {TONOS.map((tono) => {
          // Un chip se marca activo solo si el campo dice exactamente su texto.
          // En cuanto el usuario lo retoca, ninguno queda marcado: el campo
          // manda, no el chip.
          const activo = value.trim().toLowerCase() === tono.texto.toLowerCase();
          return (
            <button
              key={tono.id}
              type="button"
              className={activo ? s.tonoActivo : s.tono}
              onClick={() => onChange(tono.texto)}
              aria-pressed={activo}
            >
              <Icono forma={tono.forma} color={activo ? 'var(--acc-t)' : 'var(--t4)'} />
              <span>
                <span className={s.tonoNombre}>{tono.nombre}</span>
                <span className={s.tonoPista} style={{ display: 'block' }}>
                  {tono.pista}
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
