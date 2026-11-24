import { useId, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, Skeleton } from './ui';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/queries';

/** Número que "conta" até o valor final. */
export function NumeroAnimado({ valor, casas = 0, sufixo = '' }: { valor: number | null | undefined; casas?: number; sufixo?: string }) {
  const v = useCountUp(valor ?? 0);
  if (valor === null || valor === undefined) return <>—</>;
  return (
    <>
      {v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}
      {sufixo}
    </>
  );
}

const TONS = {
  neutral: 'bg-elevated text-fg/70 ring-line',
  brand: 'bg-brand/[0.08] text-brand ring-brand/15',
  danger: 'bg-danger/[0.08] text-danger ring-danger/15',
  success: 'bg-success/10 text-success ring-success/15',
  info: 'bg-info/10 text-info ring-info/15',
};

export function KpiCard({
  label,
  numero,
  casas = 0,
  sufixo = '',
  icon,
  hint,
  delta,
  deltaSufixo = 'p.p. vs mês anterior',
  tom = 'neutral',
  barra,
  onClick,
  indice = 0,
  serie,
  vidro,
  destaque,
}: {
  label: string;
  numero: number | null | undefined;
  casas?: number;
  sufixo?: string;
  icon?: ReactNode;
  hint?: ReactNode;
  delta?: number | null;
  deltaSufixo?: string;
  tom?: keyof typeof TONS;
  /** Barra de progresso (0–100) com marcador de meta opcional. */
  barra?: { valor: number; meta?: number; cor?: string };
  onClick?: () => void;
  indice?: number;
  /** Minigráfico de tendência. */
  serie?: (number | null)[];
  /** Estilo de vidro (dashboard). */
  vidro?: boolean;
  /** Cartão principal em vermelho Unigás (com `vidro`). */
  destaque?: boolean;
}) {
  const Comp = onClick ? 'button' : 'div';
  const branco = vidro && destaque;
  const conteudo = (
    <>
      <span
        className={cn('pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100', tom === 'danger' || tom === 'brand' ? 'bg-brand/15' : 'bg-fg/5')}
        aria-hidden
      />
      <Comp onClick={onClick} className="relative flex h-full w-full flex-col p-5 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-[13px] font-medium', branco ? 'text-white/85' : vidro ? 'font-semibold text-[var(--vg-muted)]' : 'text-muted')}>{label}</span>
          {icon && (vidro ? <span className={cn('vg-chip h-9 w-9 transition-transform duration-300 group-hover:scale-110', !branco && TONS[tom].split(' ')[1])}>{icon}</span> : <span className={cn('grid h-9 w-9 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110', TONS[tom])}>{icon}</span>)}
        </div>
        <div className={cn('tabular mt-3 font-bold leading-none', vidro ? 'text-[clamp(30px,2.6vw,40px)] font-[820] tracking-[-0.052em]' : 'text-[38px] tracking-tight', branco ? 'text-white' : tom === 'danger' && numero ? 'text-danger' : vidro ? 'text-[var(--vg-ink)]' : 'text-fg')}>
          <NumeroAnimado valor={numero} casas={casas} sufixo={sufixo} />
        </div>
        {serie && serie.filter((x) => x !== null).length > 1 && <Sparkline serie={serie} tom={branco ? 'branco' : tom} atraso={0.4 + indice * 0.07} />}
        {barra && (
          <div className={cn('relative mt-4 h-1.5 overflow-hidden rounded-full', vidro ? 'bg-[var(--vg-track)]' : 'bg-elevated')}>
            <div className={cn('anim-grow-x h-full rounded-full', barra.cor ?? 'bg-brand')} style={{ width: `${Math.min(100, Math.max(0, barra.valor))}%`, ['--d' as string]: `${300 + indice * 70}ms` }} />
            {barra.meta !== undefined && <div className="absolute top-0 h-full w-0.5 bg-fg/50" style={{ left: `${barra.meta}%` }} title={`Meta ${barra.meta}%`} />}
          </div>
        )}
        <div className={cn('mt-3 flex min-h-[22px] flex-wrap items-center gap-2 text-[12px]', branco ? 'text-white/80' : vidro ? 'font-medium text-[var(--vg-muted)]' : 'text-muted')}>
          {delta !== undefined && delta !== null && (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold',
                  delta >= 0 ? 'bg-success/10 text-success' : 'bg-danger/[0.08] text-danger',
                )}
              >
                {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-label="subiu" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-label="caiu" />}
                {Math.abs(delta).toLocaleString('pt-BR')}
              </span>
              <span>{deltaSufixo}</span>
            </>
          )}
          {hint}
        </div>
      </Comp>
    </>
  );
  if (vidro)
    return (
      <div data-vg-entra className={cn('group relative overflow-hidden transition-transform duration-300 hover:-translate-y-0.5', branco ? 'vg-destaque' : 'vg-painel')}>
        {conteudo}
      </div>
    );
  return (
    <Card tilt className="anim-fade-up group relative overflow-hidden" style={{ '--d': `${indice * 70}ms` } as CSSProperties}>
      {conteudo}
    </Card>
  );
}

export function KpiSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-10 w-20" />
      <Skeleton className="mt-4 h-4 w-32" />
    </Card>
  );
}

/** Minigráfico SVG com linha desenhada e área em degradê (animados). */
export function Sparkline({ serie, tom = 'neutral', atraso = 0 }: { serie: (number | null)[]; tom?: string; atraso?: number }) {
  const id = useId().replace(/:/g, '');
  const vals = serie.map((v) => v ?? 0);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const W = 200, H = 40;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * W, H - 3 - ((v - min) / (max - min || 1)) * (H - 8)]);
  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${linha} L${W},${H} L0,${H} Z`;
  const cor = tom === 'branco' ? '#ffffff' : tom === 'success' ? 'rgb(var(--success))' : tom === 'info' ? 'rgb(var(--info))' : 'rgb(var(--brand))';
  const ultimo = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-10 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity={0.22} />
          <stop offset="100%" stopColor={cor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: atraso + 0.5, duration: 0.6 }} />
      <path
        d={linha}
        fill="none"
        stroke={cor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1}
        style={{ animation: `draw 1.2s cubic-bezier(0.2,0.8,0.2,1) ${atraso}s forwards` }}
      />
      <motion.circle cx={ultimo[0]} cy={ultimo[1]} r={3} fill={cor} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: atraso + 1.1, type: 'spring' }} />
    </svg>
  );
}
