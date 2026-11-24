import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { FileDown, FileSpreadsheet, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { NumeroAnimado } from '@/components/KpiCard';
import { api, mensagemErro } from '@/lib/api';
import type { FiltrosNC, ListaNCs as ListaT } from '@/lib/types';
import { limparFiltros } from '@/lib/utils';
import { exportarExcel, exportarPDF } from '@/lib/exportar';
import { useAuth } from '@/context/AuthContext';
import { useDebounce, useTitulo } from '@/hooks/queries';
import { Aviso, Button, Card, ErrorState, Input, PageHeader, Pills } from '@/components/ui';
import { FiltrosBar } from '@/components/FiltrosBar';
import { NcTable, Paginacao } from '@/components/NcTable';

const ABAS = [
  { value: '', label: 'Todas', chave: 'todas' },
  { value: 'execucao', label: 'Em execução', chave: 'execucao' },
  { value: 'verificacao', label: 'Em verificação', chave: 'verificacao' },
  { value: 'finalizadas', label: 'Finalizadas', chave: 'finalizadas' },
  { value: 'atrasadas', label: 'Atrasadas', chave: 'atrasadas' },
] as const;
const CAMPOS_FILTRO = ['area', 'gerencia', 'etapa', 'criticidade', 'regiao', 'status', 'verificador', 'aba', 'busca', 'cadastro_de', 'cadastro_ate'] as const;
const PAGE_SIZE = 25;

export default function ListaNCs() {
  useTitulo('Não Conformidades');
  const { config } = useAuth();
  const [params, setParams] = useSearchParams();
  const filtros = useMemo(() => {
    const f: FiltrosNC = {};
    CAMPOS_FILTRO.forEach((k) => {
      const v = params.get(k);
      if (v) f[k] = v;
    });
    return f;
  }, [params]);
  const page = Number(params.get('page') || 1);
  const sorting: SortingState = params.get('ordem') ? [{ id: params.get('ordem')!, desc: params.get('dir') !== 'asc' }] : [];
  const [busca, setBusca] = useState(filtros.busca ?? '');
  const buscaDeb = useDebounce(busca, 450);
  const [exportando, setExportando] = useState<'xlsx' | 'pdf' | null>(null);
  const [erroExport, setErroExport] = useState<string | null>(null);

  const atualizar = (novo: Record<string, string | undefined>, manterPagina = false) => {
    const p = new URLSearchParams(params);
    Object.entries(novo).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!manterPagina) p.delete('page');
    setParams(p, { replace: true });
  };

  useEffect(() => {
    if ((filtros.busca ?? '') !== buscaDeb) atualizar({ busca: buscaDeb || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDeb]);
  useEffect(() => {
    setBusca(params.get('busca') ?? '');
  }, [params]);

  const ordem = sorting[0] ? { campo: sorting[0].id, dir: sorting[0].desc ? 'desc' : 'asc' } : undefined;
  const q = useQuery({
    queryKey: ['ncs', filtros, page, ordem],
    queryFn: () => api<ListaT>('listarNCs', { filtros: limparFiltros(filtros), page, pageSize: PAGE_SIZE, ordem }),
    placeholderData: keepPreviousData,
  });

  async function exportar(tipo: 'xlsx' | 'pdf') {
    setExportando(tipo);
    setErroExport(null);
    try {
      const todos = await api<ListaT>('listarNCs', { filtros: limparFiltros(filtros), page: 1, pageSize: 5000, ordem, completo: true });
      const desc = Object.entries(limparFiltros(filtros))
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      if (tipo === 'xlsx') await exportarExcel(todos.itens, 'NCs_Unigas', config?.rotulosCriticidade);
      else await exportarPDF(todos.itens, 'Não Conformidades', desc);
    } catch (e) {
      setErroExport(mensagemErro(e));
    } finally {
      setExportando(null);
    }
  }

  const cont = q.data?.contagens;
  const ROTULOS: Record<string, string> = { area: 'Área', gerencia: 'Gerência', etapa: 'Etapa', criticidade: 'Criticidade', regiao: 'Região', status: 'Status', verificador: 'Verificador', busca: 'Busca' };
  const chips = Object.entries(ROTULOS)
    .filter(([k]) => filtros[k as keyof FiltrosNC])
    .map(([k, rotulo]) => ({ k, rotulo, v: filtros[k as keyof FiltrosNC] as string }));

  return (
    <div>
      <PageHeader
        title="Não Conformidades"
        eyebrow="Gestão"
        subtitle={q.data ? <><b className="tabular text-fg"><NumeroAnimado valor={q.data.total} /></b> NC(s) encontradas com os filtros atuais</> : 'Carregando…'}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportar('xlsx')} loading={exportando === 'xlsx'} disabled={!q.data?.total}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportar('pdf')} loading={exportando === 'pdf'} disabled={!q.data?.total}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />
      {erroExport && <Aviso className="mb-4">{erroExport}</Aviso>}

      <Pills
        label="Abas rápidas"
        className="mb-4 w-fit max-w-full"
        value={filtros.aba ?? ''}
        onChange={(v) => atualizar({ aba: v || undefined })}
        itens={ABAS.map((a) => ({ value: a.value, label: a.label, count: cont?.[a.chave] }))}
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full xl:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="NC ID, título, endereço, descrição…" className="h-9 rounded-full pl-10 text-[13px]" aria-label="Buscar" />
        </div>
        <FiltrosBar
          valor={filtros}
          onChange={(f) => atualizar({ area: f.area, gerencia: f.gerencia, etapa: f.etapa, criticidade: f.criticidade, regiao: f.regiao, status: f.status, verificador: f.verificador })}
          campos={['area', 'gerencia', 'etapa', 'criticidade', 'regiao', 'status']}
        />
      </div>

      <div className="mb-4 flex min-h-[8px] flex-wrap items-center gap-2">
        <AnimatePresence initial={false}>
          {chips.map((c) => (
            <motion.button
              key={c.k}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              onClick={() => atualizar({ [c.k]: undefined })}
              className="group inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/[0.06] py-1 pl-3 pr-1.5 text-[12px] font-medium text-fg transition-colors hover:border-brand/40"
              aria-label={`Remover filtro ${c.rotulo}: ${c.v}`}
            >
              <span className="text-muted">{c.rotulo}:</span> {c.v}
              <span className="grid h-4 w-4 place-items-center rounded-full bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <X className="h-3 w-3" />
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <Card className="anim-fade-up overflow-hidden">
        {q.isError && !q.data ? (
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        ) : (
          <>
            <NcTable
              itens={q.data?.itens ?? []}
              carregando={q.isFetching}
              sorting={sorting}
              onSortingChange={(s) => atualizar({ ordem: s[0]?.id, dir: s[0] ? (s[0].desc ? 'desc' : 'asc') : undefined })}
            />
            {q.data && <Paginacao page={q.data.page} pageSize={q.data.pageSize} total={q.data.total} onPage={(p) => atualizar({ page: String(p) }, true)} />}
          </>
        )}
      </Card>
    </div>
  );
}
