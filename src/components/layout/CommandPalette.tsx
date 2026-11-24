import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, FileText, Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { ListaNCs } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/queries';
import { useAuth } from '@/context/AuthContext';
import { ADMIN, MENU } from './navegacao';
import { StatusPrazoBadge } from '../StatusBadges';

interface Opcao { id: string; grupo: string; titulo: string; sub?: string; icone: typeof Search; ir: string; extra?: React.ReactNode }

/** Busca rápida (Ctrl+K / ⌘K): páginas e NCs, navegável pelo teclado. */
export function CommandPalette({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [termo, setTermo] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const busca = useDebounce(termo.trim(), 250);

  const ncs = useQuery({
    queryKey: ['palette', busca],
    queryFn: () => api<ListaNCs>('listarNCs', { filtros: { busca }, pageSize: 6 }),
    enabled: aberto && busca.length >= 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (aberto) {
      setTermo('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [aberto]);

  const opcoes = useMemo<Opcao[]>(() => {
    const t = termo.toLowerCase();
    const paginas = [...MENU, ...(isAdmin ? ADMIN : [])]
      .filter((m) => !t || m.label.toLowerCase().includes(t))
      .map((m) => ({ id: m.to, grupo: 'Páginas', titulo: m.label, icone: m.icon, ir: m.to }));
    const lista = (busca.length >= 2 ? ncs.data?.itens ?? [] : []).map((n) => ({
      id: 'nc' + n.nc_id,
      grupo: 'Não conformidades',
      titulo: `NC ${n.nc_id} · ${n.titulo}`,
      sub: `${n.area} · ${n.etapa}`,
      icone: FileText,
      ir: `/ncs/${n.nc_id}`,
      extra: <StatusPrazoBadge status={n.status_prazo} />,
    }));
    return [...lista, ...paginas.slice(0, lista.length ? 4 : 12)];
  }, [termo, busca, ncs.data, isAdmin]);

  useEffect(() => setSel(0), [opcoes.length]);

  function escolher(o?: Opcao) {
    if (!o) return;
    fechar();
    navigate(o.ir);
  }

  let grupoAnterior = '';
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
      initial={false}
      animate={aberto ? { opacity: 1, pointerEvents: 'auto', visibility: 'visible' } : { opacity: 0, pointerEvents: 'none', transitionEnd: { visibility: 'hidden' } }}
      transition={{ duration: 0.18 }}
      aria-hidden={!aberto}
    >
          <div className="absolute inset-0 bg-[#0B0B0D]/35 backdrop-blur-[3px]" onClick={fechar} />
          <motion.div
            role="dialog"
            aria-label="Busca rápida"
            initial={false}
            animate={aberto ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
            className="relative w-full max-w-[620px] overflow-hidden rounded-[20px] border border-line bg-card shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              {ncs.isFetching ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : <Search className="h-5 w-5 text-muted" />}
              <input
                ref={input}
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, opcoes.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                  if (e.key === 'Enter') escolher(opcoes[sel]);
                  if (e.key === 'Escape') fechar();
                }}
                placeholder="Buscar NC por número, endereço ou descrição, ou ir para uma página…"
                className="h-14 flex-1 bg-transparent text-[15px] placeholder:text-muted/80 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Buscar"
              />
              <kbd className="rounded-md border border-line bg-elevated px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
            </div>
            <ul className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
              {opcoes.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">{busca.length >= 2 && ncs.isFetching ? 'Buscando…' : 'Nada encontrado.'}</li>}
              {aberto && opcoes.map((o, i) => {
                const cab = o.grupo !== grupoAnterior;
                grupoAnterior = o.grupo;
                const ativo = i === sel;
                return (
                  <li key={o.id}>
                    {cab && <p className="label-xs px-3 pb-1.5 pt-3">{o.grupo}</p>}
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 8) * 0.025 }}
                      onMouseMove={() => setSel(i)}
                      onClick={() => escolher(o)}
                      role="option"
                      aria-selected={ativo}
                      className={cn('lg-track relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', ativo ? 'text-fg' : 'text-fg/80')}
                    >
                      {ativo && <motion.span layoutId="palette-sel" className="lg-glass rounded-xl" transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.7 }} />}
                      <span className={cn('relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-card', ativo && 'border-brand/30 text-brand')}>
                        <o.icone className="h-4 w-4" />
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{o.titulo}</span>
                        {o.sub && <span className="block truncate text-[12px] text-muted">{o.sub}</span>}
                      </span>
                      <span className="relative hidden sm:block">{o.extra}</span>
                      {ativo ? <CornerDownLeft className="relative h-4 w-4 text-muted" /> : <ArrowRight className="relative h-4 w-4 text-transparent" />}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 border-t border-line bg-elevated/50 px-5 py-2.5 text-[12px] text-muted">
              <span><kbd className="font-sans">↑ ↓</kbd> navegar</span>
              <span><kbd className="font-sans">Enter</kbd> abrir</span>
              <span className="ml-auto">Portal de NCs · Unigás</span>
            </div>
          </motion.div>
    </motion.div>
  );
}
