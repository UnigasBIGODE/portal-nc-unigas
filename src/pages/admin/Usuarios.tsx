import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, KeyRound, MailPlus, Pencil, Plus, ShieldCheck, Trash2, Wand2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { api, mensagemErro } from '@/lib/api';
import type { UsuarioAdmin } from '@/lib/types';
import { cn, fmtDataHora, iniciais } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useTitulo } from '@/hooks/queries';
import { useNavigate } from 'react-router-dom';
import { MODO_DEMO } from '@/lib/api';
import { rotaDoLink } from '@/demo/PainelDemo';
import { Aviso, Badge, Button, Card, Dialog, ErrorState, Field, Input, PageHeader, Select, Skeleton } from '@/components/ui';

type Form = { id?: string; nome: string; email: string; tr: string; perfil: 'ADMIN' | 'RESPONSAVEL'; ativo: boolean; areas: string[]; enviarConvite: boolean };
const NOVO: Form = { nome: '', email: '', tr: '', perfil: 'RESPONSAVEL', ativo: true, areas: [], enviarConvite: true };

export default function Usuarios() {
  useTitulo('Usuários');
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['usuarios'], queryFn: () => api<{ itens: UsuarioAdmin[] }>('usuarios.listar') });
  const areas = useQuery({ queryKey: ['areas-admin'], queryFn: () => api<{ itens: { area: string; ativa: boolean }[] }>('areas.listar') });
  const [form, setForm] = useState<Form | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [link, setLink] = useState<{ nome: string; link: string; enviado: boolean } | null>(null);
  const [convidando, setConvidando] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { usuario: eu } = useAuth();
  const [senhaDe, setSenhaDe] = useState<UsuarioAdmin | null>(null);
  const [removerU, setRemoverU] = useState<UsuarioAdmin | null>(null);

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await api<{ id: string; convite: { link?: string; enviado?: boolean; erro?: string } | null }>('usuarios.salvar', form);
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      qc.invalidateQueries({ queryKey: ['areas-admin'] });
      toast({ tipo: 'sucesso', titulo: form.id ? 'Usuário atualizado' : 'Usuário criado', descricao: form.nome });
      if (r.convite?.link) setLink({ nome: form.nome, link: r.convite.link, enviado: !!r.convite.enviado });
      if (r.convite?.erro) setMsg(`Usuário salvo, mas o convite não foi enviado: ${r.convite.erro}`);
      setForm(null);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function convidar(u: UsuarioAdmin) {
    setConvidando(u.id);
    setMsg(null);
    try {
      const r = await api<{ link: string; enviado: boolean }>('usuarios.convidar', { id: u.id });
      setLink({ nome: u.nome, ...r });
    } catch (e) {
      setMsg(mensagemErro(e));
    } finally {
      setConvidando(null);
    }
  }

  const listaAreas = (areas.data?.itens ?? []).filter((a) => a.ativa).map((a) => a.area);

  return (
    <div>
      <PageHeader eyebrow="Administração"
        title="Usuários"
        subtitle="Cadastre responsáveis, vincule áreas e envie o convite para criarem a senha."
        actions={
          <Button onClick={() => { setErro(null); setForm({ ...NOVO }); }}>
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        }
      />
      {msg && <Aviso className="mb-4">{msg}</Aviso>}
      <Card className="anim-fade-up overflow-hidden">
        {q.isError ? (
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <div className="space-y-2 p-5">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-muted">
                  <th className="px-5 py-3 text-left font-medium">Nome</th>
                  <th className="px-3 py-3 text-left font-medium">Perfil / áreas</th>
                  <th className="px-3 py-3 text-left font-medium">Situação</th>
                  <th className="px-3 py-3 text-left font-medium">Último acesso</th>
                  <th className="py-3 pl-2 pr-5 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {q.data.itens.map((u) => (
                  <tr key={u.id} className={cn('border-b border-line/50 last:border-0', !u.ativo && 'opacity-55')}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-elevated text-[12px] font-semibold">{iniciais(u.nome)}</div>
                        <div className="min-w-0">
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-[12px] text-muted">
                            {u.email}
                            {u.tr && ` · ${u.tr}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-[320px] flex-wrap gap-1">
                        {u.perfil === 'ADMIN' ? (
                          <Badge tom="brand">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </Badge>
                        ) : u.areas.length ? (
                          u.areas.map((a) => <Badge key={a}>{a}</Badge>)
                        ) : (
                          <span className="text-warning">Sem área</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {!u.ativo ? <Badge>Inativo</Badge> : u.temSenha ? <Badge tom="success">Ativo</Badge> : <Badge tom="warning">Aguardando senha</Badge>}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-3 text-muted">{u.ultimo_acesso ? fmtDataHora(u.ultimo_acesso) : 'Nunca'}</td>
                    <td className="whitespace-nowrap py-3 pl-2 pr-3 text-right">
                      {u.ativo && (
                        <Button variant="ghost" size="sm" loading={convidando === u.id} onClick={() => convidar(u)} title="Enviar link para criar/redefinir senha">
                          <MailPlus className="h-4 w-4" /> {u.temSenha ? 'Redefinir' : 'Convidar'}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setErro(null); setForm({ id: u.id, nome: u.nome, email: u.email, tr: u.tr, perfil: u.perfil, ativo: u.ativo, areas: u.areas, enviarConvite: false }); }}>
                        <Pencil className="h-4 w-4" /> <span className="hidden xl:inline">Editar</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSenhaDe(u)} title="Alterar senha" aria-label={`Alterar senha de ${u.nome}`}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoverU(u)}
                        title="Remover usuário"
                        aria-label={`Remover ${u.nome}`}
                        className={cn('text-danger hover:bg-danger/10 hover:text-danger', u.id === eu?.id && 'invisible')}
                        disabled={u.id === eu?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {form && (
        <Dialog
          open
          onClose={() => setForm(null)}
          title={form.id ? 'Editar usuário' : 'Novo usuário'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button loading={salvando} onClick={salvar}>
                Salvar
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" className="sm:col-span-2">
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="TR">
              <Input value={form.tr} onChange={(e) => setForm({ ...form, tr: e.target.value })} placeholder="TR000000" />
            </Field>
            <Field label="Perfil">
              <Select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value as Form['perfil'] })}>
                <option value="RESPONSAVEL">Responsável de área</option>
                <option value="ADMIN">Administrador (Unigás SSM)</option>
              </Select>
            </Field>
            <Field label="Situação">
              <Select value={form.ativo ? '1' : '0'} onChange={(e) => setForm({ ...form, ativo: e.target.value === '1' })}>
                <option value="1">Ativo</option>
                <option value="0">Inativo (sem acesso)</option>
              </Select>
            </Field>
            {form.perfil === 'RESPONSAVEL' ? (
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-[13px] font-medium">Áreas vinculadas</legend>
                <div className="flex flex-wrap gap-2">
                  {listaAreas.map((a) => {
                    const on = form.areas.includes(a);
                    return (
                      <button
                        type="button"
                        key={a}
                        aria-pressed={on}
                        onClick={() => setForm({ ...form, areas: on ? form.areas.filter((x) => x !== a) : [...form.areas, a] })}
                        className={cn('rounded-full border px-3 py-1.5 text-[13px] transition-colors', on ? 'border-brand/50 bg-brand/12 text-fg' : 'border-line text-muted hover:text-fg')}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <p className="text-[13px] text-muted sm:col-span-2">Administradores veem todas as áreas.</p>
            )}
            {!form.id && (
              <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
                <input type="checkbox" className="h-4 w-4 accent-[#E30613]" checked={form.enviarConvite} onChange={(e) => setForm({ ...form, enviarConvite: e.target.checked })} />
                Enviar convite por e-mail agora
              </label>
            )}
          </div>
          {erro && <Aviso className="mt-4">{erro}</Aviso>}
        </Dialog>
      )}

      <DefinirSenha u={senhaDe} fechar={() => setSenhaDe(null)} />
      <RemoverUsuario
        u={removerU}
        fechar={() => setRemoverU(null)}
        removido={(u) => {
          qc.invalidateQueries({ queryKey: ['usuarios'] });
          qc.invalidateQueries({ queryKey: ['areas-admin'] });
          qc.invalidateQueries({ queryKey: ['pendencias'] });
          toast({ tipo: 'sucesso', titulo: 'Usuário removido', descricao: u.nome });
        }}
      />

      {link && (
        <Dialog open onClose={() => setLink(null)} title="Link de acesso gerado" size="sm" footer={<Button onClick={() => setLink(null)}>Fechar</Button>}>
          <p className="text-sm text-muted">
            {link.enviado ? `O e-mail foi enviado para ${link.nome}.` : 'A cota de e-mails do dia acabou — envie o link manualmente.'} Se precisar, copie o link abaixo (uso único):
          </p>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={link.link} onFocus={(e) => e.target.select()} className="text-[12px]" />
            <Button variant="secondary" size="icon" onClick={() => navigator.clipboard?.writeText(link.link).catch(() => {})} aria-label="Copiar link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {MODO_DEMO && rotaDoLink(link.link) && (
            <Button variant="brand" size="sm" className="mt-3" onClick={() => navigate(rotaDoLink(link.link)!)}>
              Abrir o link (demonstração)
            </Button>
          )}
        </Dialog>
      )}
    </div>
  );
}

function gerarSenha() {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const todos = letras + nums;
  const a = new Uint32Array(10);
  crypto.getRandomValues(a);
  let s = Array.from(a, (n) => todos[n % todos.length]).join('');
  s = s.slice(0, 8) + letras[a[8] % letras.length] + nums[a[9] % nums.length];
  return s;
}

/** Admin define a senha de um usuário (ex.: quem esqueceu e não recebe o e-mail). */
function DefinirSenha({ u, fechar }: { u: UsuarioAdmin | null; fechar: () => void }) {
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  if (u && aberto !== u.id) {
    setAberto(u.id);
    setSenha('');
    setErro(null);
    setFeito(false);
  }
  const valida = senha.length >= 8 && /[A-Za-z]/.test(senha) && /\d/.test(senha);
  async function salvar() {
    if (!u) return;
    setSalvando(true);
    setErro(null);
    try {
      await api('usuarios.definirSenha', { id: u.id, senha });
      setFeito(true);
      toast({ tipo: 'sucesso', titulo: 'Senha alterada', descricao: u.nome });
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }
  const sair = () => {
    setAberto(null);
    fechar();
  };
  return (
    <Dialog
      open={!!u}
      onClose={sair}
      size="sm"
      title={feito ? 'Senha alterada' : `Alterar senha · ${u?.nome ?? ''}`}
      description={feito ? undefined : 'Defina a nova senha e passe para a pessoa por um canal seguro. Ela pode trocar depois em “Configurações da conta”.'}
      footer={
        feito ? (
          <Button onClick={sair}>Fechar</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={sair} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={salvar} loading={salvando} disabled={!valida}>
              <KeyRound className="h-4 w-4" /> Salvar senha
            </Button>
          </>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {feito ? (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3 text-sm">
            <p className="text-muted">
              A nova senha de <b className="text-fg">{u?.nome}</b> ({u?.email}) é:
            </p>
            <div className="flex gap-2">
              <Input readOnly value={senha} onFocus={(e) => e.target.select()} className="tabular font-semibold tracking-wider" />
              <Button variant="secondary" size="icon" onClick={() => navigator.clipboard?.writeText(senha).then(() => toast({ tipo: 'sucesso', titulo: 'Senha copiada' })).catch(() => {})} aria-label="Copiar senha">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[12px] text-muted">As sessões abertas dessa pessoa foram encerradas; ela precisa entrar de novo com a senha nova.</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <Field label="Nova senha" hint="Mínimo 8 caracteres, com letras e números.">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={ver ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} className="pr-10 tracking-wide" autoComplete="new-password" autoFocus />
                  <button type="button" onClick={() => setVer((v) => !v)} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-fg" aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}>
                    {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="secondary" onClick={() => { setSenha(gerarSenha()); setVer(true); }} title="Gerar senha aleatória">
                  <Wand2 className="h-4 w-4" /> Gerar
                </Button>
              </div>
            </Field>
            {erro && <Aviso>{erro}</Aviso>}
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

/** Remoção definitiva (comentários e histórico ficam, com o nome marcado como “removido”). */
function RemoverUsuario({ u, fechar, removido }: { u: UsuarioAdmin | null; fechar: () => void; removido: (u: UsuarioAdmin) => void }) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function remover() {
    if (!u) return;
    setSalvando(true);
    setErro(null);
    try {
      await api('usuarios.remover', { id: u.id });
      removido(u);
      fechar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }
  return (
    <Dialog
      open={!!u}
      onClose={() => { if (!salvando) { setErro(null); fechar(); } }}
      size="sm"
      title="Remover usuário?"
      footer={
        <>
          <Button variant="secondary" onClick={() => { setErro(null); fechar(); }} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={remover} loading={salvando}>
            <Trash2 className="h-4 w-4" /> Remover
          </Button>
        </>
      }
    >
      {u && (
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-elevated p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-danger/10 font-semibold text-danger">{iniciais(u.nome)}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{u.nome}</p>
              <p className="truncate text-[12px] text-muted">{u.email}</p>
            </div>
          </div>
          <p className="text-muted">
            A pessoa perde o acesso na hora e sai da lista. Comentários e histórico continuam nas NCs, com o nome marcado como “(removido)”.
            {u.areas.length > 0 && (
              <>
                {' '}
                As áreas <b className="text-fg">{u.areas.join(', ')}</b> podem ficar sem responsável.
              </>
            )}
          </p>
          <p className="text-[12px] text-muted">Se a pessoa pode voltar, prefira <b>Editar › desativar</b>.</p>
          {erro && <Aviso>{erro}</Aviso>}
        </div>
      )}
    </Dialog>
  );
}
