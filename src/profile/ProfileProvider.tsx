import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { listarPerfiles, type BrandProfile } from '../api';
import {
  PROFILE_STORAGE_KEY,
  ProfileContext,
  type EstadoPerfil,
} from './profile-context';

function leerIdGuardado(): string | null {
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function guardarId(id: string | null): void {
  try {
    if (id) localStorage.setItem(PROFILE_STORAGE_KEY, id);
    else localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Almacenamiento bloqueado: la app funciona igual, solo que al recargar
    // habrá que volver a elegir perfil. No es motivo para romper nada.
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoPerfil>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [perfiles, setPerfiles] = useState<BrandProfile[]>([]);
  const [perfilActivo, setPerfilActivo] = useState<BrandProfile | null>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setEstado('cargando');
    setError(null);

    let lista: BrandProfile[];
    try {
      lista = await listarPerfiles(signal);
    } catch (fallo) {
      // En desarrollo, StrictMode monta el efecto dos veces y aborta el
      // primero. Ese "fallo" no es un error real: se ignora.
      if (signal?.aborted) return;
      setError(fallo instanceof Error ? fallo.message : String(fallo));
      setEstado('error');
      return;
    }

    if (signal?.aborted) return;
    setPerfiles(lista);

    if (lista.length === 0) {
      setPerfilActivo(null);
      setEstado('sin-perfiles');
      return;
    }

    // El id recordado solo vale si ese perfil sigue existiendo.
    const guardado = leerIdGuardado();
    const recordado = guardado ? lista.find((p) => p.id === guardado) : undefined;
    if (recordado) {
      setPerfilActivo(recordado);
      setEstado('listo');
      return;
    }

    // Con un solo perfil no tiene sentido preguntar cuál.
    if (lista.length === 1) {
      setPerfilActivo(lista[0]);
      guardarId(lista[0].id);
      setEstado('listo');
      return;
    }

    guardarId(null);
    setPerfilActivo(null);
    setEstado('eligiendo');
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    void cargar(controlador.signal);
    return () => controlador.abort();
  }, [cargar]);

  const seleccionar = useCallback(
    (id: string) => {
      const elegido = perfiles.find((p) => p.id === id);
      if (!elegido) return;
      guardarId(id);
      setPerfilActivo(elegido);
      setEstado('listo');
    },
    [perfiles]
  );

  const registrarPerfil = useCallback((perfil: BrandProfile) => {
    guardarId(perfil.id);
    setPerfilActivo(perfil);
    setPerfiles((actuales) => {
      const existe = actuales.some((p) => p.id === perfil.id);
      return existe ? actuales.map((p) => (p.id === perfil.id ? perfil : p)) : [perfil, ...actuales];
    });
    setEstado('listo');
  }, []);

  const recargar = useCallback(() => void cargar(), [cargar]);

  const valor = useMemo(
    () => ({ estado, error, perfiles, perfilActivo, seleccionar, registrarPerfil, recargar }),
    [estado, error, perfiles, perfilActivo, seleccionar, registrarPerfil, recargar]
  );

  return <ProfileContext.Provider value={valor}>{children}</ProfileContext.Provider>;
}
