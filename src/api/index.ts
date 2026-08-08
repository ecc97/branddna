/*
  Punto de entrada de la capa de API.

  El resto de la app importa siempre desde aquí (`from '../api'`) y nunca de
  los archivos sueltos: así se puede reorganizar por dentro sin tocar las
  pantallas.
*/

export { ApiError, API_BASE_URL } from './client';

export * from './types';
export * from './labels';

export {
  listarPerfiles,
  obtenerPerfil,
  crearPerfil,
  actualizarPerfil,
} from './profiles';

export { generarContenido } from './generate';

export {
  listarPiezas,
  crearPieza,
  actualizarPieza,
  eliminarPieza,
} from './pieces';
