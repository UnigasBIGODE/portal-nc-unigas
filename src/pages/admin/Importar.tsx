import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, History, RefreshCw, UploadCloud } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import type { ResultadoImportacao } from '@/lib/types';
import { cn, fmtDataHora } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useTitulo } from '@/hooks/queries';
import { NumeroAnimado } from '@/components/KpiCard';
import { Aviso, Badge, Button, Card, CardHeader, Dialog, EmptyState, PageHeader, Skeleton } from '@/components/ui';

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
  };
}
const VAZIO: ResultadoImportacao = { novas: 0, atualizadas: 0, semAlteracao: 0, totalErros: 0, totalAvisos: 0, erros: [], avisos: [] };

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
      let acc = VAZIO;
      const ls = lotes(linhas);
      for (let i = 0; i < ls.length; i++) {
        acc = somar(acc, await api<ResultadoImportacao>('importar', { etapa: 'lote', id, linhas: ls[i], linhaInicial: i * LOTE + 2 }));
        setProgresso(Math.round(((i + 1) / ls.length) * 100));
      }
      await api('importar', { etapa: 'finalizar', id, arquivo: arquivo.name, novas: acc.novas, atualizadas: acc.atualizadas, erros: acc.totalErros });
      setResultado(acc);
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
      const r = await api<ResultadoImportacao>('importar', { etapa: 'reprocessarEntrada', limpar: true });
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
            <p className="mt-4 text-[13px] text-muted">
              Áreas já classificadas e planos de ação preenchidos no portal são preservados. Comentários e anexos não são afetados. Linhas com erro são ignoradas.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={reiniciar}>
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={!previa.novas && !previa.atualizadas}>
                Confirmar importação ({previa.novas + previa.atualizadas})
              </Button>
            </div>
          </div>
        )}

        {fase === 'fim' && resultado && (
          <div>
            <div className="mb-5 flex items-center gap-3">
              {resultado.totalErros ? <AlertTriangle className="h-6 w-6 text-warning" /> : <CheckCircle2 className="h-6 w-6 text-success" />}
              <div>
                <p className="font-semibold">Importação concluída</p>
                <p className="text-[13px] text-muted">Os indicadores já foram recalculados.</p>
              </div>
            </div>
            <Contagens r={resultado} />
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
        </p>
      </Dialog>
    </div>
  );
}
