import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { listProfiles, type BrandProfile } from '../api';
import {
  PROFILE_STORAGE_KEY,
  ProfileContext,
  type ProfileState,
} from './profile-context';

function readStoredId(): string | null {
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string | null): void {
  try {
    if (id) localStorage.setItem(PROFILE_STORAGE_KEY, id);
    else localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Almacenamiento bloqueado: la app funciona igual, solo que al recargar
    // habrá que volver a elegir perfil. No es motivo para romper nada.
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProfileState>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<BrandProfile | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState('cargando');
    setError(null);

    let list: BrandProfile[];
    try {
      list = await listProfiles(signal);
    } catch (failure) {
      // En desarrollo, StrictMode monta el efecto dos veces y aborta el
      // primero. Ese "fallo" no es un error real: se ignora.
      if (signal?.aborted) return;
      setError(failure instanceof Error ? failure.message : String(failure));
      setState('error');
      return;
    }

    if (signal?.aborted) return;
    setProfiles(list);

    if (list.length === 0) {
      setActiveProfile(null);
      setState('sin-perfiles');
      return;
    }

    // El id recordado solo vale si ese perfil sigue existiendo.
    const storedId = readStoredId();
    const remembered = storedId ? list.find((p) => p.id === storedId) : undefined;
    if (remembered) {
      setActiveProfile(remembered);
      setState('listo');
      return;
    }

    // Con un solo perfil no tiene sentido preguntar cuál.
    if (list.length === 1) {
      setActiveProfile(list[0]);
      storeId(list[0].id);
      setState('listo');
      return;
    }

    storeId(null);
    setActiveProfile(null);
    setState('eligiendo');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectProfile = useCallback(
    (id: string) => {
      const chosen = profiles.find((p) => p.id === id);
      if (!chosen) return;
      storeId(id);
      setActiveProfile(chosen);
      setState('listo');
    },
    [profiles]
  );

  const registerProfile = useCallback((profile: BrandProfile) => {
    storeId(profile.id);
    setActiveProfile(profile);
    setProfiles((current) => {
      const exists = current.some((p) => p.id === profile.id);
      return exists ? current.map((p) => (p.id === profile.id ? profile : p)) : [profile, ...current];
    });
    setState('listo');
  }, []);

  const reload = useCallback(() => void load(), [load]);

  const value = useMemo(
    () => ({ state, error, profiles, activeProfile, selectProfile, registerProfile, reload }),
    [state, error, profiles, activeProfile, selectProfile, registerProfile, reload]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
