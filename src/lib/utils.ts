import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { FiltrosNC } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2026-03-10T14:22:00" → "10/03/2026" (sem conversão de fuso: o servidor já envia em America/Sao_Paulo). */
export function fmtData(iso?: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function fmtDataHora(iso?: string | null): string {
  if (!iso) return '—';
  return `${fmtData(iso)} ${iso.slice(11, 16)}`;
}

export function fmtNum(n?: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('pt-BR');
}

export function fmtPct(n?: number | null, casas = 1): string {
  if (n === null || n === undefined) return '—';
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const NOMES_MESES = MESES;

export function primeiroNome(nome: string) {
  return nome.split(/\s+/)[0] ?? nome;
}

export function iniciais(nome: string) {
  const p = nome.replace(/[–-]/g, ' ').split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/** Remove chaves vazias de um objeto de filtros. */
export function limparFiltros(f: FiltrosNC): FiltrosNC {
  const o: Record<string, string> = {};
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') o[k] = String(v);
  });
  return o as FiltrosNC;
}

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
