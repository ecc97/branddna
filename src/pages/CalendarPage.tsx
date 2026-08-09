/* Pendiente: paso 5 del plan. */

import { usePerfilActivo } from '../profile/profile-context';
import s from './placeholder.module.css';

export function CalendarPage() {
  const perfil = usePerfilActivo();

  return (
    <>
      <div className={s.eyebrow}>Calendario</div>
      <h1 className={s.titulo}>Lo que viene</h1>
      <div className={s.aviso}>
        Calendario de <span className={s.marca}>{perfil.business_name}</span>.
        <br />
        <br />
        Llega en el paso 5: vistas de mes y semana con fechas reales, navegación entre
        meses y los huecos sin contenido a la vista.
      </div>
    </>
  );
}
