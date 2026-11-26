import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, setToken, type ApiError } from '@/lib/api';
import { guardarSessao, lerSessaoGuardada, limparCacheLocal } from '@/lib/cacheLocal';
import type { ConfigPublica, Sessao, UltimaImportacao, Usuario } from '@/lib/types';

interface AuthCtx {
  usuario: Usuario | null;
  config: ConfigPublica | null;
  ultimaImportacao: UltimaImportacao | null;
  carregando: boolean;
  isAdmin: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarSessao: () => Promise<void>;
  setConfig: (c: ConfigPublica) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // Com login salvo, abre na hora com a sessão da última visita e confirma em segundo plano.
  const [sessao, setSessaoEstado] = useState<Sessao | null>(() => (getToken() ? lerSessaoGuardada() : null));
  const [carregando, setCarregando] = useState(() => !!getToken() && !lerSessaoGuardada());
  const setSessao = useCallback((s: Sessao | null | ((x: Sessao | null) => Sessao | null)) => {
    setSessaoEstado((atual) => {
      const nova = typeof s === 'function' ? s(atual) : s;
      guardarSessao(nova);
      return nova;
    });
  }, []);
  const apagarTudo = useCallback(() => {
    qc.clear();
    limparCacheLocal();
  }, [qc]);

  const atualizarSessao = useCallback(async () => {
    if (!getToken()) {
      setSessao(null);
      setCarregando(false);
      return;
    }
    try {
      setSessao(await api<Sessao>('me'));
    } catch (e) {
      // Sem internet ou servidor lento: mantém a sessão guardada. Sessão inválida: sai.
      if ((e as ApiError)?.code === 'SESSAO_INVALIDA' || !lerSessaoGuardada()) {
        setSessao(null);
        apagarTudo();
      }
    } finally {
      setCarregando(false);
    }
  }, [setSessao, apagarTudo]);

  useEffect(() => {
    atualizarSessao();
    const expirou = () => {
      setSessao(null);
      apagarTudo();
    };
    window.addEventListener('unigas:sessao-expirada', expirou);
    return () => window.removeEventListener('unigas:sessao-expirada', expirou);
  }, [atualizarSessao, setSessao, apagarTudo]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const r = await api<Sessao>('login', { email, senha });
      setToken(r.token ?? null);
      apagarTudo();
      setSessao(r);
    },
    [apagarTudo, setSessao],
  );

  const logout = useCallback(async () => {
    // apaga os dados guardados na hora (o aviso ao servidor pode demorar alguns segundos)
    apagarTudo();
    setSessao(null);
    try {
      await api('logout');
    } catch {
      /* ignora */
    }
    setToken(null);
    limparCacheLocal();
  }, [apagarTudo, setSessao]);

  const value = useMemo<AuthCtx>(
    () => ({
      usuario: sessao?.usuario ?? null,
      config: sessao?.config ?? null,
      ultimaImportacao: sessao?.ultimaImportacao ?? null,
      carregando,
      isAdmin: sessao?.usuario.perfil === 'ADMIN',
      login,
      logout,
      atualizarSessao,
      setConfig: (c) => setSessao((s) => (s ? { ...s, config: c } : s)),
    }),
    [sessao, carregando, login, logout, atualizarSessao, setSessao],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
