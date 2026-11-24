import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Users } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import type { ResumoArea } from '@/lib/types';
import { cn, fmtPct } from '@/lib/utils';
import { useOpcoesFiltro, useTitulo } from '@/hooks/queries';
import { NumeroAnimado } from '@/components/KpiCard';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton } from '@/components/ui';

function Mini({ rotulo, valor, tom }: { rotulo: string; valor: number | string; tom?: 'danger' | 'brand' }) {
  return (
    <div className="rounded-xl bg-elevated px-3 py-2 transition-colors duration-300 group-hover:bg-elevated/70">
      <p className="text-[11px] text-muted">{rotulo}</p>
      <p className={cn('tabular text-lg font-semibold', tom === 'danger' && 'text-danger', tom === 'brand' && 'text-brand')}>{valor}</p>
    </div>
  );
}

export function CardArea({ a, meta, onClick, indice = 0 }: { a: ResumoArea; meta: number; onClick: () => void; indice?: number }) {
  const atingiu = a.pctNoPrazo !== null && a.pctNoPrazo >= meta;
  return (
    <Card tilt className="anim-fade-up group flex min-w-0 flex-col" style={{ ['--d' as string]: `${indice * 70}ms` }}>
      <button onClick={onClick} className="flex h-full min-w-0 flex-col p-4 text-left sm:p-5" aria-label={`Abrir NCs da área ${a.area}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn('truncate text-[16px] font-semibold', a.area === 'A classificar' && 'text-warning')}>{a.area}</h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted">
              <Users className="h-3 w-3 shrink-0" /> {a.responsaveis.length ? a.responsaveis.join(', ') : 'Sem responsável'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="tabular text-[40px] font-bold leading-none tracking-tight">
            <NumeroAnimado valor={a.totalAberto} />
          </span>
          <span className="pb-1 text-[13px] text-muted">abertas</span>
          {a.atrasadas > 0 && (
            <Badge tom="danger" className="mb-1 ml-auto">
              <AlertTriangle className="h-3 w-3" /> {a.atrasadas} atrasada(s)
            </Badge>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Mini rotulo="Em execução" valor={a.execucao} />
          <Mini rotulo="Em verificação" valor={a.verificacao} />
          <Mini rotulo="Exec. crítica no prazo" valor={a.execCriticaNoPrazo} />
          <Mini rotulo="Exec. crítica atrasada" valor={a.execCriticaAtrasada} tom={a.execCriticaAtrasada ? 'danger' : undefined} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted">Encerradas no prazo ({a.encerradasAno})</span>
            <span className={cn('tabular font-semibold', a.pctNoPrazo === null ? 'text-muted' : atingiu ? 'text-success' : 'text-danger')}>{fmtPct(a.pctNoPrazo, 0)}</span>
          </div>
          <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
            <div className={cn('anim-grow-x h-full rounded-full', atingiu ? 'bg-success' : 'bg-brand')} style={{ width: `${a.pctNoPrazo ?? 0}%`, ['--d' as string]: `${300 + indice * 70}ms` }} />
            <div className="absolute top-0 h-full w-[2px] bg-fg/60" style={{ left: `${meta}%` }} title={`Meta ${meta}%`} />
          </div>
        </div>
      </button>
    </Card>
  );
}

export default function PorArea() {
  useTitulo('Por Área');
  const navigate = useNavigate();
  const { data: op } = useOpcoesFiltro();
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const q = useQuery({ queryKey: ['resumoPorArea', ano], queryFn: () => api<{ ano: number; areas: ResumoArea[]; metaPct: number }>('resumoPorArea', { ano }) });

  return (
    <div>
      <PageHeader eyebrow="Gestão"
        title="Visão por área"
        subtitle="Clique em uma área para ver a lista de NCs"
        actions={
          <Select className="h-9 w-32 rounded-full text-[13px]" value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano do % no prazo">
            {(op?.anos ?? [ano]).map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        }
      />
      {q.isError ? (
        <Card>
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        </Card>
      ) : !q.data ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : q.data.areas.length === 0 ? (
        <Card>
          <EmptyState title="Nenhuma área vinculada" description="Peça ao administrador para vincular suas áreas." />
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.areas.map((a, i) => (
            <CardArea key={a.area} indice={i} a={a} meta={q.data.metaPct} onClick={() => navigate(`/ncs?area=${encodeURIComponent(a.area)}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
