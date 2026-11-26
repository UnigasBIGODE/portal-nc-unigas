/**
 * Depois que o portal abre, deixa as telas principais prontas em segundo plano:
 * baixa o código de cada aba e busca os dados que elas mostram primeiro.
 * Assim, ao clicar no menu, a tela já aparece preenchida.
 */
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';

const telas = [
  () => import('../pages/ListaNCs'),
  () => import('../pages/DetalheNC'),
  () => import('../pages/PorArea'),
  () => import('../pages/RelatorioMensal'),
  () => import('../pages/Alertas'),
  () => import('../pages/Conta'),
];
const telasAdmin = [() => import('../pages/admin/Pendencias'), () => import('../pages/admin/Classificacao'), () => import('../pages/admin/Consolidado')];

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
let feito = false;

export async function preCarregarTelas(qc: QueryClient, admin: boolean) {
  if (feito) return;
  feito = true;
  for (const t of [...telas, ...(admin ? telasAdmin : [])]) await t().catch(() => {});
  const ano = new Date().getFullYear();
  const dados: [unknown[], () => Promise<unknown>][] = [
    [['ncs', {}, 1, undefined], () => api('listarNCs', { filtros: {}, page: 1, pageSize: 25, ordem: undefined })],
    [['resumoPorArea', ano], () => api('resumoPorArea', { ano })],
    [['relatorio', ano, ''], () => api('relatorioMensal', { ano, filtros: {} })],
  ];
  if (admin) dados.push([['pendencias'], () => api('pendencias')]);
  // um de cada vez, com folga, para não disputar com o que a pessoa está fazendo
  for (const [queryKey, queryFn] of dados) {
    await pausa(700);
    await qc.prefetchQuery({ queryKey, queryFn, staleTime: 2 * 60_000 }).catch(() => {});
  }
}
