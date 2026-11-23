import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarClock, FileSpreadsheet, Mail, History, RefreshCw, Undo2, UploadCloud } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { EtapaBadge } from '@/components/StatusBadges';
import { api, mensagemErro } from '@/lib/api';
import type { Etapa, ProrrogacaoImport, ResultadoImportacao, RetomadaImport } from '@/lib/types';
import { cn, fmtDataHora } from '@/lib/utils';
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
  return (
    <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-line">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-line text-[12px] text-muted">
            <th className="px-3 py-2 text-left font-medium">Tipo</th>
            <th className="px-3 py-2 text-left font-medium">Linha</th>
            <th className="px-3 py-2 text-left font-medium">NC ID</th>
            <th className="px-3 py-2 text-left font-medium">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((e, i) => (
            <tr key={i} className="border-b border-line/50 last:border-0">
              <td className="px-3 py-2">{e.tipo === 'erro' ? <Badge tom="danger">Erro</Badge> : <Badge tom="warning">Aviso</Badge>}</td>
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
  const input = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [aba, setAba] = useState('');
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

  async function escolher(f: File) {
    setErro(null);
    setArquivo(f);
    setFase('lendo');
    setProgresso(0);
    try {
      const r = await lerPlanilha(f);
      if (!r.linhas.length) throw new Error('A planilha está vazia.');
      setLinhas(r.linhas);
      setAba(r.aba);
      let acc = VAZIO;
      const ls = lotes(r.linhas);
      for (let i = 0; i < ls.length; i++) {
        acc = somar(acc, await api<ResultadoImportacao>('importar', { etapa: 'preview', linhas: ls[i], linhaInicial: i * LOTE + 2 }));
        setProgresso(Math.round(((i + 1) / ls.length) * 100));
      }
      setDecisoes({});
      setNotificar(true);
      setPrevia(acc);
      setFase('preview');
    } catch (e) {
      setErro(mensagemErro(e));
      setFase('inicio');
    }
  }

  async function confirmar() {
    if (!arquivo) return;
    setErro(null);
    setFase('importando');
    setProgresso(0);
    try {
      const { id } = await api<{ id: string }>('importar', { etapa: 'iniciar', arquivo: arquivo.name });
      const motivos: Record<number, string> = {};
      const manter: Record<number, boolean> = {};
      for (const r of retomadas) {
        const d = decisoes[r.nc_id];
        if (d?.acao === 'manter') manter[r.nc_id] = true;
        else motivos[r.nc_id] = d?.motivo.trim() ?? '';
      }
      let acc = VAZIO;
      const ls = lotes(linhas);
      for (let i = 0; i < ls.length; i++) {
        acc = somar(acc, await api<ResultadoImportacao>('importar', { etapa: 'lote', id, linhas: ls[i], linhaInicial: i * LOTE + 2, motivos, manter }));
        setProgresso(Math.round(((i + 1) / ls.length) * 100));
      }
      const fim = await api<{ emails?: number }>('importar', {
        etapa: 'finalizar', id, arquivo: arquivo.name, novas: acc.novas, atualizadas: acc.atualizadas, erros: acc.totalErros,
        notificar, novasIds: acc.novasIds, retomadas: acc.retomadas, prorrogacoes: acc.prorrogacoes,
      });
      setResultado({ ...acc, emails: notificar ? fim.emails ?? 0 : undefined });
      setFase('fim');
      toast({ tipo: 'sucesso', titulo: 'Importação concluída', descricao: `${acc.novas} nova(s) e ${acc.atualizadas} atualizada(s).` });
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
      setArquivo(null);
      concluir();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setReprocessando(false);
    }
  }

  function reiniciar() {
    setArquivo(null);
    setLinhas([]);
    setPrevia(null);
    setResultado(null);
    setDecisoes({});
    setFase('inicio');
  }

  return (
    <div>
      <PageHeader eyebrow="Administração"
        title="Importar dados do Obrasoft"
        subtitle="Envie o Excel exportado (mesmo formato da aba “NC”). As NCs são atualizadas pelo NC ID, sem duplicar."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setConfirmarEntrada(true)} loading={reprocessando}>
            <RefreshCw className="h-4 w-4" /> Reprocessar aba de entrada
          </Button>
        }
      />
      {erro && <Aviso className="mb-4">{erro}</Aviso>}

      <Card className="anim-fade-up p-5 sm:p-6">
        {fase === 'inicio' && (
          <button
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) escolher(f);
            }}
            className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line px-6 py-14 text-center transition-all duration-300 hover:border-brand/50 hover:bg-brand/[0.03]"
          >
            <div className="grid h-14 w-14 place-items-center rounded-full bg-brand/[0.08] text-brand transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-4 font-semibold">Clique ou arraste o arquivo .xlsx aqui</p>
            <p className="mt-1 text-sm text-muted">A aba “NC” é usada se existir; senão, a primeira aba. Nada é gravado antes da sua confirmação.</p>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) escolher(f);
            e.target.value = '';
          }}
        />

        {(fase === 'lendo' || fase === 'importando') && (
          <div className="py-10 text-center">
            <p className="font-semibold">{fase === 'lendo' ? 'Analisando o arquivo…' : 'Importando…'}</p>
            <p className="mt-1 text-sm text-muted">
              {arquivo?.name} · {linhas.length || '…'} linhas
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
                <p className="truncate font-semibold">{arquivo?.name}</p>
                <p className="text-[13px] text-muted">
                  Aba “{aba}” · {linhas.length} linhas · pré-visualização (nada foi gravado ainda)
                </p>
              </div>
            </div>
            <Contagens r={previa} />
            <Problemas r={previa} />
            {(previa.prorrogacoes?.length ?? 0) > 0 && <ProrrogacoesRespondidas itens={previa.prorrogacoes ?? []} />}
            {retomadas.length > 0 && <Retomadas itens={retomadas} decisoes={decisoes} mudar={mudarDecisao} />}
            <AvisarPorEmail ativo={notificar} mudar={setNotificar} r={previa} />
            <p className="mt-4 text-[13px] text-muted">
              Áreas já classificadas e planos de ação preenchidos no portal são preservados. Comentários e anexos não são afetados. Linhas com erro são ignoradas.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={reiniciar}>
                Cancelar
              </Button>
              {faltaMotivo && <span className="self-center text-[12px] text-warning">Informe o motivo de todas as retomadas</span>}
              <Button onClick={confirmar} disabled={(!previa.novas && !previa.atualizadas) || faltaMotivo}>
                Confirmar importação ({previa.novas + previa.atualizadas})
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
            <table className="w-full text-[13px]">
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
