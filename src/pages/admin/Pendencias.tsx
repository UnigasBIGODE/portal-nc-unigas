import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, CalendarX2, CheckCircle2, ChevronDown, ClipboardX, Flag, KeyRound, RefreshCw, Tags, UserX } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import type { Etapa } from '@/lib/types';
import { cn, fmtData, fmtDataHora } from '@/lib/utils';
import { useTitulo } from '@/hooks/queries';
import { NumeroAnimado } from '@/components/KpiCard';
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { EtapaBadge, StatusPrazoBadge } from '@/components/StatusBadges';
import type { StatusPrazo } from '@/lib/types';

type NcCurta = { nc_id: number; titulo: string; area: string; etapa: Etapa; prazo: string | null; status_prazo: StatusPrazo; dias_atraso: number; criticidade: number | null };
type Pedido = NcCurta & { pedido_de: string; pedido_para: string; justificativa: string; autor: string; pedido_em: string };
type Contestada = NcCurta & { motivo: string; sugestao: string; autor: string; reportado_em: string };
type Lista<T> = { total: number; itens: T[] };
export interface Pendencias {
  prorrogacoes: Lista<Pedido>;
  areaContestada: Lista<Contestada>;
  aClassificar: Lista<NcCurta>;
  semPlano: Lista<NcCurta>;
  finalizadasSemExecucao: Lista<NcCurta>;
  areasSemResponsavel: Lista<{ area: string; abertas: number }>;
  usuariosSemAcesso: Lista<{ id: string; nome: string; email: string; temSenha: boolean }>;
  geradoEm: string;
}

/** Total que aparece no menu (o que exige ação do admin). */
export function totalPendencias(p?: Pendencias) {
  if (!p) return 0;
  return p.prorrogacoes.total + (p.areaContestada?.total ?? 0) + p.aClassificar.total + p.finalizadasSemExecucao.total + p.areasSemResponsavel.total;
}

export function usePendencias(ativo = true) {
  return useQuery({ queryKey: ['pendencias'], queryFn: () => api<Pendencias>('pendencias'), enabled: ativo, staleTime: 5 * 60_000, refetchInterval: 10 * 60_000 });
}

type Tom = 'info' | 'warning' | 'danger' | 'neutral';
const COR: Record<Tom, string> = {
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-elevated text-muted',
};

function Secao({ icone, titulo, descricao, total, tom, acao, children, indice, abertoInicial }: {
  icone: ReactNode; titulo: string; descricao: string; total: number; tom: Tom; acao?: ReactNode; children: ReactNode; indice: number; abertoInicial?: boolean;
}) {
  const [aberto, setAberto] = useState(!!abertoInicial && total > 0);
  const ok = total === 0;
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1], delay: 0.06 * indice }}>
      <Card lift className={cn('overflow-hidden', ok && 'opacity-80')}>
        <button type="button" onClick={() => !ok && setAberto((a) => !a)} className={cn('flex w-full items-center gap-4 p-5 text-left', ok && 'cursor-default')} aria-expanded={aberto}>
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', ok ? 'bg-success/10 text-success' : COR[tom])}>{ok ? <CheckCircle2 className="h-5 w-5" /> : icone}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{titulo}</span>
            <span className="block text-[13px] text-muted">{ok ? 'Nada pendente aqui.' : descricao}</span>
          </span>
          <span className={cn('tabular text-[28px] font-bold leading-none', ok ? 'text-success' : tom === 'danger' ? 'text-danger' : tom === 'warning' ? 'text-warning' : tom === 'info' ? 'text-info' : 'text-fg')}>
            <NumeroAnimado valor={total} />
          </span>
          {!ok && (
            <motion.span animate={{ rotate: aberto ? 180 : 0 }} className="text-muted">
              <ChevronDown className="h-5 w-5" />
            </motion.span>
          )}
        </button>
        <AnimatePresence initial={false}>
          {aberto && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="border-t border-line">
                {acao && <div className="flex justify-end border-b border-line/60 bg-elevated/40 px-5 py-2.5">{acao}</div>}
                <div className="max-h-[440px] overflow-auto">{children}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function ListaNCs({ itens, total }: Lista<NcCurta>) {
  return (
    <ul className="divide-y divide-line/60">
      {itens.map((n, i) => (
        <motion.li key={n.nc_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 15) * 0.025 }}>
          <Link to={`/ncs/${n.nc_id}`} className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-[13px] transition-colors hover:bg-elevated/60">
            <span className="tabular w-[72px] font-semibold group-hover:text-brand">NC {n.nc_id}</span>
            <span className="min-w-0 flex-1 truncate">{n.titulo || 'Sem título'}</span>
            <span className="text-muted">{n.area}</span>
            <span className="tabular text-muted">prazo {fmtData(n.prazo)}</span>
            <EtapaBadge etapa={n.etapa} curto />
            <StatusPrazoBadge status={n.status_prazo} dias={n.dias_atraso} />
          </Link>
        </motion.li>
      ))}
      {total > itens.length && <li className="px-5 py-3 text-[12px] text-muted">Mostrando {itens.length} de {total}.</li>}
    </ul>
  );
}

