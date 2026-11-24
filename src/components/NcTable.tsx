import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import type { NC } from '@/lib/types';
import { cn, fmtData } from '@/lib/utils';
import { AlertaBadge, CriticidadeBadge, EtapaBadge, StatusPrazoBadge } from './StatusBadges';
import { Button, EmptyState, Skeleton } from './ui';

const col = createColumnHelper<NC>();

/** Colunas secundárias somem em telas menores (prioridade de informação). */
const RESPONSIVO: Record<string, string> = {
  gerencia: 'hidden 2xl:table-cell',
  data_execucao: 'hidden xl:table-cell',
  data_cadastro: 'hidden lg:table-cell',
};

export const COLUNAS_PADRAO = [
  'nc_id', 'area', 'titulo', 'criticidade', 'gerencia', 'data_cadastro', 'prazo', 'data_execucao', 'etapa', 'status_prazo', 'dias_atraso',
] as const;

function todasColunas(selecao?: (nc: NC) => ReactNode) {
  const cols: ColumnDef<NC, any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (selecao) cols.push(col.display({ id: 'sel', header: '', cell: (c) => selecao(c.row.original), enableSorting: false }));
  cols.push(
    col.accessor('nc_id', { header: 'NC ID', cell: (c) => <span className="tabular font-semibold">{c.getValue()}</span> }),
    col.accessor('area', { header: 'Área', cell: (c) => <span className={cn('whitespace-nowrap', c.getValue() === 'A classificar' && 'font-medium text-warning')}>{c.getValue()}</span> }),
    col.accessor('titulo', {
      header: 'Título',
      cell: (c) => (
        <span className="line-clamp-2 min-w-[220px] max-w-[340px]" title={c.getValue()}>
          {c.getValue() || '—'}
        </span>
      ),
    }),
    col.accessor('criticidade', { header: 'Crit.', cell: (c) => <CriticidadeBadge valor={c.getValue()} compacto /> }),
    col.accessor('gerencia', { header: 'Gerência', cell: (c) => <span className="whitespace-nowrap text-muted">{c.getValue() || '—'}</span> }),
    col.accessor('data_cadastro', { header: 'Cadastro', cell: (c) => <span className="tabular whitespace-nowrap">{fmtData(c.getValue())}</span> }),
    col.accessor('prazo', { header: 'Prazo', cell: (c) => <span className="tabular whitespace-nowrap">{fmtData(c.getValue())}</span> }),
    col.accessor('data_execucao', { header: 'Execução', cell: (c) => <span className="tabular whitespace-nowrap">{c.getValue() ? fmtData(c.getValue()) : '—'}</span> }),
    col.accessor('etapa', { header: 'Etapa', cell: (c) => <EtapaBadge etapa={c.getValue()} curto /> }),
    col.accessor('status_prazo', { header: 'Status', cell: (c) => <StatusPrazoBadge status={c.getValue()} /> }),
    col.accessor('dias_atraso', {
      header: 'Atraso',
      cell: (c) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <span className={cn('tabular font-semibold', c.getValue() > 0 ? 'text-danger' : 'text-muted')}>{c.getValue() ? `${c.getValue()} d` : '—'}</span>
          {c.row.original.aberta && c.row.original.nivel_alerta && <AlertaBadge nivel={c.row.original.nivel_alerta} />}
        </span>
      ),
    }),
  );
  return cols;
}

export function NcTable({
  itens,
  carregando,
  sorting,
  onSortingChange,
  colunas,
  selecao,
  vazio,
}: {
  itens: NC[];
  carregando?: boolean;
  sorting?: SortingState;
  onSortingChange?: (s: SortingState) => void;
  colunas?: readonly string[];
  selecao?: (nc: NC) => ReactNode;
  vazio?: ReactNode;
}) {
  const navigate = useNavigate();
  const columns = useMemo(() => {
    const todas = todasColunas(selecao);
    return colunas ? todas.filter((c) => c.id === 'sel' || colunas.includes((c as { accessorKey?: string }).accessorKey ?? c.id ?? '')) : todas;
  }, [colunas, selecao]);

  const table = useReactTable({
    data: itens,
    columns,
    state: { sorting: sorting ?? [] },
    manualSorting: true,
    enableSorting: !!onSortingChange,
    onSortingChange: (u) => onSortingChange?.(typeof u === 'function' ? u(sorting ?? []) : u),
    getCoreRowModel: getCoreRowModel(),
  });

  if (carregando && !itens.length) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (!itens.length) return <>{vazio ?? <EmptyState icon={<Inbox className="h-5 w-5" />} title="Nenhuma NC encontrada" description="Ajuste os filtros ou a busca." />}</>;

  return (
    <>
      {/* Desktop/tablet: tabela */}
      <div className={cn('hidden overflow-x-auto xl:block', carregando && 'opacity-60 transition-opacity')}>
        <table className="w-full text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line bg-elevated/60">
                {hg.headers.map((h) => {
                  const pode = h.column.getCanSort() && h.column.id !== 'sel';
                  const dir = h.column.getIsSorted();
                  return (
                    <th key={h.id} scope="col" className={cn(RESPONSIVO[h.column.id], 'whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted first:pl-5 last:pr-5')} aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}>
                      {pode ? (
                        <button className="inline-flex items-center gap-1 hover:text-fg" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : dir === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
                <th aria-hidden className="w-8" />
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r, i) => (
              <motion.tr
                key={r.original.nc_id}
                layout="position"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 14) * 0.03, duration: 0.35, ease: [0.2, 0.8, 0.2, 1], layout: { type: 'spring', stiffness: 380, damping: 34 } }}
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('input,button,a,label')) return;
                  navigate(`/ncs/${r.original.nc_id}`);
                }}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/ncs/${r.original.nc_id}`)}
                className="group/row cursor-pointer border-b border-line/60 transition-colors duration-200 last:border-0 hover:bg-brand/[0.03] focus:bg-elevated"
              >
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className={cn(RESPONSIVO[c.column.id], 'px-3 py-3.5 align-middle first:pl-5 last:pr-5')}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
                <td className="w-8 pr-4">
                  <ChevronRight className="h-4 w-4 -translate-x-2 text-muted opacity-0 transition-all duration-200 group-hover/row:translate-x-0 group-hover/row:opacity-100" />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Celular: cards */}
      <ul className={cn('divide-y divide-line/60 xl:hidden', carregando && 'opacity-60')}>
        {itens.map((n, i) => (
          <li key={n.nc_id} className="anim-fade-up flex gap-3 px-4 py-4" style={{ ['--d' as string]: `${Math.min(i, 10) * 45}ms` }}>
            {selecao && <div className="pt-1">{selecao(n)}</div>}
            <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/ncs/${n.nc_id}`)}>
              <div className="flex items-center justify-between gap-2">
                <span className="tabular font-semibold">NC {n.nc_id}</span>
                <StatusPrazoBadge status={n.status_prazo} dias={n.dias_atraso} />
              </div>
              <p className="mt-1 line-clamp-2 text-[14px]">{n.titulo}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <EtapaBadge etapa={n.etapa} curto />
                <span>{n.area}</span>·<span>Prazo {fmtData(n.prazo)}</span>
                <CriticidadeBadge valor={n.criticidade} compacto />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Paginacao({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const ini = (page - 1) * pageSize + 1;
  const fim = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-muted">
      <span className="tabular">
        {ini}–{fim} de {total.toLocaleString('pt-BR')}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular">
          {page} / {paginas}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= paginas} onClick={() => onPage(page + 1)} aria-label="Próxima página">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
