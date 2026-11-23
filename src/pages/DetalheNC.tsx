import { useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { SucessoAnimado } from '@/components/Celebracao';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, Eye, FileText, ImagePlus, Loader2, MessageSquare, Paperclip, Pencil, RotateCcw, Send, SendHorizontal, Trash2, Undo2, Upload, X } from 'lucide-react';
import { api, arquivoParaBase64, baixarBase64, mensagemErro } from '@/lib/api';
import type { DetalheNC as DetalheT, Etapa, NC } from '@/lib/types';
import { cn, fmtData, fmtDataHora, hojeISO, iniciais } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useOpcoesFiltro, useTitulo } from '@/hooks/queries';
import { Aviso, Badge, Button, Card, CardHeader, Dialog, EmptyState, ErrorState, Field, Input, Select, Skeleton, Tabs, Textarea } from '@/components/ui';
import { AlertaBadge, CriticidadeBadge, EtapaBadge, StatusPrazoBadge } from '@/components/StatusBadges';

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2.5 text-[13px] last:border-0">
      <dt className="text-muted">{rotulo}</dt>
      <dd className="text-right font-medium">{children || '—'}</dd>
    </div>
  );
}

function LinhaDoTempo({ nc }: { nc: NC }) {
  const etapaIdx = nc.etapa === 'FINALIZADO' ? 4 : nc.etapa === 'VERIFICAÇÃO' ? 3 : 2;
  const passos = [
    { rotulo: 'Cadastro', data: fmtData(nc.data_cadastro), feito: true },
    { rotulo: 'Prazo', data: fmtData(nc.prazo), feito: etapaIdx > 2 || nc.status_prazo === 'Atrasado', alerta: nc.status_prazo === 'Atrasado' || nc.status_prazo === 'Fora do prazo' },
    { rotulo: 'Execução', data: nc.data_execucao ? fmtData(nc.data_execucao) : etapaIdx === 2 ? 'em andamento' : '—', feito: etapaIdx > 2, atual: etapaIdx === 2 },
    { rotulo: 'Verificação', data: etapaIdx === 3 ? 'com a Comgás' : etapaIdx > 3 ? 'concluída' : '—', feito: etapaIdx > 3, atual: etapaIdx === 3 },
    { rotulo: 'Finalizado', data: etapaIdx === 4 ? fmtData(nc.data_execucao) : '—', feito: etapaIdx === 4 },
  ];
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Linha do tempo da NC">
      {passos.map((p, i) => (
        <li key={p.rotulo} className="relative flex flex-col items-center text-center">
          {i > 0 && (
            <span className="absolute right-1/2 top-[13px] h-[3px] w-full overflow-hidden rounded-full bg-line" aria-hidden>
              {passos[i - 1].feito && (
                <motion.span
                  className={cn('absolute inset-0 origin-left rounded-full', passos[i].alerta || passos[i - 1].alerta ? 'bg-danger/60' : 'bg-fg/60')}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3 + i * 0.22, duration: 0.5, ease: 'easeOut' }}
                />
              )}
            </span>
          )}
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.22, type: 'spring', stiffness: 420, damping: 20 }}
            className={cn(
              'relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-[11px]',
              p.alerta ? 'border-danger bg-danger/15 text-danger' : p.atual ? 'border-brand bg-brand text-white' : p.feito ? 'border-fg/70 bg-fg/80 text-bg' : 'border-line bg-card text-muted',
            )}
          >
            {p.atual && <span className="anim-ping absolute inset-0 rounded-full bg-brand" aria-hidden />}
            <span className="relative">{p.feito && !p.alerta ? <Check className="h-3.5 w-3.5" /> : p.alerta ? '!' : i + 1}</span>
          </motion.span>
          <span className={cn('mt-2 text-[12px] font-medium', p.atual && 'text-brand')}>{p.rotulo}</span>
          <span className="tabular text-[11px] text-muted">{p.data}</span>
        </li>
      ))}
    </ol>
  );
}

