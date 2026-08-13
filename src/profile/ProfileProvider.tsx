import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  ApiError,
  getProfile,
  listProfiles,
  setBrandToken,
  type BrandProfile,
  type BrandProfileSummary,
} from '../api';
import {
  PROFILE_STORAGE_KEY,
  ProfileContext,
  TOKENS_STORAGE_KEY,
  type ProfileState,
} from './profile-context';

// --------------------------------------------------------------------------
// Almacenamiento local
//
// Todo va envuelto en try/catch: en modo incógnito o con el almacenamiento
// bloqueado, `localStorage` lanza excepción. La app debe seguir funcionando —
// solo que al recargar habrá que volver a pegar la llave.
// --------------------------------------------------------------------------
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
    /* sin persistencia, pero la sesión actual funciona */
  }
}

function readStoredTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    // Si alguien manipuló la clave a mano, se descarta en vez de reventar.
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function storeTokens(tokens: Record<string, string>): void {
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    /* sin persistencia, pero la sesión actual funciona */
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProfileState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BrandProfileSummary[]>([]);
  const [activeProfile, setActiveProfile] = useState<BrandProfile | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  /*
    Las llaves van en una ref y no en el estado: cambian dentro de callbacks
    que no deben volver a crearse por ello. `hasKeyFor` sí necesita provocar
    un repintado cuando cambian, así que se lleva la cuenta aparte.
  */
  const tokensRef = useRef<Record<string, string>>(readStoredTokens());
  const [tokensVersion, setTokensVersion] = useState(0);

  const rememberToken = useCallback((id: string, token: string) => {
    tokensRef.current = { ...tokensRef.current, [id]: token };
    storeTokens(tokensRef.current);
    setTokensVersion((v) => v + 1);
  }, []);

  const forgetToken = useCallback((id: string) => {
    const { [id]: _removed, ...rest } = tokensRef.current;
    tokensRef.current = rest;
    storeTokens(rest);
    setTokensVersion((v) => v + 1);
  }, []);

  /** Abre una marca con una llave concreta. Devuelve el mensaje de error, o null. */
  const openProfile = useCallback(
    async (id: string, token: string, signal?: AbortSignal): Promise<string | null> => {
      try {
        const profile = await getProfile(id, { brandToken: token, signal });
        setBrandToken(token);
        rememberToken(id, token);
        storeId(id);
        setActiveProfile(profile);
        setActiveToken(token);
        setState('ready');
        return null;
      } catch (failure) {
        if (signal?.aborted) return null;
        // 403 = la llave no vale. Se olvida: guardarla solo produciría el
        // mismo error en cada recarga.
        if (failure instanceof ApiError && failure.status === 403) {
          forgetToken(id);
          return 'Esa llave no corresponde a esta marca.';
        }
        return failure instanceof ApiError ? failure.message : 'No se pudo abrir la marca.';
      }
    },
    [forgetToken, rememberToken]
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState('loading');
      setError(null);
      setBrandToken(null);

      let list: BrandProfileSummary[];
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
        setActiveToken(null);
        setState('no-profiles');
        return;
      }

      const tokens = tokensRef.current;

      // El id recordado solo vale si ese perfil sigue existiendo Y tenemos su
      // llave. Sin llave no se puede entrar aunque recordemos el id.
      const storedId = readStoredId();
      const remembered = storedId ? list.find((p) => p.id === storedId) : undefined;
      if (remembered && tokens[remembered.id]) {
        if (!(await openProfile(remembered.id, tokens[remembered.id], signal))) return;
        if (signal?.aborted) return;
      }

      // Con una sola marca cuya llave conocemos, no tiene sentido preguntar.
      if (list.length === 1 && tokens[list[0].id]) {
        if (!(await openProfile(list[0].id, tokens[list[0].id], signal))) return;
        if (signal?.aborted) return;
      }

      storeId(null);
      setActiveProfile(null);
      setActiveToken(null);
      setState('choosing');
    },
    [openProfile]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectProfile = useCallback(
    async (id: string, token?: string): Promise<string | null> => {
      const key = token ?? tokensRef.current[id];
      if (!key) return 'Necesitas la llave de acceso de esta marca.';
      return openProfile(id, key);
    },
    [openProfile]
  );

  const registerProfile = useCallback(
    (profile: BrandProfile, token?: string) => {
      if (token) {
        rememberToken(profile.id, token);
        setBrandToken(token);
        setActiveToken(token);
      }
      storeId(profile.id);
      setActiveProfile(profile);
      setProfiles((current) => {
        const summary = { id: profile.id, business_name: profile.business_name };
        const exists = current.some((p) => p.id === profile.id);
        return exists
          ? current.map((p) => (p.id === profile.id ? summary : p))
          : [summary, ...current];
      });
      setState('ready');
    },
    [rememberToken]
  );

  const hasKeyFor = useCallback(
    (id: string) => {
      void tokensVersion; // se re-evalúa cuando cambian las llaves
      return Boolean(tokensRef.current[id]);
    },
    [tokensVersion]
  );

  const reload = useCallback(() => void load(), [load]);

  const value = useMemo(
    () => ({
      state,
      error,
      profiles,
      activeProfile,
      activeToken,
      hasKeyFor,
      selectProfile,
      registerProfile,
      reload,
    }),
    [
      state,
      error,
      profiles,
      activeProfile,
      activeToken,
      hasKeyFor,
      selectProfile,
      registerProfile,
      reload,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
