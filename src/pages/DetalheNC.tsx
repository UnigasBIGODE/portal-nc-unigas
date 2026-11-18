import { useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { ArrowLeft, Check, Download, FileText, MessageSquare, Paperclip, Pencil, Send, Upload } from 'lucide-react';
import { api, arquivoParaBase64, baixarBase64, mensagemErro } from '@/lib/api';
import type { DetalheNC as DetalheT, NC } from '@/lib/types';
import { cn, fmtData, fmtDataHora, iniciais } from '@/lib/utils';
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

export default function DetalheNC() {
  const { id } = useParams();
  useTitulo(`NC ${id}`);
  const qc = useQueryClient();
  const chave = ['nc', id];
  const q = useQuery({ queryKey: chave, queryFn: () => api<DetalheT>('detalheNC', { nc_id: Number(id) }) });
  const [editandoPlano, setEditandoPlano] = useState(false);
  const [plano, setPlano] = useState('');
  const [comentario, setComentario] = useState('');
  const [editar, setEditar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const inputArq = useRef<HTMLInputElement>(null);
  const [aba, setAba] = useState<'comentarios' | 'historico'>('comentarios');
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

  const { nc, comentarios, anexos, historico, podeEditarTudo } = q.data;

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
          {podeEditarTudo && (
            <Button variant="secondary" size="sm" onClick={() => { setErro(null); setEditar(true); }}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          )}
        </div>
        <div className="mt-8">
          <LinhaDoTempo nc={nc} />
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
              description="Atualize o andamento das ações corretivas"
              action={
                !editandoPlano && (
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
              {anexos.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-elevated">
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
                </li>
              ))}
            </ul>
          </Card>

        </div>
      </div>

      {podeEditarTudo && editar && (
        <EditarNC nc={nc} aberto={editar} fechar={() => setEditar(false)} salvando={atualizar.isPending} erro={erro} salvar={(c) => atualizar.mutate(c)} />
      )}
    </div>
  );
}
