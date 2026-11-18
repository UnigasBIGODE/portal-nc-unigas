/**
 * Gráficos (Recharts): barras em gradiente de cinza com a série de destaque
 * em vermelho Unigás. Tooltips e legendas em texto (acessibilidade).
 */
import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Dashboard } from '@/lib/types';
import { fmtPct } from '@/lib/utils';

const BRAND = 'rgb(var(--brand))';
const MUTED = 'rgb(var(--muted))';
const GRID = 'rgb(var(--chart-grid))';
const eixo = { stroke: MUTED, tick: { fill: MUTED, fontSize: 12 }, tickLine: false, axisLine: false } as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Dica({ active, payload, label, formatar }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="anim-scale-in rounded-xl border border-line bg-card/95 px-3 py-2 text-[12px] shadow-pop backdrop-blur">
      {label !== undefined && <p className="mb-1 font-semibold text-fg">{label}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color === 'url' ? MUTED : p.payload?.fill ?? p.color }} />
          {p.name}: <span className="tabular font-semibold text-fg">{formatar ? formatar(p.value, p.dataKey) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function legenda(v: string) {
  return <span className="text-[12px] text-muted">{v}</span>;
}

function Gradiente({ id, vertical = true }: { id: string; vertical?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1={vertical ? '1' : '0'} x2={vertical ? '0' : '1'} y2="0">
      <stop offset="0%" stopColor="rgb(var(--chart-lo))" />
      <stop offset="100%" stopColor="rgb(var(--chart-hi))" />
    </linearGradient>
  );
}

export function EncerradasPorMesChart({ dados, meta }: { dados: Dashboard['encerradasPorMes']; meta: number }) {
  const g = useId().replace(/:/g, '');
  return (
    <div className="h-[300px]" role="img" aria-label="Gráfico de NCs encerradas por mês, no prazo e fora do prazo, com percentual no prazo">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 4, left: -18, bottom: 0 }} barGap={3}>
          <defs>
            <Gradiente id={g} />
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="rotulo" {...eixo} />
          <YAxis yAxisId="q" allowDecimals={false} {...eixo} />
          <YAxis yAxisId="p" orientation="right" domain={[0, 100]} unit="%" {...eixo} width={44} />
          <Tooltip content={<Dica formatar={(v: number, k: string) => (k === 'pct' ? fmtPct(v) : v)} />} />
          <Legend formatter={legenda} iconType="circle" iconSize={8} />
          <ReferenceLine yAxisId="p" y={meta} stroke={MUTED} strokeDasharray="4 4" label={{ value: `meta ${meta}%`, position: 'insideTopRight', fill: MUTED, fontSize: 11 }} />
          <Bar animationDuration={1000} animationEasing="ease-out" yAxisId="q" dataKey="noPrazo" name="No prazo" fill={`url(#${g})`} radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Bar animationDuration={1000} animationEasing="ease-out" yAxisId="q" dataKey="foraPrazo" name="Fora do prazo" fill={BRAND} radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Line animationBegin={350} animationDuration={1400} animationEasing="ease-out" yAxisId="p" dataKey="pct" name="% no prazo" stroke="rgb(var(--fg))" strokeWidth={2} dot={{ r: 3.5, fill: 'rgb(var(--card))', stroke: 'rgb(var(--fg))', strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls type="linear" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AbertasPorAreaChart({ dados, onClickArea }: { dados: Dashboard['abertasPorArea']; onClickArea?: (a: string) => void }) {
  const g = useId().replace(/:/g, '');
  const altura = Math.max(220, dados.length * 38 + 50);
  return (
    <div style={{ height: altura }} role="img" aria-label="Gráfico de NCs abertas por área, em execução e em verificação">
      <ResponsiveContainer>
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barSize={16}>
          <defs>
            <Gradiente id={g} vertical={false} />
          </defs>
          <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} {...eixo} />
          <YAxis type="category" dataKey="area" width={112} {...eixo} tick={{ fill: 'rgb(var(--fg))', fontSize: 12 }} />
          <Tooltip content={<Dica />} />
          <Legend formatter={legenda} iconType="circle" iconSize={8} />
          <Bar
            dataKey="execucao"
            name="Em execução c/ Unigás"
            stackId="a"
            fill={BRAND}
            cursor={onClickArea ? 'pointer' : undefined}
            onClick={(d: { area?: string }) => d.area && onClickArea?.(d.area)}
          />
          <Bar
            dataKey="verificacao"
            name="Em verificação c/ Comgás"
            stackId="a"
            fill={`url(#${g})`}
            radius={[0, 6, 6, 0]}
            cursor={onClickArea ? 'pointer' : undefined}
            onClick={(d: { area?: string }) => d.area && onClickArea?.(d.area)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CriticidadeChart({ dados, limite }: { dados: Dashboard['porCriticidade']; limite: number }) {
  const g = useId().replace(/:/g, '');
  const d = dados.map((x) => ({ ...x, nome: x.criticidade === null ? 's/i' : String(x.criticidade) }));
  return (
    <div className="h-[240px]" role="img" aria-label="Distribuição das NCs abertas por criticidade de 0 a 6">
      <ResponsiveContainer>
        <BarChart data={d} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <Gradiente id={g} />
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="nome" {...eixo} />
          <YAxis allowDecimals={false} {...eixo} />
          <Tooltip content={<Dica />} labelFormatter={(_, p) => p?.[0]?.payload?.rotulo} />
          <Bar animationDuration={1000} animationEasing="ease-out" dataKey="total" name="NCs abertas" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {d.map((x, i) => (
              <Cell key={i} fill={x.criticidade !== null && x.criticidade >= limite ? BRAND : `url(#${g})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 flex items-center gap-3 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Crítica (≥ {limite})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fg/50" /> Demais
        </span>
      </p>
    </div>
  );
}

const CINZAS = ['rgb(var(--chart-hi))', 'rgb(var(--chart-hi) / 0.75)', 'rgb(var(--chart-hi) / 0.55)', 'rgb(var(--chart-lo))', 'rgb(var(--chart-lo) / 0.7)', 'rgb(var(--chart-lo) / 0.45)'];

export function GerenciaChart({ dados }: { dados: Dashboard['porGerencia'] }) {
  const total = dados.reduce((s, d) => s + d.total, 0);
  const cores = dados.map((_, i) => (i === 0 ? BRAND : CINZAS[(i - 1) % CINZAS.length]));
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-[200px] w-[200px] shrink-0" role="img" aria-label="Gráfico de rosca das NCs abertas por gerência">
        <ResponsiveContainer>
          <PieChart>
            <Pie animationBegin={150} animationDuration={1100} animationEasing="ease-out" data={dados} dataKey="total" nameKey="gerencia" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
              {dados.map((_, i) => (
                <Cell key={i} fill={cores[i]} />
              ))}
            </Pie>
            <Tooltip content={<Dica />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="tabular text-2xl font-semibold">{total}</p>
            <p className="text-[11px] text-muted">abertas</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        {dados.map((d, i) => (
          <li key={d.gerencia} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cores[i] }} />
            <span className="flex-1 truncate text-muted">{d.gerencia}</span>
            <span className="tabular font-semibold">{d.total}</span>
            <span className="tabular w-12 text-right text-[12px] text-muted">{total ? Math.round((d.total / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CadastradasChart({ dados }: { dados: Dashboard['cadastradasPorMes'] }) {
  const g = useId().replace(/:/g, '');
  return (
    <div className="h-[240px]" role="img" aria-label="Evolução de NCs cadastradas por mês nos últimos 12 meses">
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="rotulo" {...eixo} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} {...eixo} />
          <Tooltip content={<Dica />} cursor={{ stroke: MUTED, strokeDasharray: '3 3' }} />
          <Area
            dataKey="total"
            name="Cadastradas"
            stroke={BRAND}
            strokeWidth={2.5}
            fill={`url(#${g})`}
            dot={{ r: 3, fill: 'rgb(var(--card))', stroke: BRAND, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: BRAND, stroke: 'rgb(var(--card))', strokeWidth: 2 }}
            type="monotone"
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankingChart({ dados, chave, nome, formatar, destacarMaior = true }: { dados: { area: string; [k: string]: number | string | null | string[] }[]; chave: string; nome: string; formatar?: (v: number) => string; destacarMaior?: boolean }) {
  const g = useId().replace(/:/g, '');
  const altura = Math.max(200, dados.length * 34 + 30);
  return (
    <div style={{ height: altura }} role="img" aria-label={`Ranking de áreas por ${nome}`}>
      <ResponsiveContainer>
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barSize={14}>
          <defs>
            <Gradiente id={g} vertical={false} />
          </defs>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="area" width={120} {...eixo} tick={{ fill: 'rgb(var(--fg))', fontSize: 12 }} />
          <Tooltip content={<Dica formatar={formatar} />} />
          <Bar animationDuration={1000} animationEasing="ease-out" dataKey={chave} name={nome} radius={[0, 6, 6, 0]} label={{ position: 'right', fill: MUTED, fontSize: 11, formatter: (v: number) => (formatar ? formatar(v) : v) }}>
            {dados.map((_, i) => (
              <Cell key={i} fill={i === 0 && destacarMaior ? BRAND : `url(#${g})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
