import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LUMA_POSE, useAssistente } from '@/components/Assistente';
import { Skeleton } from '@/components/ui';

interface Insight {
  tipo: string;
  nivel: 'critico' | 'atencao' | 'info' | 'ok';
  texto: string;
}
interface Insights {
  principal: string;
  porIA: boolean;
  itens: Insight[];
  geradoEm: string;
}

const COR_NIVEL: Record<Insight['nivel'], string> = {
  critico: 'bg-danger',
  atencao: 'bg-warning',
  info: 'bg-info',
  ok: 'bg-success',
};

/** Cartão "Insights da LUMA" do Dashboard. */
export function LumaInsights({ className }: { className?: string }) {
  const luma = useAssistente();
  const q = useQuery({ queryKey: ['luma-insights'], queryFn: () => api<Insights>('ia.insights'), staleTime: 30 * 60_000 });
  const outros = (q.data?.itens ?? []).slice(1, 5);
  return (
    <section data-vg-entra className={cn('vg-painel luma-insights relative overflow-hidden', className)}>
      <div className="flex h-full flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <img src={LUMA_POSE.corpo} alt="LUMA" className="luma-flutua mx-auto h-[150px] shrink-0 sm:mx-0 sm:h-[200px]" draggable={false} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[16px] font-bold">
            <Flame className="h-[18px] w-[18px] text-brand" aria-hidden /> Insights da LUMA
          </p>
          {q.isLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : q.isError ? (
            <p className="mt-3 text-[13.5px] text-muted">Não consegui carregar os insights agora. Tente de novo em instantes.</p>
          ) : (
            <>
              <motion.p key={q.data?.principal} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 text-[15px] font-medium leading-relaxed">
                {q.data?.principal}
              </motion.p>
              {outros.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {outros.map((i) => (
                    <li key={i.tipo} className="flex items-start gap-2 text-[13px] text-[var(--vg-muted)]">
                      <span className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', COR_NIVEL[i.nivel])} aria-hidden />
                      {i.texto}
                    </li>
                  ))}
                </ul>
              )}
              {luma.disponivel && (
                <button
                  onClick={() => luma.perguntar('Faça uma análise completa dos meus indicadores e dos insights atuais: o que mais preocupa, as causas prováveis e as ações que você recomenda, em ordem de prioridade.')}
                  className="group mt-4 inline-flex items-center gap-2 rounded-full border border-brand/40 px-4 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  Ver análise completa <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
