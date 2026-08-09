/*
  Elegir marca cuando hay varias y ninguna recordada.

  Existe porque no hay autenticación: la base puede contener varios perfiles
  (el del seed y los que cree el usuario) y la app no tiene forma de deducir
  cuál corresponde. Con un solo perfil no se muestra: preguntar lo obvio
  también es fricción.
*/

import { useProfile } from '../profile/profile-context';
import s from './ProfilePicker.module.css';

export function ProfilePicker() {
  const { perfiles, seleccionar } = useProfile();

  return (
    <div className={s.pantalla}>
      <div className={s.caja}>
        <div className={s.eyebrow}>Bienvenido</div>
        <h1 className={s.titulo}>¿Con qué marca trabajamos?</h1>
        <p className={s.lead}>
          Hay varias guardadas. Elige una: la app la recordará la próxima vez.
        </p>

        <div className={s.lista}>
          {perfiles.map((perfil) => (
            <button
              key={perfil.id}
              type="button"
              className={s.opcion}
              onClick={() => seleccionar(perfil.id)}
            >
              <span className={s.nombre}>{perfil.business_name}</span>
              <span className={s.detalle}>{perfil.what_they_sell}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