function EditarNC({ nc, aberto, fechar, salvar, salvando, erro }: { nc: NC; aberto: boolean; fechar: () => void; salvar: (c: Record<string, unknown>) => void; salvando: boolean; erro: string | null }) {
  const { data: op } = useOpcoesFiltro();
  const { config } = useAuth();
  const [v, setV] = useState({
    area_responsavel: nc.area_responsavel,
    etapa: nc.etapa,
    criticidade: nc.criticidade === null ? '' : String(nc.criticidade),
    prazo: nc.prazo?.slice(0, 10) ?? '',
    data_execucao: nc.data_execucao?.slice(0, 10) ?? '',
    verificador: nc.verificador,
    gerencia: nc.gerencia,
    regiao: nc.regiao,
  });
  const s = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <Dialog
      open={aberto}
      onClose={fechar}
      title={`Editar NC ${nc.nc_id}`}
      description="Alterações ficam registradas no histórico."
      footer={
        <>
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button loading={salvando} onClick={() => salvar(v)}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Área responsável">
          <Select value={v.area_responsavel} onChange={s('area_responsavel')}>
            <option value="">A classificar</option>
            {op?.areas.filter((a) => a !== 'A classificar').map((a) => <option key={a}>{a}</option>)}
          </Select>
        </Field>
        <Field label="Etapa">
          <Select value={v.etapa} onChange={s('etapa')}>
            <option value="EXECUÇÃO">Em execução c/ Unigás</option>
            <option value="VERIFICAÇÃO">Em verificação c/ Comgás</option>
            <option value="FINALIZADO">Finalizado</option>
          </Select>
        </Field>
        <Field label="Criticidade">
          <Select value={v.criticidade} onChange={s('criticidade')}>
            <option value="">—</option>
            {[0, 1, 2, 3, 4, 5, 6].map((c) => (
              <option key={c} value={c}>
                {c} – {config?.rotulosCriticidade[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Região">
          <Input value={v.regiao} onChange={s('regiao')} list="regioes" />
          <datalist id="regioes">{op?.regioes.map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
        <Field label="Prazo">
          <Input type="date" value={v.prazo} onChange={s('prazo')} />
        </Field>
        <Field label="Data da execução">
          <Input type="date" value={v.data_execucao} onChange={s('data_execucao')} />
        </Field>
        <Field label="Verificador">
          <Input value={v.verificador} onChange={s('verificador')} />
        </Field>
        <Field label="Gerência">
          <Input value={v.gerencia} onChange={s('gerencia')} list="gerencias" />
          <datalist id="gerencias">{op?.gerencias.map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
      </div>
      {erro && <Aviso className="mt-4">{erro}</Aviso>}
    </Dialog>
  );
}


// ---------------------------------------------------------------- envio para verificação (com evidências)

type DetalheCompleto = DetalheT & { podeEnviarVerificacao?: boolean; podeExcluirAnexo?: boolean };
type Fase = 'form' | 'enviando' | 'sucesso';
const MAX_ARQUIVO = 10 * 1024 * 1024;
const MAX_TOTAL = 25 * 1024 * 1024;

function tamanho(b: number) {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

const PASSOS_ENVIO = ['Preparando as evidências', 'Enviando para o servidor', 'Atualizando a etapa'];

function EnviarVerificacao({ nc, exigeEvidencia, onConcluido }: { nc: NC; exigeEvidencia: boolean; onConcluido: (d: DetalheCompleto) => void }) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [fase, setFase] = useState<Fase>('form');
  const [arquivos, setArquivos] = useState<{ file: File; url?: string }[]>([]);
  const [data, setData] = useState(hojeISO());
  const [obs, setObs] = useState('');
  const [passo, setPasso] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const resultado = useRef<DetalheCompleto | null>(null);
  const total = arquivos.reduce((t, a) => t + a.file.size, 0);

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const novos: { file: File; url?: string }[] = [];
    Array.from(lista).forEach((f) => {
      if (f.size > MAX_ARQUIVO) return toast({ tipo: 'erro', titulo: 'Arquivo muito grande', descricao: `${f.name} passa de 10 MB.` });
      novos.push({ file: f, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined });
    });
    setArquivos((a) => [...a, ...novos].slice(0, 10));
  }

  function abrir() {
    setFase('form');
    setArquivos([]);
    setData(hojeISO());
    setObs('');
    setPasso(0);
    setAberto(true);
  }

  function fechar() {
    if (fase === 'enviando') return;
    setAberto(false);
    arquivos.forEach((a) => a.url && URL.revokeObjectURL(a.url));
    if (fase === 'sucesso' && resultado.current) onConcluido(resultado.current);
  }

  async function enviar() {
    setFase('enviando');
    setPasso(0);
    try {
      const lista = [];
      for (const a of arquivos) lista.push({ nome: a.file.name, mimeType: a.file.type || 'application/octet-stream', base64: await arquivoParaBase64(a.file) });
      setPasso(1);
      const t = setTimeout(() => setPasso(2), 1400);
      const d = await api<DetalheCompleto>('enviarParaVerificacao', { nc_id: nc.nc_id, data_execucao: data, observacao: obs.trim() || undefined, arquivos: lista });
      clearTimeout(t);
      setPasso(3);
      resultado.current = d;
      await new Promise((r) => setTimeout(r, 350));
      setFase('sucesso');
      setTimeout(() => {
        setAberto(false);
        onConcluido(d);
      }, 2600);
    } catch (e) {
      setFase('form');
      toast({ tipo: 'erro', titulo: 'Não foi possível enviar', descricao: mensagemErro(e) });
    }
  }

  const podeEnviar = (!exigeEvidencia || arquivos.length > 0) && total <= MAX_TOTAL && !!data;

  return (
    <>
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Button size="sm" variant="brand" onClick={abrir} className="relative overflow-hidden">
          <motion.span className="absolute inset-0 bg-white/25" initial={{ x: '-120%' }} animate={{ x: '120%' }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }} style={{ skewX: -20 }} />
          <SendHorizontal className="relative h-4 w-4" /> <span className="relative">Enviar para verificação</span>
        </Button>
      </motion.div>

      <Dialog
        open={aberto}
        onClose={fechar}
        size="md"
        title={fase === 'sucesso' ? 'Tudo certo!' : `Enviar para verificação · NC ${nc.nc_id}`}
        description={fase === 'form' ? 'Anexe as evidências do serviço executado. Ao concluir, a NC passa automaticamente para “Em verificação c/ Comgás”.' : undefined}
        footer={
          fase === 'form' ? (
            <>
              <Button variant="secondary" onClick={fechar}>
                Cancelar
              </Button>
              <Button variant="brand" disabled={!podeEnviar} onClick={enviar}>
                <SendHorizontal className="h-4 w-4" /> Enviar {arquivos.length > 0 && `com ${arquivos.length} evidência${arquivos.length > 1 ? 's' : ''}`}
              </Button>
            </>
          ) : fase === 'sucesso' ? (
            <Button onClick={fechar}>Fechar</Button>
          ) : undefined
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {fase === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <input ref={input} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
              <motion.button
                type="button"
                onClick={() => input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
                animate={{ scale: arrastando ? 1.02 : 1 }}
                className={cn(
                  'group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                  arrastando ? 'border-brand bg-brand/[0.06]' : 'border-line hover:border-brand/50 hover:bg-brand/[0.03]',
                  exigeEvidencia && arquivos.length === 0 && 'border-brand/40',
                )}
              >
                <motion.span className="grid h-12 w-12 place-items-center rounded-full bg-brand/[0.08] text-brand" animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
                  <ImagePlus className="h-5 w-5" />
                </motion.span>
                <p className="mt-3 text-[14px] font-semibold">Clique ou arraste as fotos e documentos</p>
                <p className="mt-1 text-[12px] text-muted">
                  {exigeEvidencia ? 'Obrigatório: ao menos 1 evidência · ' : ''}até 10 arquivos, 10 MB cada, 25 MB no total
                </p>
              </motion.button>

              {arquivos.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {arquivos.map((a, i) => (
                      <motion.li
                        key={a.file.name + a.file.size + i}
                        layout
                        initial={{ opacity: 0, scale: 0.85, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        className="group relative overflow-hidden rounded-xl border border-line bg-elevated"
                      >
                        {a.url ? (
                          <img src={a.url} alt={a.file.name} className="h-24 w-full object-cover" />
                        ) : (
                          <div className="grid h-24 place-items-center text-muted">
                            <FileText className="h-7 w-7" />
                          </div>
                        )}
                        <div className="px-2 py-1.5">
                          <p className="truncate text-[12px] font-medium">{a.file.name}</p>
                          <p className="text-[11px] text-muted">{tamanho(a.file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setArquivos((l) => l.filter((_, j) => j !== i))}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Remover ${a.file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
              {total > MAX_TOTAL && <Aviso>O total passa de 25 MB. Remova algum arquivo ou envie parte pelo botão Anexar.</Aviso>}

              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <Field label="Data da execução">
                  <Input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
                </Field>
                <Field label="Observação (opcional)">
                  <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: serviço refeito conforme o plano de ação" />
                </Field>
              </div>
            </motion.div>
          )}

          {fase === 'enviando' && (
            <motion.div key="enviando" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="py-4">
              <div className="relative mx-auto h-24 w-full max-w-sm overflow-hidden">
                <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 border-t-2 border-dashed border-line" />
                <motion.div className="absolute top-1/2 -translate-y-1/2 text-brand" initial={{ left: '0%' }} animate={{ left: ['0%', '86%'], y: [0, -10, 4, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
                  <SendHorizontal className="h-8 w-8 -rotate-12" />
                </motion.div>
                <div className="absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-info/10 text-info">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
              <ol className="mx-auto mt-2 max-w-sm space-y-3">
                {PASSOS_ENVIO.map((t, i) => {
                  const feito = passo > i, atual = passo === i;
                  return (
                    <motion.li key={t} className="flex items-center gap-3 text-[14px]" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}>
                      <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2 transition-colors', feito ? 'border-success bg-success text-white' : atual ? 'border-brand' : 'border-line')}>
                        {feito ? <Check className="h-3.5 w-3.5" /> : atual ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> : null}
                      </span>
                      <span className={cn(feito ? 'text-muted line-through decoration-success/40' : atual ? 'font-semibold' : 'text-muted')}>
                        {t}
                        {i === 0 && arquivos.length > 0 && ` (${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''}, ${tamanho(total)})`}
                      </span>
                    </motion.li>
                  );
                })}
              </ol>
              <div className="mx-auto mt-6 h-1.5 max-w-sm overflow-hidden rounded-full bg-elevated">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-[#ff5a63]" animate={{ width: `${Math.min(100, 12 + passo * 30)}%` }} transition={{ duration: 0.6 }} />
              </div>
            </motion.div>
          )}

          {fase === 'sucesso' && (
            <motion.div key="sucesso" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="py-4 text-center">
              <SucessoAnimado />
              <motion.p className="mt-4 text-[20px] font-bold tracking-tight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                Enviada para verificação!
              </motion.p>
              <motion.p className="mx-auto mt-1 max-w-sm text-[14px] text-muted" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
                {arquivos.length > 0 ? `${arquivos.length} evidência${arquivos.length > 1 ? 's anexadas' : ' anexada'}. ` : ''}A NC {nc.nc_id} agora aguarda a verificação da Comgás.
              </motion.p>
              <motion.div className="mt-4 inline-flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                <EtapaBadge etapa="EXECUÇÃO" curto />
                <ArrowRight className="h-4 w-4 text-muted" />
                <motion.span initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.15, 1] }} transition={{ delay: 1.1, duration: 0.5 }}>
                  <EtapaBadge etapa="VERIFICAÇÃO" curto />
                </motion.span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}

type AcaoEtapa = { destino: Etapa; titulo: string; descricao: string; botao: string; motivo: boolean; data: boolean; variante: 'brand' | 'primary' | 'danger' | 'secondary' };

const ACOES_ETAPA: Record<Etapa, AcaoEtapa[]> = {
  'EXECUÇÃO': [],
  'VERIFICAÇÃO': [
    { destino: 'FINALIZADO', titulo: 'Aprovar e finalizar', descricao: 'A Comgás aprovou a execução. A NC será encerrada e contará no Relatório Mensal.', botao: 'Aprovar e finalizar', motivo: false, data: false, variante: 'primary' },
    { destino: 'EXECUÇÃO', titulo: 'Reprovar e voltar para execução', descricao: 'A Comgás reprovou a execução. A NC volta para a Unigás e a data da execução é apagada.', botao: 'Reprovar', motivo: true, data: false, variante: 'danger' },
  ],
  FINALIZADO: [
    { destino: 'VERIFICAÇÃO', titulo: 'Reabrir NC', descricao: 'A NC volta para "Em verificação c/ Comgás". Use quando ela foi finalizada por engano.', botao: 'Reabrir', motivo: true, data: false, variante: 'secondary' },
  ],
};

function FluxoEtapa({ nc, onFeito }: { nc: NC; onFeito: (d: DetalheT, acao: AcaoEtapa) => void }) {
  const toast = useToast();
  const [acao, setAcao] = useState<AcaoEtapa | null>(null);
  const [motivo, setMotivo] = useState('');
  const [data, setData] = useState('');
  const mut = useMutation({
    mutationFn: (a: AcaoEtapa) => api<DetalheT>('mudarEtapa', { nc_id: nc.nc_id, etapa: a.destino, motivo: motivo.trim() || undefined, data_execucao: a.data ? data : undefined }),
    onSuccess: (d, a) => {
      setAcao(null);
      onFeito(d, a);
    },
    onError: (e) => toast({ tipo: 'erro', titulo: 'Não foi possível mudar a etapa', descricao: mensagemErro(e) }),
  });
  const abrir = (a: AcaoEtapa) => {
    setMotivo('');
    setData(hojeISO());
    setAcao(a);
  };
  const icone = (d: Etapa) => (d === 'FINALIZADO' ? <CheckCircle2 className="h-4 w-4" /> : d === 'VERIFICAÇÃO' && nc.etapa === 'EXECUÇÃO' ? <SendHorizontal className="h-4 w-4" /> : d === 'EXECUÇÃO' ? <Undo2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />);
  return (
    <>
      {ACOES_ETAPA[nc.etapa]?.map((a) => (
        <Button key={a.destino} size="sm" variant={a.variante} onClick={() => abrir(a)}>
          {icone(a.destino)} {a.botao}
        </Button>
      ))}
      <Dialog
        open={!!acao}
        onClose={() => setAcao(null)}
        title={acao ? `${acao.titulo} · NC ${nc.nc_id}` : ''}
        description={acao?.descricao}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAcao(null)}>
              Cancelar
            </Button>
            <Button variant={acao?.variante === 'danger' ? 'brand' : 'primary'} loading={mut.isPending} disabled={!!acao?.motivo && !motivo.trim()} onClick={() => acao && mut.mutate(acao)}>
              Confirmar
            </Button>
          </>
        }
      >
        {acao && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[13px]">
              <EtapaBadge etapa={nc.etapa} curto />
              <ArrowRight className="h-4 w-4 text-muted" />
              <EtapaBadge etapa={acao.destino} curto />
            </div>
            {acao.data && (
              <Field label="Data da execução" hint="Dia em que a Unigás concluiu o serviço. Define se a NC foi executada no prazo.">
                <Input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
              </Field>
            )}
            <Field label={acao.motivo ? 'Motivo (obrigatório)' : 'Observação (opcional)'} hint="Fica registrado nos comentários da NC.">
              <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={acao.destino === 'EXECUÇÃO' ? 'Ex.: a Comgás pediu foto da placa do veículo com o equipamento instalado.' : ''} />
            </Field>
          </div>
        )}
      </Dialog>
    </>
  );
}

export default function DetalheNC() {
  const { id } = useParams();
  useTitulo(`NC ${id}`);
  const qc = useQueryClient();
  const chave = ['nc', id];
  const q = useQuery({ queryKey: chave, queryFn: () => api<DetalheCompleto>('detalheNC', { nc_id: Number(id) }) });
  const [editandoPlano, setEditandoPlano] = useState(false);
  const [plano, setPlano] = useState('');
  const [comentario, setComentario] = useState('');
  const [editar, setEditar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const inputArq = useRef<HTMLInputElement>(null);
  const [aba, setAba] = useState<'comentarios' | 'historico'>('comentarios');
  const [excluir, setExcluir] = useState<{ id: string; nome_arquivo: string } | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState('');
  const excluirAnexo = useMutation({
    mutationFn: (anexoId: string) => api<DetalheCompleto>('excluirAnexo', { id: anexoId, motivo: motivoExclusao.trim() || undefined }),
    onSuccess: (d) => {
      qc.setQueryData(chave, d);
      toast({ tipo: 'sucesso', titulo: 'Anexo excluído', descricao: 'O arquivo foi removido da NC e do Drive.' });
      setExcluir(null);
    },
    onError: (e) => toast({ tipo: 'erro', titulo: 'Não foi possível excluir', descricao: mensagemErro(e) }),
  });
  const toast = useToast();
  const { scrollY } = useScroll();
  const [compacto, setCompacto] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setCompacto(y > 260));

  const invalidarListas = () => {
    qc.invalidateQueries({ queryKey: ['ncs'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['alertas'] });
  };

  const atualizar = useMutation({
    mutationFn: (campos: Record<string, unknown>) => api<DetalheT>('atualizarNC', { nc_id: Number(id), campos }),
    onSuccess: (d) => {
      toast({ tipo: 'sucesso', titulo: 'NC atualizada', descricao: 'A alteração foi registrada no histórico.' });
      qc.setQueryData(chave, d);
      setEditandoPlano(false);
      setEditar(false);
      setErro(null);
      invalidarListas();
    },
    onError: (e) => toast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: mensagemErro(e) }),
  });

  const comentar = useMutation({
    mutationFn: (texto: string) => api('comentar', { nc_id: Number(id), texto }),
    onSuccess: () => {
      toast({ tipo: 'sucesso', titulo: 'Comentário publicado' });
      setComentario('');
      qc.invalidateQueries({ queryKey: chave });
    },
    onError: (e) => toast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: mensagemErro(e) }),
  });

  const anexar = useMutation({
    mutationFn: async (f: File) => {
      if (f.size > 10 * 1024 * 1024) throw new Error('Arquivo maior que 10 MB.');
      return api('anexar', { nc_id: Number(id), nome: f.name, mimeType: f.type || 'application/octet-stream', base64: await arquivoParaBase64(f) });
    },
    onSuccess: () => {
      toast({ tipo: 'sucesso', titulo: 'Evidência anexada', descricao: 'O arquivo foi salvo com segurança.' });
      qc.invalidateQueries({ queryKey: chave });
    },
    onError: (e) => toast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: mensagemErro(e) }),
  });

  async function baixar(anexoId: string) {
    setBaixando(anexoId);
    try {
      const r = await api<{ nome: string; mimeType: string; base64: string }>('baixarAnexo', { id: anexoId });
      baixarBase64(r.base64, r.nome, r.mimeType);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setBaixando(null);
    }
  }

  if (q.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  if (q.isError || !q.data)
    return (
      <Card>
        <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
      </Card>
    );

  const { nc, comentarios, anexos, historico, podeEditarTudo, podeEditarPlano, podeEnviarVerificacao, podeExcluirAnexo } = q.data;

  return (
    <div>
      <AnimatePresence>
        {compacto && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed left-0 right-0 top-[72px] z-20 border-b border-line bg-card/85 backdrop-blur-xl lg:left-[var(--menu)]"
          >
            <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-10">
              <span className="tabular rounded-full bg-elevated px-2.5 py-0.5 text-[12px] font-semibold">NC {nc.nc_id}</span>
              <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{nc.titulo}</p>
              <div className="hidden items-center gap-2 md:flex">
                <EtapaBadge etapa={nc.etapa} curto />
                <StatusPrazoBadge status={nc.status_prazo} dias={nc.dias_atraso} />
              </div>
              <Button size="sm" variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Topo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Link to="/ncs" className="group mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Voltar para a lista
      </Link>

      <Card className="anim-fade-up p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular rounded-full bg-elevated px-3 py-1 text-[13px] font-semibold">NC {nc.nc_id}</span>
              <EtapaBadge etapa={nc.etapa} />
              <StatusPrazoBadge status={nc.status_prazo} dias={nc.dias_atraso} />
              {nc.aberta && nc.nivel_alerta && <AlertaBadge nivel={nc.nivel_alerta} />}
              {nc.area === 'A classificar' && <Badge tom="warning">A classificar</Badge>}
            </div>
            <h1 className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">{nc.titulo || 'Sem título'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              <span>{nc.area}</span>
              <CriticidadeBadge valor={nc.criticidade} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {podeEnviarVerificacao && (
              <EnviarVerificacao
                nc={nc}
                exigeEvidencia={!podeEditarTudo}
                onConcluido={(d) => {
                  qc.setQueryData(chave, d);
                  invalidarListas();
                  setAba('comentarios');
                  toast({ tipo: 'sucesso', titulo: 'Enviada para verificação', descricao: `NC ${nc.nc_id} agora está em “Em verificação c/ Comgás”.` });
                }}
              />
            )}
            {podeEditarTudo && (
              <>
                <FluxoEtapa
                  nc={nc}
                  onFeito={(d, a) => {
                    qc.setQueryData(chave, d);
                    invalidarListas();
                    setAba('comentarios');
                    toast({ tipo: 'sucesso', titulo: a.titulo, descricao: `NC ${nc.nc_id} agora está em “${a.destino === 'EXECUÇÃO' ? 'Em execução c/ Unigás' : a.destino === 'VERIFICAÇÃO' ? 'Em verificação c/ Comgás' : 'Finalizado'}”.` });
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => { setErro(null); setEditar(true); }}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-8">
          <LinhaDoTempo key={nc.etapa + (nc.data_execucao ?? '')} nc={nc} />
        </div>
      </Card>

      {erro && !editar && <Aviso className="mt-4">{erro}</Aviso>}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="stagger space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Descrição" />
            <p className="whitespace-pre-line p-5 pt-3 text-[14px] leading-relaxed text-fg/90">{nc.descricao || '—'}</p>
          </Card>

          <Card>
            <CardHeader
              title="Plano de ação"
              description={podeEditarPlano ? 'Atualize o andamento das ações corretivas' : 'Definido pela Unigás – SSM'}
              action={
                podeEditarPlano && !editandoPlano && (
                  <Button variant="secondary" size="sm" onClick={() => { setPlano(nc.plano_acao ?? ''); setEditandoPlano(true); }}>
                    <Pencil className="h-3.5 w-3.5" /> Atualizar
                  </Button>
                )
              }
            />
            <div className="p-5 pt-3">
              {editandoPlano ? (
                <div className="space-y-3">
                  <Textarea value={plano} onChange={(e) => setPlano(e.target.value)} rows={6} aria-label="Plano de ação" autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditandoPlano(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" loading={atualizar.isPending} onClick={() => atualizar.mutate({ plano_acao: plano })}>
                      Salvar plano
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-fg/90">{nc.plano_acao || <span className="text-muted">Nenhum plano de ação registrado.</span>}</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="px-5 pt-4">
              <Tabs
                value={aba}
                onChange={setAba}
                itens={[
                  { value: 'comentarios', label: 'Comentários', count: comentarios.length },
                  { value: 'historico', label: 'Histórico de alterações', count: historico.length },
                ]}
              />
            </div>
            <div className="p-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={aba} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  {aba === 'comentarios' ? (
                    <div className="space-y-4">
              {comentarios.length === 0 && <p className="text-sm text-muted">Nenhum comentário ainda.</p>}
              {comentarios.map((c, i) => (
                <motion.div key={c.id} className="flex gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.05 }}>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-elevated text-[11px] font-semibold">{iniciais(c.autor)}</div>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-elevated px-4 py-2.5">
                    <p className="text-[12px] text-muted">
                      <span className="font-semibold text-fg">{c.autor}</span> · {fmtDataHora(c.criado_em)}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[14px]">{c.texto}</p>
                  </div>
                </motion.div>
              ))}
              <form
                className="flex items-end gap-2 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comentario.trim()) comentar.mutate(comentario.trim());
                }}
              >
                <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Escreva um comentário…" rows={2} className="min-h-[44px] min-w-0 flex-1" aria-label="Novo comentário" />
                <Button type="submit" size="icon" loading={comentar.isPending} disabled={!comentario.trim()} aria-label="Enviar comentário">
                  {!comentar.isPending && <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
                  ) : (
                    <ol className="relative space-y-4">
              {historico.length === 0 && <EmptyState className="py-4" icon={<MessageSquare className="h-5 w-5" />} title="Sem alterações registradas" />}
              {historico.map((h, i) => (
                <motion.li key={h.id} className="relative border-l border-line pl-4" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.04 }}>
                  <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-fg/50" aria-hidden />
                  <p className="text-[12px] text-muted">
                    {fmtDataHora(h.data)} · <span className="text-fg/90">{h.autor}</span>
                  </p>
                  <p className="mt-0.5 text-[13px]">
                    <span className="font-medium">{h.campo_rotulo}</span>
                    {h.campo === 'plano_acao' ? ' atualizado' : (
                      <>
                        {': '}
                        {h.valor_antigo && <span className="text-muted line-through">{h.valor_antigo}</span>} {h.valor_antigo && '→ '}
                        <span>{h.valor_novo || '—'}</span>
                      </>
                    )}
                  </p>
                </motion.li>
              ))}
            </ol>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </Card>
        </div>

        <div className="stagger space-y-4">
          <Card>
            <CardHeader title="Dados" />
            <dl className="px-5 pb-3 pt-2">
              <Linha rotulo="Área responsável">{nc.area}</Linha>
              <Linha rotulo="Resp. resolução">{nc.resp_resolucao}</Linha>
              <Linha rotulo="Verificador (Comgás)">{nc.verificador}</Linha>
              <Linha rotulo="Gerência">{nc.gerencia}</Linha>
              <Linha rotulo="Região">{nc.regiao}</Linha>
              <Linha rotulo="Data de cadastro">{fmtData(nc.data_cadastro)}</Linha>
              <Linha rotulo="Prazo">{fmtData(nc.prazo)}</Linha>
              <Linha rotulo="Data da execução">{nc.data_execucao ? fmtData(nc.data_execucao) : '—'}</Linha>
              <Linha rotulo="Dias de atraso">
                <span className={cn('tabular', nc.dias_atraso > 0 && 'text-danger')}>{nc.dias_atraso}</span>
              </Linha>
              <Linha rotulo="Atualizado em">{nc.atualizado_em ? `${fmtDataHora(nc.atualizado_em)}` : '—'}</Linha>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title={`Anexos (${anexos.length})`}
              description="Fotos e evidências (até 10 MB)"
              action={
                <>
                  <input
                    ref={inputArq}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) anexar.mutate(f);
                      e.target.value = '';
                    }}
                  />
                  <Button variant="secondary" size="sm" loading={anexar.isPending} onClick={() => inputArq.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Anexar
                  </Button>
                </>
              }
            />
            <ul className="space-y-1 p-3">
              {anexos.length === 0 && <li className="px-2 py-3 text-sm text-muted">Nenhum anexo.</li>}
              <AnimatePresence initial={false}>
                {anexos.map((a) => (
                  <motion.li
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 10, backgroundColor: 'rgb(var(--success) / 0.12)' }}
                    animate={{ opacity: 1, y: 0, backgroundColor: 'rgb(var(--success) / 0)' }}
                    exit={{ opacity: 0, x: 40, height: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.45, backgroundColor: { duration: 2.2 } }}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:!bg-elevated"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
                      {/\.(png|jpe?g|gif|webp|heic)$/i.test(a.nome_arquivo) ? <Paperclip className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{a.nome_arquivo}</p>
                      <p className="text-[12px] text-muted">
                        {a.autor} · {fmtDataHora(a.criado_em)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" loading={baixando === a.id} onClick={() => baixar(a.id)} aria-label={`Baixar ${a.nome_arquivo}`}>
                      {baixando !== a.id && <Download className="h-4 w-4" />}
                    </Button>
                    {podeExcluirAnexo && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:!bg-danger/10 hover:!text-danger" onClick={() => { setMotivoExclusao(''); setExcluir(a); }} aria-label={`Excluir ${a.nome_arquivo}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </Card>

        </div>
      </div>

      <Dialog
        open={!!excluir}
        onClose={() => setExcluir(null)}
        size="sm"
        title="Excluir anexo?"
        description="O arquivo será removido desta NC e enviado para a lixeira do Google Drive. A exclusão fica no histórico."
        footer={
          <>
            <Button variant="secondary" onClick={() => setExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="brand" loading={excluirAnexo.isPending} onClick={() => excluir && excluirAnexo.mutate(excluir.id)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated/60 p-3">
            <FileText className="h-5 w-5 text-muted" />
            <span className="truncate text-[14px] font-medium">{excluir?.nome_arquivo}</span>
          </div>
          <Field label="Motivo (opcional)" hint="Ex.: evidência recusada pela Comgás.">
            <Input value={motivoExclusao} onChange={(e) => setMotivoExclusao(e.target.value)} />
          </Field>
        </div>
      </Dialog>

      {podeEditarTudo && editar && (
        <EditarNC nc={nc} aberto={editar} fechar={() => setEditar(false)} salvando={atualizar.isPending} erro={erro} salvar={(c) => atualizar.mutate(c)} />
      )}
    </div>
  );
}
