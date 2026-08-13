/*
  Punto de entrada de la capa de API.

  El resto de la app importa siempre desde aquí (`from '../api'`) y nunca de
  los archivos sueltos: así se puede reorganizar por dentro sin tocar las
  pantallas.
*/

export { ApiError, API_BASE_URL, setBrandToken } from './client';

export * from './types';
export * from './labels';

export {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  rotateToken,
} from './profiles';

export { generateContent } from './generate';

export {
  listPieces,
  createPiece,
  updatePiece,
  deletePiece,
} from './pieces';
