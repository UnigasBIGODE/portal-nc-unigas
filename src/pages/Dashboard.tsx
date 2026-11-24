import { useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList, Eye, Hammer, Sparkles, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api, mensagemErro } from '@/lib/api';
import type { Dashboard as DashboardT, FiltrosNC } from '@/lib/types';
import { cn, fmtDataHora, fmtPct, limparFiltros, primeiroNome } from '@/lib/utils';
import { Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { KpiCard, KpiSkeleton, NumeroAnimado } from '@/components/KpiCard';
import { FiltrosBar, type Periodo } from '@/components/FiltrosBar';
import { NcTable } from '@/components/NcTable';
import { AbertasPorAreaChart, CadastradasChart, CriticidadeChart, EncerradasPorMesChart, GerenciaChart } from '@/components/charts/Charts';
import { useTitulo } from '@/hooks/queries';

gsap.registerPlugin(useGSAP);

/** Painel de vidro (baseado no Glassy Dashboard). */
function ChartCard({ title, description, children, className, carregando, acao }: { title: string; description?: string; children: ReactNode; className?: string; carregando?: boolean; atraso?: number; acao?: ReactNode }) {
  return (
    <section data-vg-entra className={cn('vg-painel h-full', className)}>
      <CardHeader title={title} description={description} action={acao} />
      <div className="p-5 pt-4">{carregando ? <Skeleton className="h-[240px]" /> : children}</div>
    </section>
  );
}

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Frase que aparece palavra por palavra. */
function Frase({ partes, className }: { partes: { t: string; cls?: string }[]; className?: string }) {
  let n = 0;
  return (
    <p className={className} aria-label={partes.map((p) => p.t).join('')}>
      {partes.map((p, i) => (
        <span key={i} className={p.cls} aria-hidden>
          {p.t.split(/(\s+)/).map((w, j) =>
            /^\s+$/.test(w) ? (
              w
            ) : (
              <motion.span
                key={j}
                className="inline-block"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.25 + n++ * 0.045, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {w}
              </motion.span>
            ),
          )}
        </span>
      ))}
    </p>
  );
}

/** Faixa de destaque com o resumo do momento (o "o que eu preciso saber hoje"). */
function Destaque({ d, irLista }: { d: DashboardT; irLista: (p: Record<string, string>) => void }) {
  const k = d.kpis;
  const criticas = d.atencao.filter((n) => n.nivel_alerta === 'CRITICO').length;
  const ok = k.atrasadas === 0;
  const meta = d.metaPct;
  const pct = k.pctNoPrazoMes;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
      className="vg-painel relative mb-6 overflow-hidden p-6 sm:p-7"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden" aria-hidden>
        <span className="anim-varrer block h-full w-1/4 bg-gradient-to-r from-transparent via-brand to-transparent" />
      </div>
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/[0.09] blur-3xl anim-float-a" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 right-40 h-60 w-60 rounded-full bg-fg/[0.04] blur-3xl anim-float-b" aria-hidden />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-60 md:block"
        style={{ backgroundImage: 'radial-gradient(rgb(var(--fg) / 0.06) 1px, transparent 1px)', backgroundSize: '18px 18px', maskImage: 'linear-gradient(to left, black, transparent)' }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', ok ? 'bg-success/10 text-success' : 'bg-brand/[0.08] text-brand')}>
            <Sparkles className="h-3.5 w-3.5" /> Resumo de hoje
          </span>
          <Frase
            className="mt-3 text-[20px] font-semibold leading-snug tracking-tight sm:text-[22px]"
            partes={
              ok
                ? [{ t: `Nenhuma NC atrasada. Todas as ${k.abertas} NCs abertas estão dentro do prazo. 🎉` }]
                : [
                    { t: 'Você tem ' },
                    { t: `${k.atrasadas} NC${k.atrasadas > 1 ? 's' : ''} atrasada${k.atrasadas > 1 ? 's' : ''}`, cls: 'text-danger' },
                    { t: criticas > 0 ? `, ${criticas} em nível crítico, entre ${k.abertas} abertas.` : ` entre ${k.abertas} abertas.` },
                  ]
            }
          />
          <p className="mt-2 text-[14px] text-muted">
            {pct === null ? (
              <>Nenhuma NC encerrada em {k.mesReferenciaRotulo}.</>
            ) : (
              <>
                Em {k.mesReferenciaRotulo}, <b className="text-fg">{fmtPct(pct, 0)}</b> das NCs foram encerradas no prazo, {pct >= meta ? 'acima' : 'abaixo'} da meta de {meta}%.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!ok && (
            <Button variant="brand" className="group" onClick={() => irLista({ aba: 'atrasadas' })}>
              Ver atrasadas <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
          <Button variant="secondary" onClick={() => irLista({ aba: 'verificacao' })}>
            Em verificação ({k.verificacao})
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  useTitulo('Dashboard');
  const { usuario, config, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosNC>({});
  const [periodo, setPeriodo] = useState<Periodo>({});

  const q = useQuery({
    queryKey: ['dashboard', filtros, periodo],
    queryFn: () => api<DashboardT>('dashboard', { filtros: limparFiltros(filtros), ...periodo }),
    placeholderData: keepPreviousData,
  });
  const d = q.data;
  const k = d?.kpis;
  const irLista = (params: Record<string, string>) => navigate(`/ncs?${new URLSearchParams({ ...limparFiltros(filtros), ...params } as Record<string, string>)}`);
  const mesRef = k ? Number(k.mesReferencia.slice(5, 7)) : 12;
  const seriePct = d?.encerradasPorMes.slice(0, mesRef).map((m) => m.pct);
  const serieCad = d?.cadastradasPorMes.map((m) => m.total);

  // Entrada em cascata dos painéis, como no Glassy Dashboard (uma vez, quando os dados chegam).
  const palco = useRef<HTMLDivElement>(null);
  const carregado = !!d;
  useGSAP(
    () => {
      if (!carregado || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(palco.current, { filter: 'blur(5px)', opacity: 0.6 }, { filter: 'blur(0px)', opacity: 1, duration: 0.32, clearProps: 'filter,opacity' }, 0);
      tl.from('[data-vg-entra]', { y: 18, opacity: 0, stagger: 0.045, duration: 0.5, clearProps: 'transform,opacity' }, 0.035);
    },
    { scope: palco, dependencies: [carregado] },
  );

  return (
    <>
      <div ref={palco}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-brand">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="vg-titulo mt-2">
            {saudacao()}, {primeiroNome(usuario?.nome ?? '')}{' '}
            <motion.span className="inline-block origin-[70%_70%]" animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }} transition={{ duration: 1.6, delay: 0.6 }}>
              👋
            </motion.span>
          </h1>
          <p className="mt-2 text-[13px] font-medium text-[var(--vg-muted)]">
            {d?.ultimaImportacao?.data ? <>Dados atualizados em {fmtDataHora(d.ultimaImportacao.data)}</> : 'Nenhuma importação registrada ainda'}
            {!isAdmin && usuario && <> · Suas áreas: {usuario.areas.join(', ') || '—'}</>}
          </p>
        </div>
        <span className="vg-segmento inline-flex shrink-0 items-center gap-2 self-start rounded-full px-3.5 py-2 text-[12px] font-bold sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="anim-ping absolute inline-flex h-full w-full rounded-full bg-success" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Sistema online
        </span>
      </header>

      {q.isError && !d ? (
        <Card>
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        </Card>
      ) : (
        <>
          {d ? <Destaque d={d} irLista={irLista} /> : <Skeleton className="mb-6 h-40 rounded-[20px]" />}

          <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <FiltrosBar valor={filtros} onChange={setFiltros} periodo={periodo} onPeriodo={setPeriodo} />
          </motion.div>

          <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
            {!k ? (
              Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
            ) : (
              <>
                <KpiCard vidro destaque indice={0} label="NCs abertas" numero={k.abertas} icon={<ClipboardList className="h-4 w-4" />} serie={serieCad} hint="cadastros nos últimos 12 meses" onClick={() => irLista({ aba: 'abertas' })} />
                <KpiCard vidro indice={1} label="Em execução c/ Unigás" numero={k.execucao} icon={<Hammer className="h-4 w-4" />} tom="brand" hint="ação da Unigás" barra={{ valor: k.abertas ? (k.execucao / k.abertas) * 100 : 0 }} onClick={() => irLista({ aba: 'execucao' })} />
                <KpiCard vidro indice={2} label="Em verificação c/ Comgás" numero={k.verificacao} icon={<Eye className="h-4 w-4" />} tom="info" hint="aguardando a Comgás" barra={{ valor: k.abertas ? (k.verificacao / k.abertas) * 100 : 0, cor: 'bg-info' }} onClick={() => irLista({ aba: 'verificacao' })} />
                <KpiCard
                  vidro
                  indice={3}
                  label="Atrasadas"
                  numero={k.atrasadas}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  tom={k.atrasadas ? 'danger' : 'success'}
                  barra={{ valor: k.abertas ? (k.atrasadas / k.abertas) * 100 : 0, cor: 'bg-danger' }}
                  hint={k.abertas ? `${Math.round((k.atrasadas / k.abertas) * 100)}% das abertas` : undefined}
                  onClick={() => irLista({ aba: 'atrasadas' })}
                />
                <KpiCard
                  vidro
                  indice={4}
                  label="% encerradas no prazo"
                  numero={k.pctNoPrazoMes === null ? null : Math.round(k.pctNoPrazoMes)}
                  sufixo="%"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tom="success"
                  delta={k.variacaoPct}
                  serie={seriePct}
                  hint={k.variacaoPct === null ? `${k.mesReferenciaRotulo} · ${k.encerradasMes} encerrada(s)` : undefined}
                />
                <KpiCard vidro indice={5} label="Média de dias de atraso" numero={k.mediaDiasAtraso} casas={1} icon={<Timer className="h-4 w-4" />} hint="entre as abertas atrasadas" />
              </>
            )}
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-5">
            <ChartCard
              className="xl:col-span-3"
              title="Encerradas por mês"
              description={`No prazo × fora do prazo em ${k?.mesReferencia.slice(0, 4) ?? ''} · a linha mostra o % no prazo`}
              carregando={!d}
              acao={
                d && (
                  <div className="text-right">
                    <p className="tabular text-[22px] font-bold leading-none">
                      <NumeroAnimado valor={d.encerradasPorMes.reduce((s, m) => s + m.total, 0)} />
                    </p>
                    <p className="text-[12px] text-muted">encerradas no ano</p>
                  </div>
                )
              }
            >
              {d && <EncerradasPorMesChart dados={d.encerradasPorMes} meta={d.metaPct} />}
            </ChartCard>
            <ChartCard className="xl:col-span-2" atraso={0.08} title="NCs abertas por área" description="Clique numa barra para abrir a lista" carregando={!d}>
              {d && (d.abertasPorArea.length ? <AbertasPorAreaChart dados={d.abertasPorArea} onClickArea={(a) => irLista({ area: a, aba: 'abertas' })} /> : <EmptyState title="Nenhuma NC aberta 🎉" />)}
            </ChartCard>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <ChartCard title="Distribuição por criticidade" description="NCs abertas, escala 0–6" carregando={!d}>
              {d && <CriticidadeChart dados={d.porCriticidade} limite={config?.criticidadeCriticaMin ?? 3} />}
            </ChartCard>
            <ChartCard atraso={0.08} title="NCs abertas por gerência" carregando={!d}>
              {d && (d.porGerencia.length ? <GerenciaChart dados={d.porGerencia} /> : <EmptyState title="Nenhuma NC aberta 🎉" />)}
            </ChartCard>
            <ChartCard atraso={0.16} title="NCs cadastradas por mês" description="Últimos 12 meses" carregando={!d}>
              {d && <CadastradasChart dados={d.cadastradasPorMes} />}
            </ChartCard>
          </section>

          <section data-vg-entra className="vg-painel mt-4 overflow-hidden">
            <div>
              <CardHeader
                title="Precisam de atenção"
                description={`NCs abertas ordenadas por dias de atraso · Atenção ≥ ${config?.alertaAtencaoDias ?? 15} dias · Crítico ≥ ${config?.alertaCriticoDias ?? 30} dias`}
                action={
                  <Link to="/ncs?aba=atrasadas" className="group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-brand/[0.07]">
                    Ver todas <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                }
              />
              <div className="vg-tabela mt-4 px-2 pb-2">
                <NcTable
                  itens={d?.atencao ?? []}
                  carregando={!d}
                  colunas={['nc_id', 'area', 'titulo', 'criticidade', 'prazo', 'etapa', 'status_prazo', 'dias_atraso']}
                  vazio={<EmptyState icon={<CheckCircle2 className="h-5 w-5 text-success" />} title="Nenhuma NC atrasada 🎉" description="Todas as NCs abertas estão dentro do prazo." />}
                />
              </div>
            </div>
          </section>
        </>
      )}
      </div>
    </>
  );
}
