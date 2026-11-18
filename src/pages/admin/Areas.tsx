import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GitMerge, Pencil, Plus } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import type { AreaAdmin } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useTitulo } from '@/hooks/queries';
import { Aviso, Badge, Button, Card, Dialog, ErrorState, Field, Input, PageHeader, Select, Skeleton } from '@/components/ui';

type Form = { nomeAntigo?: string; area: string; descricao: string; ativa: boolean };

export default function Areas() {
  useTitulo('Áreas');
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['areas-admin'], queryFn: () => api<{ itens: AreaAdmin[]; aClassificar: number }>('areas.listar') });
  const [form, setForm] = useState<Form | null>(null);
  const [mesclar, setMesclar] = useState<{ origem: string; destino: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function executar(acao: string, payload: unknown, fechar: () => void) {
    setSalvando(true);
    setErro(null);
    try {
      await api(acao, payload);
      qc.invalidateQueries();
      toast({ tipo: 'sucesso', titulo: acao === 'areas.mesclar' ? 'Áreas mescladas' : 'Área salva' });
      fechar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const itens = q.data?.itens ?? [];

  return (
    <div>
      <PageHeader eyebrow="Administração"
        title="Áreas"
        subtitle="Renomear uma área atualiza as NCs e os vínculos dos responsáveis. Mesclar move tudo para a área de destino."
        actions={
          <>
            <Button variant="secondary" onClick={() => { setErro(null); setMesclar({ origem: '', destino: '' }); }}>
              <GitMerge className="h-4 w-4" /> Mesclar
            </Button>
            <Button onClick={() => { setErro(null); setForm({ area: '', descricao: '', ativa: true }); }}>
              <Plus className="h-4 w-4" /> Nova área
            </Button>
          </>
        }
      />
      {!!q.data?.aClassificar && (
        <Aviso tom="warning" className="mb-4">
          Há {q.data.aClassificar} NC(s) sem área.{' '}
          <button className="font-semibold underline" onClick={() => navigate('/admin/classificacao')}>
            Classificar agora
          </button>
        </Aviso>
      )}
      <Card className="anim-fade-up overflow-hidden">
        {q.isError ? (
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <div className="space-y-2 p-5">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-muted">
                  <th className="px-5 py-3 text-left font-medium">Área</th>
                  <th className="px-3 py-3 text-left font-medium">Responsáveis</th>
                  <th className="px-3 py-3 text-right font-medium">Abertas</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 text-left font-medium">Situação</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {itens.map((a) => (
                  <tr key={a.area} className={cn('border-b border-line/50 last:border-0', !a.ativa && 'opacity-55')}>
                    <td className="px-5 py-3">
                      <button className="text-left font-medium hover:text-brand" onClick={() => navigate(`/ncs?area=${encodeURIComponent(a.area)}`)}>
                        {a.area}
                      </button>
                      {a.descricao && <p className="text-[12px] text-muted">{a.descricao}</p>}
                    </td>
                    <td className="px-3 py-3">{a.responsaveis.length ? a.responsaveis.join(', ') : <span className="text-warning">A definir</span>}</td>
                    <td className="tabular px-3 py-3 text-right">{a.abertas}</td>
                    <td className="tabular px-3 py-3 text-right text-muted">{a.total}</td>
                    <td className="px-3 py-3">{a.ativa ? <Badge tom="success">Ativa</Badge> : <Badge>Inativa</Badge>}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setErro(null); setForm({ nomeAntigo: a.area, area: a.area, descricao: a.descricao, ativa: a.ativa }); }}>
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
      <p className="mt-3 text-[12px] text-muted">Para vincular responsáveis a uma área, edite o usuário em Administração › Usuários.</p>

      {form && (
        <Dialog
          open
          onClose={() => setForm(null)}
          title={form.nomeAntigo ? `Editar “${form.nomeAntigo}”` : 'Nova área'}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button loading={salvando} onClick={() => executar('areas.salvar', form, () => setForm(null))}>
                Salvar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Nome" hint={form.nomeAntigo && form.nomeAntigo !== form.area ? 'Todas as NCs desta área serão renomeadas.' : undefined}>
              <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </Field>
            <Field label="Descrição">
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </Field>
            <Field label="Situação">
              <Select value={form.ativa ? '1' : '0'} onChange={(e) => setForm({ ...form, ativa: e.target.value === '1' })}>
                <option value="1">Ativa</option>
                <option value="0">Inativa</option>
              </Select>
            </Field>
            {erro && <Aviso>{erro}</Aviso>}
          </div>
        </Dialog>
      )}

      {mesclar && (
        <Dialog
          open
          onClose={() => setMesclar(null)}
          title="Mesclar áreas"
          description="As NCs e responsáveis da origem passam para o destino, e a origem é excluída."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setMesclar(null)}>
                Cancelar
              </Button>
              <Button variant="brand" loading={salvando} disabled={!mesclar.origem || !mesclar.destino || mesclar.origem === mesclar.destino} onClick={() => executar('areas.mesclar', mesclar, () => setMesclar(null))}>
                Mesclar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Origem (será excluída)">
              <Select value={mesclar.origem} onChange={(e) => setMesclar({ ...mesclar, origem: e.target.value })}>
                <option value="">Escolha…</option>
                {itens.map((a) => <option key={a.area}>{a.area}</option>)}
              </Select>
            </Field>
            <Field label="Destino">
              <Select value={mesclar.destino} onChange={(e) => setMesclar({ ...mesclar, destino: e.target.value })}>
                <option value="">Escolha…</option>
                {itens.filter((a) => a.area !== mesclar.origem).map((a) => <option key={a.area}>{a.area}</option>)}
              </Select>
            </Field>
            {erro && <Aviso>{erro}</Aviso>}
          </div>
        </Dialog>
      )}
    </div>
  );
}
