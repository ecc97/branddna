/* Pendiente: paso 4 del plan. */

import { usePerfilActivo } from '../profile/profile-context';
import s from './placeholder.module.css';

export function GeneratePage() {
  const perfil = usePerfilActivo();

  return (
    <>
      <div className={s.eyebrow}>Generar</div>
      <h1 className={s.titulo}>¿Qué contamos hoy?</h1>
      <div className={s.aviso}>
        Escribiendo como <span className={s.marca}>{perfil.business_name}</span>, tono{' '}
        <span className={s.marca}>{perfil.tone}</span>.
        <br />
        <br />
        El generador llega en el paso 4: selección de canal y tipo, tema, las 3 opciones
        reales de Groq y el aviso de palabras prohibidas.
      </div>
    </>
  );
}
