import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, getProfile, setBrandToken, type BrandProfile } from '../api';
import { buildAccessCode, parseAccessCode } from '../lib/access-code';
import {
  readActiveId,
  readKnownBrands,
  toBrandList,
  writeActiveId,
  writeKnownBrands,
} from './brand-storage';
import { ProfileContext, type ProfileState } from './profile-context';

/** Lo que devuelve abrir una marca, para que el llamante sepa qué hacer. */
interface OpenResult {
  /** Mensaje en español, o `null` si entró. */
  message: string | null;
  /** true si el problema fue de red, no de la llave. */
  networkFailure: boolean;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProfileState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState(() => readKnownBrands());
  const [activeProfile, setActiveProfile] = useState<BrandProfile | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  /*
    Las escrituras leen el estado actual de `localStorage` en vez de cerrar
    sobre `brands`. Así no hay cierres obsoletos ni hace falta meter `brands`
    en las dependencias de cada callback — y el almacenamiento sigue siendo la
    única fuente de verdad, no una copia que pueda desincronizarse.
  */
  const rememberBrand = useCallback((id: string, name: string, token: string) => {
    const next = { ...readKnownBrands(), [id]: { name, token } };
    writeKnownBrands(next);
    setBrands(next);
  }, []);

  const forgetBrand = useCallback((id: string) => {
    const { [id]: _removed, ...rest } = readKnownBrands();
    writeKnownBrands(rest);
    setBrands(rest);

    // Si era la activa, se sale de ella: seguir dentro de una marca cuya llave
    // acabamos de tirar dejaría la app en un estado imposible.
    if (readActiveId() === id) {
      writeActiveId(null);
      setBrandToken(null);
      setActiveProfile(null);
      setActiveToken(null);
      setState('choosing');
    }
  }, []);

  const openBrand = useCallback(
    async (id: string, token: string, signal?: AbortSignal): Promise<OpenResult> => {
      try {
        const profile = await getProfile(id, { brandToken: token, signal });
        setBrandToken(token);
        // El nombre se refresca en cada entrada: si lo cambiaron desde otro
        // dispositivo, la lista local deja de estar desactualizada.
        rememberBrand(id, profile.business_name, token);
        writeActiveId(id);
        setActiveProfile(profile);
        setActiveToken(token);
        setState('ready');
        return { message: null, networkFailure: false };
      } catch (failure) {
        if (signal?.aborted) return { message: null, networkFailure: false };

        if (failure instanceof ApiError && failure.status === 403) {
          // La llave dejó de valer: guardarla solo repetiría el error en cada
          // recarga.
          forgetBrand(id);
          return {
            message: 'Esa llave ya no abre esta marca. Puede que se haya rotado.',
            networkFailure: false,
          };
        }
        if (failure instanceof ApiError && failure.status === 404) {
          forgetBrand(id);
          return { message: 'Esa marca ya no existe.', networkFailure: false };
        }
        return {
          message:
            failure instanceof ApiError ? failure.message : 'No se pudo abrir la marca.',
          networkFailure: true,
        };
      }
    },
    [forgetBrand, rememberBrand]
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null);
      const known = readKnownBrands();
      setBrands(known);

      const ids = Object.keys(known);

      /*
        Sin marcas conocidas no se toca la red: la app abre al instante en el
        inicio. Antes había que preguntar al servidor qué marcas existían
        incluso para descubrir que este navegador no conocía ninguna.
      */
      if (ids.length === 0) {
        setState('choosing');
        return;
      }

      const lastId = readActiveId();
      const target =
        lastId && known[lastId] ? lastId : ids.length === 1 ? ids[0] : null;

      // Varias marcas conocidas y ninguna recordada: que elija.
      if (!target) {
        setState('choosing');
        return;
      }

      setState('loading');
      const result = await openBrand(target, known[target].token, signal);
      if (signal?.aborted) return;

      if (result.networkFailure) {
        setError(result.message);
        setState('error');
      } else if (result.message) {
        // La marca se olvidó (llave inválida o borrada): al inicio.
        setState('choosing');
      }
    },
    [openBrand]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const enterBrand = useCallback(
    async (profileId: string): Promise<string | null> => {
      const known = readKnownBrands()[profileId];
      if (!known) return 'Este navegador no recuerda la llave de esa marca.';
      return (await openBrand(profileId, known.token)).message;
    },
    [openBrand]
  );

  const enterWithCode = useCallback(
    async (code: string): Promise<string | null> => {
      const parsed = parseAccessCode(code);
      if (!parsed) {
        return 'Ese código no tiene el formato correcto. Cópialo entero, tal como te lo dimos.';
      }
      return (await openBrand(parsed.profileId, parsed.token)).message;
    },
    [openBrand]
  );

  const registerProfile = useCallback(
    (profile: BrandProfile, token?: string) => {
      // Al actualizar no llega llave: se conserva la que ya se conocía, y de
      // paso se refresca el nombre por si cambió.
      const finalToken = token ?? readKnownBrands()[profile.id]?.token;
      if (finalToken) {
        rememberBrand(profile.id, profile.business_name, finalToken);
        setBrandToken(finalToken);
        setActiveToken(finalToken);
      }
      writeActiveId(profile.id);
      setActiveProfile(profile);
      setState('ready');
    },
    [rememberBrand]
  );

  const reload = useCallback(() => void load(), [load]);

  const knownBrands = useMemo(() => toBrandList(brands), [brands]);
  const activeCode = useMemo(
    () =>
      activeProfile && activeToken
        ? buildAccessCode(activeProfile.id, activeToken)
        : null,
    [activeProfile, activeToken]
  );

  const value = useMemo(
    () => ({
      state,
      error,
      knownBrands,
      activeProfile,
      activeToken,
      activeCode,
      enterBrand,
      enterWithCode,
      registerProfile,
      forgetBrand,
      reload,
    }),
    [
      state,
      error,
      knownBrands,
      activeProfile,
      activeToken,
      activeCode,
      enterBrand,
      enterWithCode,
      registerProfile,
      forgetBrand,
      reload,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
