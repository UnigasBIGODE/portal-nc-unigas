import { useToast } from '@/components/Toast';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Tags } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import type { ListaNCs, NC } from '@/lib/types';
import { useOpcoesFiltro, useTitulo } from '@/hooks/queries';
import { Aviso, Button, Card, EmptyState, ErrorState, PageHeader, Select } from '@/components/ui';
import { NcTable } from '@/components/NcTable';

export default function Classificacao() {
  useTitulo('Classificação');
  const qc = useQueryClient();
  const toast = useToast();
  const { data: op } = useOpcoesFiltro();
  const q = useQuery({ queryKey: ['fila-classificacao'], queryFn: () => api<ListaNCs>('listarNCs', { filtros: { area: 'A classificar' }, pageSize: 500, ordem: { campo: 'data_cadastro', dir: 'desc' } }) });
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [area, setArea] = useState('');
  const [msg, setMsg] = useState<{ tom: 'success' | 'danger'; t: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const itens = q.data?.itens ?? [];

  const alternar = useCallback((id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const selecao = useCallback(
    (nc: NC) => <input type="checkbox" className="h-4 w-4 accent-[#E30613]" checked={sel.has(nc.nc_id)} onChange={() => alternar(nc.nc_id)} aria-label={`Selecionar NC ${nc.nc_id}`} />,
    [sel, alternar],
  );

  async function classificar() {
    setSalvando(true);
    setMsg(null);
    try {
      const r = await api<{ atualizadas: number }>('classificar', { nc_ids: [...sel], area });
      toast({ tipo: 'sucesso', titulo: `${r.atualizadas} NC(s) classificada(s)`, descricao: `Agora visíveis para a área “${area}”.` });
      setMsg(null);
      setSel(new Set());
      qc.invalidateQueries();
    } catch (e) {
      setMsg({ tom: 'danger', t: mensagemErro(e) });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Fila de classificação" subtitle="NCs sem área responsável. Elas só aparecem para o administrador até serem classificadas." />
      {msg && <Aviso tom={msg.tom} className="mb-4">{msg.t}</Aviso>}
      <Card className="anim-fade-up overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <label className="inline-flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#E30613]"
              checked={itens.length > 0 && sel.size === itens.length}
              onChange={(e) => setSel(e.target.checked ? new Set(itens.map((n) => n.nc_id)) : new Set())}
            />
            Selecionar todas ({itens.length})
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select className="h-9 w-56 rounded-full text-[13px]" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área de destino">
              <option value="">Escolha a área…</option>
              {op?.areas.filter((a) => a !== 'A classificar').map((a) => <option key={a}>{a}</option>)}
            </Select>
            <Button size="sm" disabled={!sel.size || !area} loading={salvando} onClick={classificar}>
              <Tags className="h-4 w-4" /> Classificar {sel.size || ''}
            </Button>
          </div>
        </div>
        {q.isError ? (
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        ) : (
          <NcTable
            itens={itens}
            carregando={q.isFetching}
            selecao={selecao}
            colunas={['nc_id', 'titulo', 'criticidade', 'verificador', 'gerencia', 'data_cadastro', 'prazo', 'etapa', 'status_prazo']}
            vazio={<EmptyState icon={<CheckCircle2 className="h-5 w-5 text-success" />} title="Tudo classificado" description="Nenhuma NC sem área responsável." />}
          />
        )}
      </Card>
    </div>
  );
}
