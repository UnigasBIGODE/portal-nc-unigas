import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, mensagemErro } from '@/lib/api';
import type { ResumoArea } from '@/lib/types';
import { cn, fmtPct } from '@/lib/utils';
import { exportarTabelaExcel } from '@/lib/exportar';
import { useOpcoesFiltro, useTitulo } from '@/hooks/queries';
import { Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Select, Skeleton } from '@/components/ui';
import { RankingChart } from '@/components/charts/Charts';
import { FileSpreadsheet } from 'lucide-react';

export default function Consolidado() {
  useTitulo('Visão consolidada');
  const navigate = useNavigate();
  const { data: op } = useOpcoesFiltro();
  const [ano, setAno] = useState(new Date().getFullYear());
  const q = useQuery({ queryKey: ['resumoPorArea', ano], queryFn: () => api<{ ano: number; areas: ResumoArea[]; metaPct: number }>('resumoPorArea', { ano }) });
  const areas = (q.data?.areas ?? []).filter((a) => a.area !== 'A classificar');
  const porAtraso = [...areas].filter((a) => a.atrasadas > 0).sort((a, b) => b.atrasadas - a.atrasadas);
  const porMedia = [...areas].filter((a) => a.mediaDiasAtraso > 0).sort((a, b) => b.mediaDiasAtraso - a.mediaDiasAtraso);
  const porPct = [...areas].filter((a) => a.pctNoPrazo !== null).sort((a, b) => (b.pctNoPrazo ?? 0) - (a.pctNoPrazo ?? 0));

  return (
    <div>
      <PageHeader eyebrow="Administração"
        title="Visão consolidada"
        subtitle="Comparativo entre áreas: ranking de atraso e % de encerramento no prazo."
        actions={
          <>
            <Select className="h-9 w-28 rounded-full text-[13px]" value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano">
              {(op?.anos ?? [ano]).map((a) => <option key={a}>{a}</option>)}
            </Select>
            <Button
              variant="secondary"
              size="sm"
              disabled={!areas.length}
              onClick={() =>
                exportarTabelaExcel(
                  areas.map((a) => ({
                    Área: a.area, Responsáveis: a.responsaveis.join(', '), Abertas: a.totalAberto, 'Em execução': a.execucao, 'Em verificação': a.verificacao,
                    Atrasadas: a.atrasadas, 'Média dias atraso': a.mediaDiasAtraso, 'Exec. crítica no prazo': a.execCriticaNoPrazo, 'Exec. crítica atrasada': a.execCriticaAtrasada,
                    [`Encerradas ${ano}`]: a.encerradasAno, [`% no prazo ${ano}`]: a.pctNoPrazo ?? '',
                  })),
                  `Consolidado_areas_${ano}`,
                  'Consolidado',
                )
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </>
        }
      />
      {q.isError ? (
        <Card><ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} /></Card>
      ) : !q.data ? (
        <div className="grid gap-4 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-80" />)}</div>
      ) : (
        <>
          <div className="stagger grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Mais NCs atrasadas" description="Abertas fora do prazo" />
              <div className="p-5 pt-4">{porAtraso.length ? <RankingChart dados={porAtraso as never} chave="atrasadas" nome="Atrasadas" /> : <EmptyState title="Nenhuma atrasada 🎉" />}</div>
            </Card>
            <Card>
              <CardHeader title="Maior média de atraso" description="Dias, entre as atrasadas" />
              <div className="p-5 pt-4">{porMedia.length ? <RankingChart dados={porMedia as never} chave="mediaDiasAtraso" nome="Média (dias)" formatar={(v) => `${v.toLocaleString("pt-BR")} d`} /> : <EmptyState title="Sem atrasos 🎉" />}</div>
            </Card>
            <Card>
              <CardHeader title={`% encerradas no prazo · ${ano}`} description={`Meta: ${q.data.metaPct}%`} />
              <div className="p-5 pt-4">{porPct.length ? <RankingChart dados={porPct as never} chave="pctNoPrazo" nome="% no prazo" formatar={(v) => fmtPct(v, 0)} destacarMaior={false} /> : <EmptyState title="Sem encerramentos no ano" />}</div>
            </Card>
          </div>
          <Card className="anim-fade-up mt-4 overflow-hidden" style={{ ['--d' as string]: '300ms' }}>
            <CardHeader title="Comparativo entre áreas" />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-muted">
                    <th className="px-5 py-3 text-left font-medium">Área</th>
                    <th className="px-3 py-3 text-right font-medium">Abertas</th>
                    <th className="px-3 py-3 text-right font-medium">Execução</th>
                    <th className="px-3 py-3 text-right font-medium">Verificação</th>
                    <th className="px-3 py-3 text-right font-medium">Atrasadas</th>
                    <th className="px-3 py-3 text-right font-medium">Média atraso</th>
                    <th className="px-3 py-3 text-right font-medium">Exec. crítica (prazo / atras.)</th>
                    <th className="px-5 py-3 text-right font-medium">% no prazo {ano}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.areas.map((a) => (
                    <tr key={a.area} className="cursor-pointer border-b border-line/50 last:border-0 hover:bg-elevated" onClick={() => navigate(`/ncs?area=${encodeURIComponent(a.area)}`)}>
                      <td className={cn('px-5 py-2.5 font-medium', a.area === 'A classificar' && 'text-warning')}>{a.area}</td>
                      <td className="tabular px-3 py-2.5 text-right">{a.totalAberto}</td>
                      <td className="tabular px-3 py-2.5 text-right">{a.execucao}</td>
                      <td className="tabular px-3 py-2.5 text-right">{a.verificacao}</td>
                      <td className={cn('tabular px-3 py-2.5 text-right', a.atrasadas && 'font-semibold text-danger')}>{a.atrasadas}</td>
                      <td className="tabular px-3 py-2.5 text-right">{a.mediaDiasAtraso ? `${a.mediaDiasAtraso.toLocaleString('pt-BR')} d` : '—'}</td>
                      <td className="tabular px-3 py-2.5 text-right">{a.execCriticaNoPrazo} / <span className={cn(a.execCriticaAtrasada && 'text-danger')}>{a.execCriticaAtrasada}</span></td>
                      <td className={cn('tabular px-5 py-2.5 text-right font-semibold', a.pctNoPrazo === null ? 'text-muted' : a.pctNoPrazo >= q.data.metaPct ? 'text-success' : 'text-danger')}>{fmtPct(a.pctNoPrazo, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
