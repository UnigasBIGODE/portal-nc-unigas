import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Alertas, OpcoesFiltro } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export function useOpcoesFiltro() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ['opcoesFiltro', usuario?.id],
    queryFn: () => api<OpcoesFiltro>('opcoesFiltro'),
    staleTime: 10 * 60_000,
    enabled: !!usuario,
  });
}

export function useAlertas() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ['alertas', usuario?.id],
    queryFn: () => api<Alertas>('alertas'),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    enabled: !!usuario,
  });
}

export function useDebounce<T>(valor: T, ms = 400) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} · Portal de NCs Unigás`;
  }, [titulo]);
}

/** Anima um número do valor anterior (ou 0) até o novo valor, com easing suave. */
export function useCountUp(alvo: number | null | undefined, duracao = 1100) {
  const [v, setV] = useState(0);
  const atual = useRef(0);
  useEffect(() => {
    if (alvo === null || alvo === undefined || isNaN(alvo)) return;
    const reduz = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduz) {
      atual.current = alvo;
      setV(alvo);
      return;
    }
    let raf = 0;
    const inicio = performance.now();
    const de = atual.current;
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao);
      const e = 1 - Math.pow(1 - p, 4);
      const x = de + (alvo - de) * e;
      atual.current = x;
      setV(x);
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, duracao]);
  return v;
}
