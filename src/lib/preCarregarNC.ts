/**
 * Abertura rápida de NCs: pré-carrega o detalhe ao passar o mouse/tocar na linha
 * e permite montar a tela na hora com os dados que já vieram na lista.
 */
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { DetalheNC, NC } from './types';

export const chaveNC = (id: string | number) => ['nc', String(id)];
const buscarDetalhe = (id: string | number) => api<DetalheNC>('detalheNC', { nc_id: Number(id) });
export { buscarDetalhe };

let carregouTela = false;
const pedidos = new Set<string>();

export function preCarregarNC(qc: QueryClient, id: string | number) {
  if (!carregouTela) {
    carregouTela = true;
    void import('../pages/DetalheNC'); // código da tela também já fica pronto
  }
  const k = String(id);
  if (pedidos.has(k)) return;
  pedidos.add(k);
  void qc.prefetchQuery({ queryKey: chaveNC(k), queryFn: () => buscarDetalhe(k), staleTime: 30_000 }).finally(() => setTimeout(() => pedidos.delete(k), 30_000));
}

/** Procura a NC nas listas já carregadas (lista de NCs, alertas, pendências...). */
export function ncDasListas(qc: QueryClient, id: string | number): NC | null {
  const alvo = Number(id);
  for (const [, dados] of qc.getQueriesData<unknown>({ queryKey: ['ncs'] })) {
    const itens = (dados as { itens?: NC[] } | undefined)?.itens;
    const n = itens?.find((x) => Number(x.nc_id) === alvo);
    if (n) return n;
  }
  return null;
}

/** Detalhe provisório (só com o que a lista já tem): ações ficam ocultas até chegar o completo. */
export function detalheProvisorio(n: NC): DetalheNC & { provisorio: true } {
  const x = n as NC & { descricao_resumo?: string };
  return {
    nc: { ...n, descricao: n.descricao ?? x.descricao_resumo ?? '', plano_acao: n.plano_acao ?? '' },
    comentarios: [],
    anexos: [],
    historico: [],
    podeEditarPlano: false,
    podeEditarTudo: false,
    provisorio: true,
  };
}
