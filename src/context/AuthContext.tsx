import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, setToken } from '@/lib/api';
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
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(!!getToken());

  const atualizarSessao = useCallback(async () => {
    if (!getToken()) {
      setSessao(null);
      setCarregando(false);
      return;
    }
    try {
      setSessao(await api<Sessao>('me'));
    } catch {
      setSessao(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    atualizarSessao();
    const expirou = () => {
      setSessao(null);
      qc.clear();
    };
    window.addEventListener('unigas:sessao-expirada', expirou);
    return () => window.removeEventListener('unigas:sessao-expirada', expirou);
  }, [atualizarSessao, qc]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const r = await api<Sessao>('login', { email, senha });
      setToken(r.token ?? null);
      qc.clear();
      setSessao(r);
    },
    [qc],
  );

  const logout = useCallback(async () => {
    try {
      await api('logout');
    } catch {
      /* ignora */
    }
    setToken(null);
    qc.clear();
    setSessao(null);
  }, [qc]);

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
    [sessao, carregando, login, logout, atualizarSessao],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
