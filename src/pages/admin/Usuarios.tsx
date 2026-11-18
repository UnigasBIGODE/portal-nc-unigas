import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MailPlus, Pencil, Plus, ShieldCheck } from 'lucide-react';
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
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
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
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {u.ativo && (
                        <Button variant="ghost" size="sm" loading={convidando === u.id} onClick={() => convidar(u)} title="Enviar link para criar/redefinir senha">
                          <MailPlus className="h-4 w-4" /> {u.temSenha ? 'Redefinir' : 'Convidar'}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setErro(null); setForm({ id: u.id, nome: u.nome, email: u.email, tr: u.tr, perfil: u.perfil, ativo: u.ativo, areas: u.areas, enviarConvite: false }); }}>
                        <Pencil className="h-4 w-4" /> Editar
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
