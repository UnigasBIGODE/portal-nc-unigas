import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCheck, FileSpreadsheet, Mail, History, RefreshCw, Undo2, UploadCloud, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { EtapaBadge } from '@/components/StatusBadges';
import { api, mensagemErro } from '@/lib/api';
import type { Etapa, ProrrogacaoImport, ResultadoImportacao, RetomadaImport } from '@/lib/types';
import { cn, fmtData, fmtDataHora, hojeISO } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useTitulo } from '@/hooks/queries';
import { NumeroAnimado } from '@/components/KpiCard';
import { SucessoAnimado } from '@/components/Celebracao';
import { Aviso, Badge, Button, Card, CardHeader, Dialog, EmptyState, Input, PageHeader, Skeleton, Textarea } from '@/components/ui';

const LOTE = 300;
type Linha = Record<string, unknown>;

async function lerPlanilha(arquivo: File): Promise<{ linhas: Linha[]; aba: string }> {
  const XLSX = await import('xlsx');
  // cellDates: false → as datas vão como número serial do Excel e o servidor converte
  // no fuso de Brasília (evita deslocamentos de fuso do navegador).
  const wb = XLSX.read(await arquivo.arrayBuffer(), { cellDates: false });
  const aba = wb.SheetNames.find((n) => n.trim().toUpperCase() === 'NC') ?? wb.SheetNames[0];
  const linhas = XLSX.utils.sheet_to_json<Linha>(wb.Sheets[aba], { defval: '', raw: true });
  return { linhas: linhas.filter((l) => Object.values(l).some((v) => v !== '' && v !== null)), aba };
}

function somar(a: ResultadoImportacao, b: ResultadoImportacao): ResultadoImportacao {
  return {
    novas: a.novas + b.novas,
    atualizadas: a.atualizadas + b.atualizadas,
    semAlteracao: a.semAlteracao + b.semAlteracao,
    totalErros: a.totalErros + b.totalErros,
    totalAvisos: a.totalAvisos + b.totalAvisos,
    erros: [...a.erros, ...b.erros].slice(0, 1000),
    avisos: [...a.avisos, ...b.avisos].slice(0, 1000),
    retomadas: [...(a.retomadas ?? []), ...(b.retomadas ?? [])],
    totalRetomadas: (a.totalRetomadas ?? 0) + (b.totalRetomadas ?? 0),
    prorrogacoes: [...(a.prorrogacoes ?? []), ...(b.prorrogacoes ?? [])],
    totalProrrogacoes: (a.totalProrrogacoes ?? 0) + (b.totalProrrogacoes ?? 0),
    novasIds: [...(a.novasIds ?? []), ...(b.novasIds ?? [])],
    ids: [...(a.ids ?? []), ...(b.ids ?? [])],
  };
}
const VAZIO: ResultadoImportacao = { novas: 0, atualizadas: 0, semAlteracao: 0, totalErros: 0, totalAvisos: 0, erros: [], avisos: [], retomadas: [], totalRetomadas: 0, prorrogacoes: [], totalProrrogacoes: 0, novasIds: [] };

