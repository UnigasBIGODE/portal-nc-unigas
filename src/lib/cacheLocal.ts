/**
 * Guarda no navegador a última versão dos dados de cada tela (React Query) e da sessão.
 * Ao abrir o portal, as telas aparecem na hora com esses dados e se atualizam sozinhas
 * em segundo plano. Tudo é apagado ao sair, ao trocar de usuário e quando a sessão expira.
 */
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { removeOldestQuery } from '@tanstack/react-query-persist-client';
import type { Sessao } from './types';

const CHAVE_DADOS = 'unigas_cache_dados';
const CHAVE_SESSAO = 'unigas_cache_sessao';

/** Mude quando o formato dos dados mudar: descarta caches antigos. */
export const VERSAO_CACHE = 'v1.7.1';
/** Dados com mais de 7 dias não são mostrados. */
export const IDADE_MAXIMA_CACHE = 7 * 24 * 60 * 60 * 1000;
/** Telas que não vale a pena guardar (grandes ou sensíveis). */
const NAO_GUARDAR = new Set(['auditoria', 'importacoes', 'palette']);

export const persistidor = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: CHAVE_DADOS,
  throttleTime: 1500,
  retry: removeOldestQuery, // se lotar o espaço do navegador, descarta as telas mais antigas
});

export function deveGuardar(chave: readonly unknown[], status: string) {
  return status === 'success' && !NAO_GUARDAR.has(String(chave[0]));
}

export function lerSessaoGuardada(): Sessao | null {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
    return s && s.v === VERSAO_CACHE ? (s.sessao as Sessao) : null;
  } catch {
    return null;
  }
}

export function guardarSessao(sessao: Sessao | null) {
  try {
    if (!sessao) localStorage.removeItem(CHAVE_SESSAO);
    else {
      // o token já fica guardado à parte; não precisa duplicar
      const { token: _t, ...resto } = sessao as Sessao & { token?: string };
      void _t;
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ v: VERSAO_CACHE, sessao: resto }));
    }
  } catch {
    /* sem espaço ou navegação privada: segue sem cache */
  }
}

/** Apaga tudo o que foi guardado (sair, trocar de usuário, sessão expirada). */
export function limparCacheLocal() {
  try {
    localStorage.removeItem(CHAVE_DADOS);
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* ignora */
  }
}
