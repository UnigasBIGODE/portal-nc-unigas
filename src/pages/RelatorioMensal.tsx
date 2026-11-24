import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileSpreadsheet, MinusCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { NumeroAnimado } from '@/components/KpiCard';
import { api, mensagemErro } from '@/lib/api';
import type { Relatorio } from '@/lib/types';
import { cn, fmtPct } from '@/lib/utils';
import { exportarTabelaExcel } from '@/lib/exportar';
import { useAuth } from '@/context/AuthContext';
import { useOpcoesFiltro, useTitulo } from '@/hooks/queries';
import { Badge, Button, Card, CardHeader, ErrorState, PageHeader, Select, Skeleton } from '@/components/ui';

function StatusMeta({ ok }: { ok: boolean | null }) {
  if (ok === null)
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-muted">
        <MinusCircle className="h-3.5 w-3.5" /> Sem encerramentos
      </span>
    );
  return (
    <motion.span className="inline-block" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.3 }}>
      {ok ? (
        <Badge tom="success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Meta atingida
        </Badge>
      ) : (
        <Badge tom="danger">
          <XCircle className="h-3.5 w-3.5" /> Abaixo da meta
        </Badge>
      )}
    </motion.span>
  );
}

export default function RelatorioMensal() {
  useTitulo('Relatório Mensal');
  const { isAdmin, usuario } = useAuth();
  const { data: op } = useOpcoesFiltro();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [area, setArea] = useState('');
  const q = useQuery({
    queryKey: ['relatorio', ano, area],
    queryFn: () => api<Relatorio>('relatorioMensal', { ano, filtros: area ? { area } : {} }),
    placeholderData: keepPreviousData,
  });
  const r = q.data;
  const anos = Array.from(new Set([...(r?.anos ?? []), ...(op?.anos ?? []), ano])).sort((a, b) => b - a);

  return (
    <div>
      <PageHeader eyebrow="Indicadores"
        title="Relatório de encerramento mensal"
        subtitle={r ? `Meta de NCs encerradas no prazo: ${r.meta}%` : ' '}
        actions={
          <>
            {(isAdmin || (usuario?.areas.length ?? 0) > 1) && (
              <Select className="h-9 w-48 rounded-full text-[13px]" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área">
                <option value="">Todas as áreas</option>
                {op?.areas.map((a) => <option key={a}>{a}</option>)}
              </Select>
            )}
            <Select className="h-9 w-28 rounded-full text-[13px]" value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano">
              {anos.map((a) => <option key={a}>{a}</option>)}
            </Select>
            <Button
              variant="secondary"
              size="sm"
              disabled={!r}
              onClick={() =>
                r &&
                exportarTabelaExcel(
                  [...r.linhas, { ...r.total, rotulo: 'Total' }].map((l) => ({
                    Mês: l.rotulo,
                    'Total encerradas': l.total,
                    'No prazo': l.noPrazo,
                    'Fora do prazo': l.foraPrazo,
                    '% no prazo': l.pct === null ? '' : l.pct,
                    Status: l.atingiuMeta === null ? '' : l.atingiuMeta ? 'Meta atingida' : 'Abaixo da meta',
                  })),
                  `NC_Encerradas_Mes_${ano}`,
                  'NC Encerradas Mês',
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </>
        }
      />
      <Card className="anim-fade-up overflow-hidden">
        <CardHeader title={`NC encerradas por mês · ${ano}${area ? ` · ${area}` : ''}`} description="Mês de encerramento = mês da data de execução das NCs finalizadas" />
        {q.isError && !r ? (
          <ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} />
        ) : !r ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className={cn('w-full min-w-[620px] text-[13px] sm:text-[14px]', q.isFetching && 'opacity-60')}>
              <thead>
                <tr className="border-b border-line bg-elevated/60 text-[11px] uppercase tracking-[0.06em] text-muted">
                  <th scope="col" className="px-5 py-3 text-left font-medium">Mês</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Total encerradas</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">No prazo</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Fora do prazo</th>
                  <th scope="col" className="min-w-[180px] px-3 py-3 text-left font-medium">% no prazo</th>
                  <th scope="col" className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {r.linhas.map((l, i) => (
                  <tr key={l.mes} className="anim-fade-in border-b border-line/60 transition-colors hover:bg-elevated/60" style={{ ['--d' as string]: `${i * 40}ms` }}>
                    <td className="px-5 py-3 font-medium">{l.rotulo}</td>
                    <td className="tabular px-3 py-3 text-right">{l.total || '—'}</td>
                    <td className="tabular px-3 py-3 text-right text-success">{l.total ? l.noPrazo : '—'}</td>
                    <td className="tabular px-3 py-3 text-right text-danger">{l.total ? l.foraPrazo : '—'}</td>
                    <td className="px-3 py-3">
                      {l.pct !== null && (
                        <div className="flex items-center gap-3">
                          <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-elevated">
                            <div className={cn('anim-grow-x h-full rounded-full', l.atingiuMeta ? 'bg-success' : 'bg-brand')} style={{ width: `${l.pct}%`, ['--d' as string]: `${200 + i * 50}ms` }} />
                          </div>
                          <span className="tabular font-semibold">{fmtPct(l.pct)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusMeta ok={l.atingiuMeta} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-elevated/60 font-semibold">
                  <td className="px-5 py-3">Total {ano}</td>
                  <td className="tabular px-3 py-3 text-right"><NumeroAnimado valor={r.total.total} /></td>
                  <td className="tabular px-3 py-3 text-right text-success"><NumeroAnimado valor={r.total.noPrazo} /></td>
                  <td className="tabular px-3 py-3 text-right text-danger"><NumeroAnimado valor={r.total.foraPrazo} /></td>
                  <td className="tabular px-3 py-3"><NumeroAnimado valor={r.total.pct} casas={1} sufixo="%" /></td>
                  <td className="px-5 py-3">
                    <StatusMeta ok={r.total.atingiuMeta} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