/** Pedidos de prorrogação que voltam respondidos pelo Obrasoft (não pedem motivo). */
function ProrrogacoesRespondidas({ itens }: { itens: ProrrogacaoImport[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
      className="mt-5 overflow-hidden rounded-2xl border border-info/40 bg-info/[0.06]"
    >
      <div className="flex items-start gap-3 border-b border-info/25 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-info/15 text-info">
          <CalendarClock className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold">{itens.length} pedido(s) de prorrogação respondido(s)</p>
          <p className="text-[13px] text-muted">Estas NCs estavam em verificação aguardando a prorrogação e voltam para execução. Se o prazo do arquivo aumentou, conta como aprovada; senão, como prazo mantido.</p>
        </div>
      </div>
      <ul className="max-h-72 divide-y divide-line/60 overflow-auto">
        {itens.map((r, i) => (
          <motion.li key={r.nc_id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + Math.min(i, 12) * 0.04 }} className="flex flex-wrap items-center gap-2 bg-card/40 px-4 py-3 text-[13px]">
            <Link to={`/ncs/${r.nc_id}`} target="_blank" className="tabular font-semibold hover:text-brand">
              NC {r.nc_id}
            </Link>
            <span className="min-w-0 flex-1 truncate text-muted">
              {r.titulo} · {r.area}
            </span>
            <span className="text-muted">pedido {r.pedido}</span>
            <Badge tom={r.aprovada ? 'success' : 'warning'}>{r.aprovada ? `Aprovada · prazo ${r.prazo}` : `Prazo mantido · ${r.prazo}`}</Badge>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/** Opção de avisar os responsáveis por e-mail. */
function AvisarPorEmail({ ativo, mudar, r }: { ativo: boolean; mudar: (v: boolean) => void; r: ResultadoImportacao }) {
  const partes = [
    r.novas ? `${r.novas} nova(s)` : '',
    r.totalRetomadas ? `${r.totalRetomadas} retomada(s)` : '',
    r.totalProrrogacoes ? `${r.totalProrrogacoes} prorrogação(ões)` : '',
  ].filter(Boolean);
  if (!partes.length) return null;
  return (
    <label className={cn('mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors', ativo ? 'border-brand/40 bg-brand/[0.04]' : 'border-line')}>
      <input type="checkbox" checked={ativo} onChange={(e) => mudar(e.target.checked)} className="mt-1 h-4 w-4 accent-[#E30613]" />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-semibold">
          <Mail className="h-4 w-4 text-brand" /> Avisar os responsáveis por e-mail
        </span>
        <span className="mt-0.5 block text-[13px] text-muted">
          Cada responsável recebe um único e-mail com as NCs das suas áreas ({partes.join(', ')}). Desmarque em importações grandes ou de carga inicial.
        </span>
      </span>
    </label>
  );
}

type Ausente = { nc_id: number; titulo: string; area: string; etapa: Etapa; prazo: string | null; data_execucao: string | null; status_prazo: string };
type DecisaoAusente = { finalizar: boolean; data: string };

/** Conferência de abertas: NCs abertas no portal que não vieram em nenhum arquivo (provavelmente finalizadas no Obrasoft). */
function Ausentes({ lista, totalAbertas, decisoes, mudar, carregando }: {
  lista: Ausente[]; totalAbertas: number; decisoes: Record<number, DecisaoAusente>; mudar: (id: number, d: Partial<DecisaoAusente>) => void; carregando: boolean;
}) {
  const [dataTodas, setDataTodas] = useState('');
  const marcadas = lista.filter((n) => decisoes[n.nc_id]?.finalizar).length;
  const semData = lista.filter((n) => decisoes[n.nc_id]?.finalizar && !decisoes[n.nc_id]?.data).length;
  const suspeito = totalAbertas > 0 && lista.length / totalAbertas > 0.3;
  if (carregando)
    return (
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line p-4 text-[13px] text-muted">
        <RefreshCw className="h-4 w-4 animate-spin" /> Conferindo as NCs abertas do portal…
      </div>
    );
  if (!lista.length)
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/[0.06] p-4 text-[13px]">
        <CheckCheck className="h-5 w-5 text-success" /> Todas as NCs abertas do portal estão nos arquivos. Nenhuma para finalizar.
      </motion.div>
    );
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-5 overflow-hidden rounded-2xl border border-success/40 bg-success/[0.05]"
    >
      <div className="flex flex-wrap items-start gap-3 border-b border-success/25 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/15 text-success">
          <CheckCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{lista.length} NC(s) abertas no portal não vieram nos arquivos</p>
          <p className="text-[13px] text-muted">
            Provavelmente foram finalizadas no Obrasoft. As marcadas serão <b>finalizadas</b> com a data de execução informada (sem data, vão para Pendências). Desmarque as que devem continuar abertas.
          </p>
        </div>
        <Badge tom="success">{marcadas} para finalizar</Badge>
      </div>
      {suspeito && (
        <div className="flex items-start gap-2 border-b border-warning/30 bg-warning/[0.08] px-4 py-3 text-[13px] text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Atenção: {lista.length} de {totalAbertas} NCs abertas ficaram de fora. Confira se enviou <b>os dois arquivos</b> (execução e verificação) antes de confirmar.
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-success/20 bg-card/60 p-3 text-[13px]">
        <Button size="sm" variant="ghost" onClick={() => lista.forEach((n) => mudar(n.nc_id, { finalizar: true }))}>
          Marcar todas
        </Button>
        <Button size="sm" variant="ghost" onClick={() => lista.forEach((n) => mudar(n.nc_id, { finalizar: false }))}>
          Desmarcar todas
        </Button>
        <span className="ml-auto text-muted">Data de execução para as vazias:</span>
        <Input type="date" value={dataTodas} max={hojeISO()} onChange={(e) => setDataTodas(e.target.value)} className="w-[170px]" />
        <Button size="sm" variant="secondary" disabled={!dataTodas} onClick={() => lista.forEach((n) => !decisoes[n.nc_id]?.data && mudar(n.nc_id, { data: dataTodas }))}>
          Preencher
        </Button>
      </div>
      <ul className="max-h-[480px] divide-y divide-line/60 overflow-auto">
        {lista.map((n, i) => {
          const d = decisoes[n.nc_id] ?? { finalizar: true, data: '' };
          return (
            <motion.li
              key={n.nc_id}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: d.finalizar ? 1 : 0.55, x: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30, delay: Math.min(i, 14) * 0.03 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-card/40 px-4 py-3 text-[13px]"
            >
              <input type="checkbox" checked={d.finalizar} onChange={(e) => mudar(n.nc_id, { finalizar: e.target.checked })} className="h-4 w-4 accent-[#16A34A]" aria-label={`Finalizar NC ${n.nc_id}`} />
              <Link to={`/ncs/${n.nc_id}`} target="_blank" className="tabular w-[72px] font-semibold hover:text-brand">
                NC {n.nc_id}
              </Link>
              <span className="min-w-0 flex-1 truncate">
                {n.titulo} <span className="text-muted">· {n.area}</span>
              </span>
              <EtapaBadge etapa={n.etapa} curto />
              <span className="tabular text-muted">prazo {fmtData(n.prazo)}</span>
              <Input
                type="date"
                value={d.data}
                max={hojeISO()}
                disabled={!d.finalizar}
                onChange={(e) => mudar(n.nc_id, { data: e.target.value })}
                className={cn('h-8 w-[160px] text-[13px]', d.finalizar && !d.data && 'border-warning/60')}
                aria-label={`Data de execução da NC ${n.nc_id}`}
              />
            </motion.li>
          );
        })}
      </ul>
      {semData > 0 && <p className="border-t border-success/20 px-4 py-2.5 text-[12px] text-warning">{semData} marcada(s) sem data de execução: serão finalizadas e ficarão em Pendências para completar.</p>}
    </motion.div>
  );
}

/** Caixa de upload de uma planilha (execução ou verificação). */
function CaixaArquivo({ titulo, descricao, cor, indice, arquivo, escolher }: {
  titulo: string; descricao: string; cor: 'warning' | 'info'; indice: number; arquivo: File | null; escolher: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  const pegar = (l: FileList | null) => {
    const f = Array.from(l ?? []).find((x) => /\.(xlsx|xls|csv)$/i.test(x.name));
    if (f) escolher(f);
  };
  const tons = cor === 'warning'
    ? { borda: 'border-warning/60', fundo: 'bg-warning/[0.06]', icone: 'bg-warning/12 text-warning', ponto: 'bg-warning' }
    : { borda: 'border-info/60', fundo: 'bg-info/[0.06]', icone: 'bg-info/12 text-info', ponto: 'bg-info' };
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: indice * 0.08 }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Anexar planilha de ${titulo}`}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => { e.preventDefault(); setSobre(false); pegar(e.dataTransfer.files); }}
        className={cn(
          'group relative flex h-full min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all duration-300',
          arquivo ? cn('border-solid', tons.borda, tons.fundo) : sobre ? 'scale-[1.01] border-brand/60 bg-brand/[0.04]' : 'border-line hover:border-brand/40 hover:bg-brand/[0.02]',
        )}
      >
        <span className="absolute left-4 top-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted">
          <span className={cn('h-2 w-2 rounded-full', tons.ponto)} /> {indice + 1}. {titulo}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          {arquivo ? (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }} className="mt-4 flex flex-col items-center">
              <div className={cn('grid h-14 w-14 place-items-center rounded-2xl', tons.icone)}>
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <p className="mt-3 max-w-[280px] truncate font-semibold" title={arquivo.name}>{arquivo.name}</p>
              <p className="text-[12px] text-muted">{Math.max(1, Math.round(arquivo.size / 1024))} KB · clique para trocar</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); escolher(null); }}
                className="mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-3.5 w-3.5" /> Remover
              </button>
            </motion.div>
          ) : (
            <motion.div key="vazio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex flex-col items-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-brand/[0.08] text-brand transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="mt-3 font-semibold">Clique ou arraste o .xlsx</p>
              <p className="mt-1 max-w-[300px] text-[13px] text-muted">{descricao}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => { pegar(e.target.files); e.target.value = ''; }} />
      </div>
    </motion.div>
  );
}

type Decisao = { acao: 'retomar' | 'manter'; motivo: string };

/** NCs que o arquivo traz de volta para uma etapa anterior: o admin informa o motivo (ou mantém a etapa do portal). */
function Retomadas({ itens, decisoes, mudar }: { itens: RetomadaImport[]; decisoes: Record<number, Decisao>; mudar: (id: number, d: Partial<Decisao>) => void }) {
  const [todos, setTodos] = useState('');
  const pendentes = itens.filter((r) => decisoes[r.nc_id]?.acao !== 'manter' && !decisoes[r.nc_id]?.motivo.trim()).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}
      className="mt-5 overflow-hidden rounded-2xl border border-warning/40 bg-warning/[0.06]"
    >
      <div className="flex flex-wrap items-start gap-3 border-b border-warning/30 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
          <Undo2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {itens.length} NC(s) voltando de etapa
          </p>
          <p className="text-[13px] text-muted">
            Estas NCs estão em verificação ou finalizadas no portal, mas o arquivo traz uma etapa anterior. Informe o motivo da retomada — ele aparece na NC
            para o responsável. Se o portal estiver mais atualizado que o Obrasoft, escolha “Manter etapa do portal”.
          </p>
        </div>
        <Badge tom={pendentes ? 'warning' : 'success'}>{pendentes ? `${pendentes} sem motivo` : 'Tudo preenchido'}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-warning/20 bg-card/60 p-3">
        <Input value={todos} onChange={(e) => setTodos(e.target.value)} placeholder="Mesmo motivo para várias (ex.: reprovada na verificação da Comgás)" className="min-w-[240px] flex-1" />
        <Button
          size="sm"
          variant="secondary"
          disabled={!todos.trim()}
          onClick={() => itens.forEach((r) => decisoes[r.nc_id]?.acao !== 'manter' && !decisoes[r.nc_id]?.motivo.trim() && mudar(r.nc_id, { motivo: todos.trim() }))}
        >
          Preencher as vazias
        </Button>
      </div>
      <ul className="max-h-[560px] divide-y divide-line/60 overflow-auto">
        {itens.map((r, i) => {
          const d = decisoes[r.nc_id] ?? { acao: 'retomar', motivo: '' };
          return (
            <motion.li
              key={r.nc_id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.2 + Math.min(i, 12) * 0.04 }}
              className="bg-card/40 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/ncs/${r.nc_id}`} target="_blank" className="tabular font-semibold hover:text-brand">
                  NC {r.nc_id}
                </Link>
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                  {r.titulo} · {r.area}
                </span>
                <span className="flex items-center gap-1.5">
                  <EtapaBadge etapa={r.de as Etapa} curto />
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  <EtapaBadge etapa={(d.acao === 'manter' ? r.de : r.para) as Etapa} curto />
                </span>
              </div>
              <div className="mt-3 inline-flex rounded-full bg-elevated p-1 text-[12px]">
                {(['retomar', 'manter'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => mudar(r.nc_id, { acao: a })}
                    className={cn(
                      'relative rounded-full px-3 py-1 font-medium transition-colors',
                      d.acao === a ? 'text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    {d.acao === a && <motion.span layoutId={`dec-${r.nc_id}`} className="absolute inset-0 rounded-full bg-card shadow-card" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                    <span className="relative">{a === 'retomar' ? `Retomar para ${r.para.toLowerCase()}` : 'Manter etapa do portal'}</span>
                  </button>
                ))}
              </div>
              <AnimatePresence initial={false}>
                {d.acao === 'retomar' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <Textarea
                      value={d.motivo}
                      onChange={(e) => mudar(r.nc_id, { motivo: e.target.value })}
                      rows={2}
                      maxLength={3000}
                      placeholder="Motivo da retomada (obrigatório)"
                      className={cn('mt-3', !d.motivo.trim() && 'border-warning/60')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function Contagens({ r }: { r: ResultadoImportacao }) {
  const it = [
    { rot: 'Novas', v: r.novas, cls: 'text-success' },
    { rot: 'Atualizadas', v: r.atualizadas, cls: 'text-fg' },
    { rot: 'Sem alteração', v: r.semAlteracao, cls: 'text-muted' },
    { rot: 'Com erro (ignoradas)', v: r.totalErros, cls: r.totalErros ? 'text-danger' : 'text-muted' },
  ];
  return (
    <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
      {it.map((i) => (
        <div key={i.rot} className="rounded-2xl bg-elevated p-4">
          <p className="text-[12px] text-muted">{i.rot}</p>
          <p className={cn('tabular mt-1 text-3xl font-bold', i.cls)}>
            <NumeroAnimado valor={i.v} />
          </p>
        </div>
      ))}
    </div>
  );
}

function Problemas({ r }: { r: ResultadoImportacao }) {
  const lista = [...r.erros.map((e) => ({ ...e, tipo: 'erro' as const })), ...r.avisos.map((e) => ({ ...e, tipo: 'aviso' as const }))];
  if (!lista.length) return null;
  const temArquivo = new Set(lista.map((e) => e.arquivo).filter(Boolean)).size > 1;
  return (
    <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-line">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-line text-[12px] text-muted">
            <th className="px-3 py-2 text-left font-medium">Tipo</th>
            {temArquivo && <th className="px-3 py-2 text-left font-medium">Arquivo</th>}
            <th className="px-3 py-2 text-left font-medium">Linha</th>
            <th className="px-3 py-2 text-left font-medium">NC ID</th>
            <th className="px-3 py-2 text-left font-medium">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((e, i) => (
            <tr key={i} className="border-b border-line/50 last:border-0">
              <td className="px-3 py-2">{e.tipo === 'erro' ? <Badge tom="danger">Erro</Badge> : <Badge tom="warning">Aviso</Badge>}</td>
              {temArquivo && <td className="max-w-[160px] truncate px-3 py-2 text-muted">{e.arquivo}</td>}
              <td className="tabular px-3 py-2">{e.linha}</td>
              <td className="tabular px-3 py-2">{e.nc_id || '—'}</td>
              <td className="px-3 py-2 text-muted">{e.msg}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(r.totalErros > r.erros.length || r.totalAvisos > r.avisos.length) && <p className="p-3 text-[12px] text-muted">Mostrando os primeiros registros.</p>}
    </div>
  );
}

export default function Importar() {
  useTitulo('Importar dados');
  const qc = useQueryClient();
  const toast = useToast();
  const { atualizarSessao } = useAuth();
  const [arqExec, setArqExec] = useState<File | null>(null);
  const [arqVerif, setArqVerif] = useState<File | null>(null);
  const [partes, setPartes] = useState<{ nome: string; aba: string; linhas: Linha[] }[]>([]);
  const nomes = partes.map((p) => p.nome).join(' + ');
  const totalLinhas = partes.reduce((t, p) => t + p.linhas.length, 0);
  const [conferir, setConferir] = useState(false);
  const [ausentes, setAusentes] = useState<{ itens: Ausente[]; totalAbertas: number } | null>(null);
  const [carregandoAusentes, setCarregandoAusentes] = useState(false);
  const [decAusentes, setDecAusentes] = useState<Record<number, DecisaoAusente>>({});
  const mudarAusente = (id: number, d: Partial<DecisaoAusente>) =>
    setDecAusentes((x) => ({ ...x, [id]: { ...(x[id] ?? { finalizar: true, data: '' }), ...d } }));
  const [fase, setFase] = useState<'inicio' | 'lendo' | 'preview' | 'importando' | 'fim'>('inicio');
  const [previa, setPrevia] = useState<ResultadoImportacao | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarEntrada, setConfirmarEntrada] = useState(false);
  const [reprocessando, setReprocessando] = useState(false);
  const [decisoes, setDecisoes] = useState<Record<number, Decisao>>({});
  const [notificar, setNotificar] = useState(true);
  const [notificarEntrada, setNotificarEntrada] = useState(true);
  const mudarDecisao = (id: number, d: Partial<Decisao>) =>
    setDecisoes((x) => ({ ...x, [id]: { ...(x[id] ?? { acao: 'retomar', motivo: '' }), ...d } }));
  const retomadas = previa?.retomadas ?? [];
  const faltaMotivo = retomadas.some((r) => decisoes[r.nc_id]?.acao !== 'manter' && !decisoes[r.nc_id]?.motivo.trim());
  const hist = useQuery({ queryKey: ['importacoes'], queryFn: () => api<{ itens: { id: string; data: string; usuario: string; arquivo: string; novas: number; atualizadas: number; erros: number }[] }>('importar', { etapa: 'historico' }) });

  const lotes = (l: Linha[]) => Array.from({ length: Math.ceil(l.length / LOTE) }, (_, i) => l.slice(i * LOTE, (i + 1) * LOTE));

  function concluir() {
    qc.invalidateQueries();
    atualizarSessao();
  }

  async function escolher(lista: FileList | File[] | null) {
    const arquivos = Array.from(lista ?? []).filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name)).slice(0, 5);
    if (!arquivos.length) return;
    setErro(null);
    setFase('lendo');
    setProgresso(0);
    try {
      const lidas: { nome: string; aba: string; linhas: Linha[] }[] = [];
      for (const f of arquivos) {
        const r = await lerPlanilha(f);
        if (!r.linhas.length) throw new Error(`A planilha “${f.name}” está vazia.`);
        lidas.push({ nome: f.name, aba: r.aba, linhas: r.linhas });
      }
      setPartes(lidas);
      let acc = VAZIO;
      const total = lidas.reduce((t, p) => t + Math.ceil(p.linhas.length / LOTE), 0);
      let feitos = 0;
      for (const p of lidas) {
        const ls = lotes(p.linhas);
        for (let i = 0; i < ls.length; i++) {
          const r = await api<ResultadoImportacao>('importar', { etapa: 'preview', linhas: ls[i], linhaInicial: i * LOTE + 2 });
          const marcar = <T extends object>(l: T[]) => l.map((e) => ({ ...e, arquivo: p.nome }));
          acc = somar(acc, { ...r, erros: marcar(r.erros), avisos: marcar(r.avisos) });
          setProgresso(Math.round((++feitos / total) * 100));
        }
      }
      setDecisoes({});
      setNotificar(true);
      setDecAusentes({});
      setAusentes(null);
      setPrevia(acc);
      setFase('preview');
      const conf = lidas.length > 1;
      setConferir(conf);
      if (conf) void buscarAusentes(acc.ids ?? []);
    } catch (e) {
      setErro(mensagemErro(e));
      setFase('inicio');
    }
  }

  async function buscarAusentes(ids: number[]) {
    setCarregandoAusentes(true);
    try {
      const r = await api<{ itens: Ausente[]; total: number; totalAbertas: number }>('importar', { etapa: 'ausentes', ids });
      const dec: Record<number, DecisaoAusente> = {};
      r.itens.forEach((n) => (dec[n.nc_id] = { finalizar: true, data: n.data_execucao ? n.data_execucao.slice(0, 10) : '' }));
      setDecAusentes(dec);
      setAusentes({ itens: r.itens, totalAbertas: r.totalAbertas });
    } catch (e) {
      setErro(mensagemErro(e));
      setConferir(false);
    } finally {
      setCarregandoAusentes(false);
    }
  }

  function alternarConferir(v: boolean) {
    setConferir(v);
    if (v && !ausentes && previa) void buscarAusentes(previa.ids ?? []);
  }

  const aFinalizar = conferir && ausentes ? ausentes.itens.filter((n) => decAusentes[n.nc_id]?.finalizar) : [];

  async function confirmar() {
    if (!partes.length) return;
    setErro(null);
    setFase('importando');
    setProgresso(0);
    try {
      const { id } = await api<{ id: string }>('importar', { etapa: 'iniciar', arquivo: nomes });
      const motivos: Record<number, string> = {};
      const manter: Record<number, boolean> = {};
      for (const r of retomadas) {
        const d = decisoes[r.nc_id];
        if (d?.acao === 'manter') manter[r.nc_id] = true;
        else motivos[r.nc_id] = d?.motivo.trim() ?? '';
      }
      let acc = VAZIO;
      const total = partes.reduce((t, p) => t + Math.ceil(p.linhas.length / LOTE), 0) + (aFinalizar.length ? 1 : 0);
      let feitos = 0;
      for (const p of partes) {
        const ls = lotes(p.linhas);
        for (let i = 0; i < ls.length; i++) {
          acc = somar(acc, await api<ResultadoImportacao>('importar', { etapa: 'lote', id, linhas: ls[i], linhaInicial: i * LOTE + 2, motivos, manter }));
          setProgresso(Math.round((++feitos / total) * 100));
        }
      }
      if (aFinalizar.length) {
        const f = await api<{ finalizadas: number; semData: number }>('importar', {
          etapa: 'finalizarAusentes', id, itens: aFinalizar.map((n) => ({ nc_id: n.nc_id, data_execucao: decAusentes[n.nc_id]?.data || undefined })),
        });
        acc = { ...acc, finalizadas: f.finalizadas, finalizadasSemData: f.semData };
        setProgresso(100);
      }
      const fim = await api<{ emails?: number }>('importar', {
        etapa: 'finalizar', id, arquivo: nomes, novas: acc.novas, atualizadas: acc.atualizadas + (acc.finalizadas ?? 0), erros: acc.totalErros,
        notificar, novasIds: acc.novasIds, retomadas: acc.retomadas, prorrogacoes: acc.prorrogacoes,
      });
      setResultado({ ...acc, emails: notificar ? fim.emails ?? 0 : undefined });
      setFase('fim');
      toast({ tipo: 'sucesso', titulo: 'Importação concluída', descricao: `${acc.novas} nova(s), ${acc.atualizadas} atualizada(s)${acc.finalizadas ? ` e ${acc.finalizadas} finalizada(s)` : ''}.` });
      concluir();
    } catch (e) {
      setErro(`${mensagemErro(e)} — a importação foi interrompida; as linhas já enviadas foram gravadas. Você pode importar o mesmo arquivo de novo com segurança (não duplica).`);
      setFase('preview');
    }
  }

  async function reprocessar() {
    setConfirmarEntrada(false);
    setReprocessando(true);
    setErro(null);
    try {
      const r = await api<ResultadoImportacao>('importar', { etapa: 'reprocessarEntrada', limpar: true, notificar: notificarEntrada });
      setResultado(r);
      setFase('fim');
      setPartes([]);
      setArqExec(null);
      setArqVerif(null);
      concluir();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setReprocessando(false);
    }
  }

  function reiniciar() {
    setPartes([]);
    setAusentes(null);
    setDecAusentes({});
    setConferir(false);
    setArqExec(null);
    setArqVerif(null);
    setPrevia(null);
    setResultado(null);
    setDecisoes({});
    setFase('inicio');
  }

  return (
    <div>
      <PageHeader eyebrow="Administração"
        title="Importar dados do Obrasoft"
        subtitle="Anexe as duas planilhas exportadas do Obrasoft (em execução e em verificação). As NCs são atualizadas pelo NC ID, sem duplicar."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setConfirmarEntrada(true)} loading={reprocessando}>
            <RefreshCw className="h-4 w-4" /> Reprocessar aba de entrada
          </Button>
        }
      />
      {erro && <Aviso className="mb-4">{erro}</Aviso>}

      <Card className="anim-fade-up p-5 sm:p-6">
        {fase === 'inicio' && (
          <div>
            <div className="grid gap-4 md:grid-cols-2">
              <CaixaArquivo
                titulo="NCs em execução"
                descricao="Export do Obrasoft com as NCs “Em execução c/ Unigás”"
                cor="warning"
                indice={0}
                arquivo={arqExec}
                escolher={setArqExec}
              />
              <CaixaArquivo
                titulo="NCs em verificação"
                descricao="Export do Obrasoft com as NCs “Em verificação c/ Comgás”"
                cor="info"
                indice={1}
                arquivo={arqVerif}
                escolher={setArqVerif}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xl text-[13px] text-muted">
                Com as duas planilhas, o portal atualiza as NCs e confere quais abertas não vieram em nenhuma (finalizadas no Obrasoft). Nada é gravado antes da sua confirmação.
              </p>
              <motion.div animate={arqExec && arqVerif ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
                <Button size="lg" variant="brand" disabled={!arqExec || !arqVerif} onClick={() => arqExec && arqVerif && void escolher([arqExec, arqVerif])}>
                  <UploadCloud className="h-5 w-5" />
                  {arqExec && arqVerif ? 'Analisar as duas planilhas' : `Anexe ${!arqExec && !arqVerif ? 'as duas planilhas' : 'a outra planilha'}`}
                </Button>
              </motion.div>
            </div>
          </div>
        )}

        {(fase === 'lendo' || fase === 'importando') && (
          <div className="py-10 text-center">
            <p className="font-semibold">{fase === 'lendo' ? 'Analisando o arquivo…' : 'Importando…'}</p>
            <p className="mt-1 text-sm text-muted">
              {nomes || '…'} · {totalLinhas || '…'} linhas
            </p>
            <div className="mx-auto mt-5 h-2 max-w-md overflow-hidden rounded-full bg-elevated" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(progresso, 4)}%` }} />
            </div>
            <p className="tabular mt-2 text-[12px] text-muted">{progresso}%</p>
          </div>
        )}

        {fase === 'preview' && previa && (
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{partes.length > 1 ? `${partes.length} arquivos` : nomes}</p>
                <p className="text-[13px] text-muted">
                  {partes.map((p) => (partes.length > 1 ? `${p.nome} (${p.linhas.length})` : `Aba “${p.aba}” · ${p.linhas.length} linhas`)).join(' · ')} · pré-visualização (nada foi gravado ainda)
                </p>
              </div>
            </div>
            <Contagens r={previa} />
            <Problemas r={previa} />
            {(previa.prorrogacoes?.length ?? 0) > 0 && <ProrrogacoesRespondidas itens={previa.prorrogacoes ?? []} />}
            {retomadas.length > 0 && <Retomadas itens={retomadas} decisoes={decisoes} mudar={mudarDecisao} />}
            <label className={cn('mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors', conferir ? 'border-success/40 bg-success/[0.04]' : 'border-line')}>
              <input type="checkbox" checked={conferir} onChange={(e) => alternarConferir(e.target.checked)} className="mt-1 h-4 w-4 accent-[#16A34A]" />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  <CheckCheck className="h-4 w-4 text-success" /> Estes arquivos têm todas as NCs abertas (execução + verificação)
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">O portal lista as NCs abertas que não vieram em nenhum arquivo para você finalizar. Deixe desmarcado se enviou só parte das NCs.</span>
              </span>
            </label>
            <AnimatePresence initial={false}>
              {conferir && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <Ausentes lista={ausentes?.itens ?? []} totalAbertas={ausentes?.totalAbertas ?? 0} decisoes={decAusentes} mudar={mudarAusente} carregando={carregandoAusentes || !ausentes} />
                </motion.div>
              )}
            </AnimatePresence>
            <AvisarPorEmail ativo={notificar} mudar={setNotificar} r={previa} />
            <p className="mt-4 text-[13px] text-muted">
              Áreas já classificadas e planos de ação preenchidos no portal são preservados. Comentários e anexos não são afetados. Linhas com erro são ignoradas.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={reiniciar}>
                Cancelar
              </Button>
              {faltaMotivo && <span className="self-center text-[12px] text-warning">Informe o motivo de todas as retomadas</span>}
              <Button onClick={confirmar} disabled={(!previa.novas && !previa.atualizadas && !aFinalizar.length) || faltaMotivo || (conferir && carregandoAusentes)}>
                Confirmar importação ({previa.novas + previa.atualizadas}{aFinalizar.length ? ` + ${aFinalizar.length} a finalizar` : ''})
              </Button>
            </div>
          </div>
        )}

        {fase === 'fim' && resultado && (
          <div>
            <div className="mb-6 flex flex-col items-center text-center">
              {resultado.totalErros ? <AlertTriangle className="h-12 w-12 text-warning" /> : <SucessoAnimado />}
              <p className="mt-3 text-[20px] font-bold tracking-tight">Importação concluída</p>
              <p className="text-[13px] text-muted">Os indicadores já foram recalculados.</p>
            </div>
            <Contagens r={resultado} />
            {resultado.emails !== undefined && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-elevated px-3.5 py-2.5 text-sm">
                <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7, type: 'spring' }}>
                  <Mail className="h-4 w-4 text-brand" />
                </motion.span>
                {resultado.emails ? `${resultado.emails} e-mail(s) de aviso enviados aos responsáveis.` : 'Nenhum e-mail precisou ser enviado (sem responsáveis cadastrados para essas áreas, ou nada novo).'}
              </motion.div>
            )}
            {!!resultado.finalizadas && (
              <Aviso tom="success" className="mt-4">
                {resultado.finalizadas} NC(s) finalizada(s) por não constarem mais nos arquivos de abertas.
                {resultado.finalizadasSemData ? ` ${resultado.finalizadasSemData} sem data de execução — complete em Pendências.` : ''}
              </Aviso>
            )}
            {!!resultado.totalProrrogacoes && (
              <Aviso tom="info" className="mt-4">
                {resultado.totalProrrogacoes} pedido(s) de prorrogação respondido(s) e registrados nas NCs.
              </Aviso>
            )}
            {!!resultado.totalRetomadas && (
              <Aviso tom="warning" className="mt-4">
                {resultado.totalRetomadas} NC(s) retomada(s) para etapa anterior. O motivo ficou registrado nos comentários e em destaque em cada NC.
              </Aviso>
            )}
            <Problemas r={resultado} />
            <div className="mt-5 flex justify-end">
              <Button onClick={reiniciar}>Importar outro arquivo</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="anim-fade-up mt-4 overflow-hidden" style={{ ['--d' as string]: '150ms' }}>
        <CardHeader title="Histórico de importações" action={<History className="h-4 w-4 text-muted" />} />
        <div className="mt-3 overflow-x-auto">
          {hist.isLoading ? (
            <div className="space-y-2 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !hist.data?.itens.length ? (
            <EmptyState title="Nenhuma importação ainda" />
          ) : (
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-muted">
                  <th className="px-5 py-2.5 text-left font-medium">Data</th>
                  <th className="px-3 py-2.5 text-left font-medium">Arquivo</th>
                  <th className="px-3 py-2.5 text-left font-medium">Usuário</th>
                  <th className="px-3 py-2.5 text-right font-medium">Novas</th>
                  <th className="px-3 py-2.5 text-right font-medium">Atualizadas</th>
                  <th className="px-5 py-2.5 text-right font-medium">Erros</th>
                </tr>
              </thead>
              <tbody>
                {hist.data.itens.map((h) => (
                  <tr key={h.id} className="border-b border-line/50 last:border-0">
                    <td className="tabular whitespace-nowrap px-5 py-2.5">{fmtDataHora(h.data)}</td>
                    <td className="px-3 py-2.5">{h.arquivo}</td>
                    <td className="px-3 py-2.5 text-muted">{h.usuario}</td>
                    <td className="tabular px-3 py-2.5 text-right">{h.novas}</td>
                    <td className="tabular px-3 py-2.5 text-right">{h.atualizadas}</td>
                    <td className={cn('tabular px-5 py-2.5 text-right', h.erros && 'text-danger')}>{h.erros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Dialog
        open={confirmarEntrada}
        onClose={() => setConfirmarEntrada(false)}
        title="Reprocessar aba de entrada"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmarEntrada(false)}>
              Cancelar
            </Button>
            <Button onClick={reprocessar}>Reprocessar</Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Lê o conteúdo colado na aba <b className="text-fg">Entrada_Obrasoft</b> da planilha, faz o upsert na aba NC (mesmas regras do upload) e depois limpa a aba de entrada.
          NCs que voltarem de etapa por aqui ficam com “motivo não informado” — para informar o motivo, prefira o envio do arquivo.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={notificarEntrada} onChange={(e) => setNotificarEntrada(e.target.checked)} className="h-4 w-4 accent-[#E30613]" />
          Avisar os responsáveis por e-mail (novas NCs, retomadas e prorrogações)
        </label>
      </Dialog>
    </div>
  );
}
