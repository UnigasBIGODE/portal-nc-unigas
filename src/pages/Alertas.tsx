import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { mensagemErro } from '@/lib/api';
import { fmtData } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useAlertas, useTitulo } from '@/hooks/queries';
import { Card, EmptyState, ErrorState, PageHeader, Pills, Skeleton } from '@/components/ui';
import { AlertaBadge, EtapaBadge } from '@/components/StatusBadges';

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'VERIFICACAO', label: 'Verificação parada' },
  { value: 'ATRASADA', label: 'Atrasadas' },
  { value: 'VENCENDO', label: 'Prazo vencendo' },
  { value: 'NOVA', label: 'Novas' },
] as const;

export default function Alertas() {
  useTitulo('Alertas');
  const { config } = useAuth();
  const q = useAlertas();
  const [tipo, setTipo] = useState<string>('');
  const itens = (q.data?.itens ?? []).filter((a) => !tipo || a.tipo === tipo);

  return (
    <div>
      <PageHeader eyebrow="Monitoramento"
        title="Alertas"
        subtitle={`Verificação c/ Comgás: atenção ≥ ${config?.alertaAtencaoDias ?? 15} dias, crítico ≥ ${config?.alertaCriticoDias ?? 30} dias · prazo vencendo em até ${config?.alertaPrazoDias ?? 5} dias · novas = últimos 7 dias`}
      />
      <Pills
        className="mb-4 w-fit max-w-full"
        label="Tipo de alerta"
        value={tipo}
        onChange={setTipo}
        itens={TIPOS.map((t) => ({ value: t.value, label: t.label, count: (q.data?.itens ?? []).filter((a) => !t.value || a.tipo === t.value).length }))}
      />
      <Card className="anim-fade-up overflow-hidden">
        {q.isError ? (
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : itens.length === 0 ? (
          <EmptyState icon={<BellOff className="h-5 w-5" />} title="Nenhum alerta 🎉" description="Tudo em dia por aqui." />
        ) : (
          <ul className="divide-y divide-line/60">
            {itens.map((a, i) => (
              <motion.li key={`${a.tipo}-${a.nc_id}-${i}`} layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ type: 'spring', stiffness: 380, damping: 30, delay: Math.min(i, 15) * 0.035 }}>
                <Link to={`/ncs/${a.nc_id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-brand/[0.03]">
                  <div className="w-20 shrink-0">
                    <AlertaBadge nivel={a.nivel} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">
                      <span className="tabular">NC {a.nc_id}</span> · {a.titulo}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {a.mensagem} · {a.area} · prazo {fmtData(a.prazo)}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <EtapaBadge etapa={a.etapa} curto />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
