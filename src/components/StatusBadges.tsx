import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDashed, Clock, Eye, Hammer, MinusCircle } from 'lucide-react';
import { Badge } from './ui';
import type { Etapa, NivelAlerta, StatusPrazo } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

/** Status sempre com ícone + texto (vermelho da marca ≠ vermelho de "atrasado"). */
export function StatusPrazoBadge({ status, dias }: { status: StatusPrazo; dias?: number }) {
  if (status === 'No prazo')
    return (
      <Badge tom="success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> No prazo
      </Badge>
    );
  if (status === 'Atrasado' || status === 'Fora do prazo')
    return (
      <Badge tom="danger">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {status}
        {dias ? <span className="tabular opacity-80">· {dias}d</span> : null}
      </Badge>
    );
  return (
    <Badge tom="neutral">
      <MinusCircle className="h-3.5 w-3.5" aria-hidden /> {status}
    </Badge>
  );
}

const ETAPA_INFO: Record<Etapa, { rotulo: string; curto: string; icon: typeof Hammer; cls: string }> = {
  'EXECUÇÃO': { rotulo: 'Em execução c/ Unigás', curto: 'Execução', icon: Hammer, cls: 'border-brand/30 bg-brand/12 text-brand' },
  'VERIFICAÇÃO': { rotulo: 'Em verificação c/ Comgás', curto: 'Verificação', icon: Eye, cls: 'border-sky-500/30 bg-sky-500/12 text-sky-500' },
  FINALIZADO: { rotulo: 'Finalizado', curto: 'Finalizado', icon: CheckCircle2, cls: 'border-line bg-elevated text-muted' },
};

export function etapaRotulo(e: Etapa) {
  return ETAPA_INFO[e]?.rotulo ?? e;
}

export function EtapaBadge({ etapa, curto }: { etapa: Etapa; curto?: boolean }) {
  const i = ETAPA_INFO[etapa] ?? { rotulo: etapa, curto: etapa, icon: CircleDashed, cls: '' };
  const Icon = i.icon;
  return (
    <Badge className={i.cls} title={i.rotulo}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {curto ? i.curto : i.rotulo}
    </Badge>
  );
}

export function AlertaBadge({ nivel }: { nivel: NivelAlerta | 'critico' | 'atencao' | 'info' }) {
  if (nivel === 'CRITICO' || nivel === 'critico')
    return (
      <Badge tom="danger">
        <AlertOctagon className="h-3.5 w-3.5" aria-hidden /> Crítico
      </Badge>
    );
  if (nivel === 'ATENCAO' || nivel === 'atencao')
    return (
      <Badge tom="warning">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Atenção
      </Badge>
    );
  if (nivel === 'info')
    return (
      <Badge tom="info">
        <Clock className="h-3.5 w-3.5" aria-hidden /> Novo
      </Badge>
    );
  return null;
}

/** Escala 0–6: barrinhas preenchidas + número; ≥ limite crítico em vermelho. */
export function CriticidadeBadge({ valor, compacto }: { valor: number | null; compacto?: boolean }) {
  const { config } = useAuth();
  if (valor === null || valor === undefined) return <span className="text-muted">—</span>;
  const critico = valor >= (config?.criticidadeCriticaMin ?? 3);
  const rotulo = config?.rotulosCriticidade[valor] ?? String(valor);
  return (
    <span className="inline-flex items-center gap-2" title={`Criticidade ${valor} – ${rotulo}`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className={cn('w-[3px] rounded-full', i <= valor ? (critico ? 'bg-brand' : 'bg-fg/70') : 'bg-line')}
            style={{ height: 4 + i * 1.6 }}
          />
        ))}
      </span>
      <span className={cn('tabular text-[13px] font-semibold', critico && 'text-brand')}>{valor}</span>
      {!compacto && <span className="text-[12px] text-muted">{rotulo}</span>}
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}