export default function PendenciasPagina() {
  useTitulo('Pendências');
  const q = usePendencias();
  const p = q.data;

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Pendências"
        subtitle="O que precisa da sua resposta ou de arrumação no cadastro, num lugar só."
        actions={
          <Button variant="secondary" size="sm" onClick={() => q.refetch()} loading={q.isFetching}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        }
      />
      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[84px]" />
          ))}
        </div>
      ) : q.error || !p ? (
        <Card className="p-6">
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        </Card>
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            {totalPendencias(p) === 0 ? (
              <Badge tom="success"><CheckCircle2 className="h-3.5 w-3.5" /> Tudo em dia</Badge>
            ) : (
              <Badge tom="warning">{totalPendencias(p)} item(ns) pedem ação</Badge>
            )}
            <span>Atualizado em {fmtDataHora(p.geradoEm)}</span>
          </motion.div>
          <div className="space-y-3">
            <Secao indice={0} abertoInicial icone={<CalendarClock className="h-5 w-5" />} tom="info" total={p.prorrogacoes.total}
              titulo="Pedidos de prorrogação aguardando resposta"
              descricao="NCs em verificação com pedido de mais prazo. Registre a resposta do verificador na NC (aprovada ou recusada).">
              <ul className="divide-y divide-line/60">
                {p.prorrogacoes.itens.map((n, i) => (
                  <motion.li key={n.nc_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Link to={`/ncs/${n.nc_id}`} className="group block px-5 py-3.5 transition-colors hover:bg-elevated/60">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                        <span className="tabular font-semibold group-hover:text-brand">NC {n.nc_id}</span>
                        <span className="min-w-0 flex-1 truncate">{n.titulo}</span>
                        <span className="text-muted">{n.area}</span>
                        <span className="tabular rounded-full bg-info/10 px-2.5 py-0.5 text-[12px] text-info">
                          {n.pedido_de} → <b>{n.pedido_para}</b>
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                        “{n.justificativa}” — {n.autor}, {fmtDataHora(n.pedido_em)}
                      </p>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </Secao>
            <Secao indice={1} abertoInicial icone={<Flag className="h-5 w-5" />} tom="danger" total={p.areaContestada?.total ?? 0}
              titulo="Área contestada pelo responsável"
              descricao="O ponto focal informou que a NC não é da área dele. Abra a NC para alterar o responsável ou manter a área.">
              <ul className="divide-y divide-line/60">
                {(p.areaContestada?.itens ?? []).map((n, i) => (
                  <motion.li key={n.nc_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Link to={`/ncs/${n.nc_id}`} className="group block px-5 py-3.5 transition-colors hover:bg-elevated/60">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                        <span className="tabular font-semibold group-hover:text-brand">NC {n.nc_id}</span>
                        <span className="min-w-0 flex-1 truncate">{n.titulo}</span>
                        <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[12px] text-danger line-through decoration-danger/50">{n.area}</span>
                        {n.sugestao && <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[12px] text-success">sugere: {n.sugestao}</span>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                        “{n.motivo}” — {n.autor}, {fmtDataHora(n.reportado_em)}
                      </p>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </Secao>
            <Secao indice={2} icone={<Tags className="h-5 w-5" />} tom="warning" total={p.aClassificar.total}
              titulo="NCs sem área (a classificar)"
              descricao="Só o administrador vê estas NCs até que recebam uma área."
              acao={<Link to="/admin/classificacao"><Button size="sm">Classificar agora</Button></Link>}>
              <ListaNCs {...p.aClassificar} />
            </Secao>
            <Secao indice={3} icone={<CalendarX2 className="h-5 w-5" />} tom="danger" total={p.finalizadasSemExecucao.total}
              titulo="Finalizadas sem data de execução"
              descricao="Sem a data de execução não dá para saber se foram encerradas no prazo; elas ficam fora do % no prazo.">
              <ListaNCs {...p.finalizadasSemExecucao} />
            </Secao>
            <Secao indice={4} icone={<UserX className="h-5 w-5" />} tom="warning" total={p.areasSemResponsavel.total}
              titulo="Áreas sem responsável"
              descricao="Ninguém recebe e-mails nem vê as NCs destas áreas."
              acao={<Link to="/admin/usuarios"><Button size="sm">Vincular responsáveis</Button></Link>}>
              <ul className="divide-y divide-line/60">
                {p.areasSemResponsavel.itens.map((a) => (
                  <li key={a.area} className="flex items-center justify-between px-5 py-3 text-[13px]">
                    <span className="font-medium">{a.area}</span>
                    <span className="text-muted">{a.abertas} NC(s) aberta(s)</span>
                  </li>
                ))}
              </ul>
            </Secao>
            <Secao indice={5} icone={<ClipboardX className="h-5 w-5" />} tom="neutral" total={p.semPlano.total}
              titulo="Abertas sem plano de ação"
              descricao="Preencha o plano de ação para orientar a equipe responsável.">
              <ListaNCs {...p.semPlano} />
            </Secao>
            <Secao indice={6} icone={<KeyRound className="h-5 w-5" />} tom="neutral" total={p.usuariosSemAcesso.total}
              titulo="Usuários que ainda não acessaram"
              descricao="Sem senha definida ou sem nenhum acesso. Reenvie o convite em Usuários."
              acao={<Link to="/admin/usuarios"><Button size="sm" variant="secondary">Abrir usuários</Button></Link>}>
              <ul className="divide-y divide-line/60">
                {p.usuariosSemAcesso.itens.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-[13px]">
                    <span className="font-medium">{u.nome}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{u.email}</span>
                    <Badge tom={u.temSenha ? 'neutral' : 'warning'}>{u.temSenha ? 'Nunca acessou' : 'Sem senha'}</Badge>
                  </li>
                ))}
              </ul>
            </Secao>
          </div>
        </>
      )}
    </div>
  );
}
