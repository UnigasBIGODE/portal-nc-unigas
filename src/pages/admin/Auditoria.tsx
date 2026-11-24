import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import { fmtDataHora } from '@/lib/utils';
import { useDebounce, useTitulo } from '@/hooks/queries';
import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '@/components/ui';
import { Paginacao } from '@/components/NcTable';

interface Reg { data: string; usuario: string; acao: string; detalhe: string }

const ROTULOS: Record<string, string> = {
  login: 'Login', importar: 'Importação', reprocessar_entrada: 'Reprocessar entrada', classificar: 'Classificação', atualizar_nc: 'Edição de NC',
  comentar: 'Comentário', anexar: 'Anexo', usuario_criar: 'Usuário criado', usuario_editar: 'Usuário editado', usuario_convidar: 'Convite',
  area_criar: 'Área criada', area_editar: 'Área editada', area_mesclar: 'Áreas mescladas', config_salvar: 'Configurações', alterar_senha: 'Troca de senha',
  definir_senha: 'Senha definida', esqueci_senha: 'Esqueci a senha',
};

export default function Auditoria() {
  useTitulo('Auditoria');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const b = useDebounce(busca);
  const q = useQuery({
    queryKey: ['auditoria', b, page],
    queryFn: () => api<{ itens: Reg[]; total: number; page: number; pageSize: number }>('auditoria', { busca: b, page, pageSize: 50 }),
    placeholderData: keepPreviousData,
  });
  return (
    <div>
      <PageHeader eyebrow="Administração" title="Auditoria" subtitle="Registro das ações feitas no portal." />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input className="h-9 rounded-full pl-10 text-[13px]" placeholder="Buscar usuário, ação, detalhe…" value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} aria-label="Buscar na auditoria" />
      </div>
      <Card className="anim-fade-up overflow-hidden">
        {q.isError ? (
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <div className="space-y-2 p-5">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : q.data.itens.length === 0 ? (
          <EmptyState title="Nenhum registro" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-muted">
                    <th className="px-5 py-3 text-left font-medium">Data</th>
                    <th className="px-3 py-3 text-left font-medium">Usuário</th>
                    <th className="px-3 py-3 text-left font-medium">Ação</th>
                    <th className="px-5 py-3 text-left font-medium">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.itens.map((r, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-0">
                      <td className="tabular whitespace-nowrap px-5 py-2.5">{fmtDataHora(r.data)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{r.usuario}</td>
                      <td className="px-3 py-2.5"><Badge>{ROTULOS[r.acao] ?? r.acao}</Badge></td>
                      <td className="max-w-[520px] truncate px-5 py-2.5 font-mono text-[12px] text-muted" title={r.detalhe}>{r.detalhe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao page={q.data.page} pageSize={q.data.pageSize} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
