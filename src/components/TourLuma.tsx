/**
 * Tour de boas-vindas: no primeiro acesso de cada pessoa, a LUMA mostra em 5 passos
 * onde ficam as coisas. Pode ser revisto em Configurações da conta.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LUMA_POSE } from '@/components/Assistente';
import { cn } from '@/lib/utils';

interface Passo {
  titulo: string;
  texto: string;
  pose: string;
  alvo?: string;
  soComIA?: boolean;
}

const PASSOS: Passo[] = [
  {
    titulo: 'Olá! Eu sou a LUMA.',
    texto: 'Sou a Inteligência Artificial Unigás e vou te mostrar, em poucos passos, como o portal funciona. Leva menos de um minuto.',
    pose: LUMA_POSE.otimo,
  },
  {
    titulo: 'Suas não conformidades',
    texto: 'Em "Não Conformidades" ficam todas as NCs das suas áreas, com abas (em execução, em verificação, atrasadas), filtros e busca por número, endereço ou placa.',
    pose: LUMA_POSE.analisar,
    alvo: 'aside a[href$="/ncs"], aside a[href*="#/ncs"]',
  },
  {
    titulo: 'Enviar evidências e pedir prazo',
    texto: 'Ao abrir uma NC, use "Enviar para verificação" com as fotos do serviço feito. Se não for dar tempo, peça a prorrogação de prazo ali mesmo, explicando o motivo.',
    pose: LUMA_POSE.sugestao,
  },
  {
    titulo: 'Alertas e prazos',
    texto: 'O sino mostra o que precisa de atenção: NCs atrasadas e prazos chegando. Você também recebe e-mail 3 dias antes de cada vencimento.',
    pose: LUMA_POSE.analisar,
    alvo: 'button[aria-label^="Alertas"]',
  },
  {
    titulo: 'Conte comigo!',
    texto: 'Sempre que precisar, clique em LUMA no canto da tela: eu resumo NCs, sugiro planos de ação e ajudo a achar a causa raiz.',
    pose: LUMA_POSE.conte,
    alvo: '.luma-botao',
    soComIA: true,
  },
];

const chaveTour = (id: string) => 'unigas_tour_v1:' + id;

export function TourLuma() {
  const { usuario, config } = useAuth();
  const passos = PASSOS.filter((p) => !p.soComIA || config?.iaDisponivel);
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!usuario) return;
    let visto = true;
    try {
      visto = !!localStorage.getItem(chaveTour(usuario.id));
    } catch {
      /* ignora */
    }
    if (visto) return;
    const t = setTimeout(() => setAberto(true), 1500);
    return () => clearTimeout(t);
  }, [usuario]);

  useEffect(() => {
    const rever = () => {
      setI(0);
      setAberto(true);
    };
    window.addEventListener('unigas:tour', rever);
    return () => window.removeEventListener('unigas:tour', rever);
  }, []);

  const passo = passos[Math.min(i, passos.length - 1)];

  useLayoutEffect(() => {
    if (!aberto || !passo?.alvo) {
      setRect(null);
      return;
    }
    const medir = () => {
      const el = document.querySelector(passo.alvo!) as HTMLElement | null;
      const r = el?.getBoundingClientRect();
      setRect(r && r.width > 0 && r.height > 0 ? r : null);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [aberto, passo]);

  const fechar = useCallback(() => {
    setAberto(false);
    try {
      if (usuario) localStorage.setItem(chaveTour(usuario.id), new Date().toISOString());
    } catch {
      /* ignora */
    }
  }, [usuario]);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, passos.length - 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, fechar, passos.length]);

  if (!usuario || !passo) return null;
  const ultimo = i >= passos.length - 1;

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <motion.div key="tour" className="fixed inset-0 z-[90]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Tour de boas-vindas">
          {/* fundo escurecido com "recorte" no elemento em destaque */}
          {rect ? (
            <motion.div
              className="pointer-events-none absolute rounded-2xl ring-[3px] ring-brand"
              initial={false}
              animate={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ boxShadow: '0 0 0 9999px rgb(10 4 5 / 0.62)' }}
            />
          ) : (
            <div className="absolute inset-0 bg-[rgb(10_4_5/0.62)]" />
          )}
          <div className="absolute inset-0" onClick={fechar} aria-hidden />

          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="absolute inset-x-3 bottom-4 mx-auto max-w-[460px] sm:inset-x-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
          >
            <div className="vg-trilho overflow-hidden rounded-[24px] !bg-[var(--vg-raised)]">
              <div className="luma-faixa relative flex items-end gap-3 px-5 pt-4 text-white">
                <img src={passo.pose} alt="" className="luma-flutua relative z-[1] -mb-1 h-[104px] shrink-0" draggable={false} />
                <p className="relative z-[1] pb-4 text-[19px] font-extrabold leading-tight tracking-tight">{passo.titulo}</p>
                <button onClick={fechar} className="absolute right-3 top-3 z-[2] grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Fechar o tour">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 pb-5 pt-4">
                <p className="text-[14px] leading-relaxed text-[var(--vg-ink)]">{passo.texto}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex flex-1 gap-1.5" aria-label={`Passo ${i + 1} de ${passos.length}`}>
                    {passos.map((_, k) => (
                      <span key={k} className={cn('h-1.5 rounded-full transition-all', k === i ? 'w-6 bg-brand' : 'w-1.5 bg-[var(--vg-track)]')} />
                    ))}
                  </div>
                  {i > 0 && (
                    <button onClick={() => setI(i - 1)} className="vg-botao h-9 w-9" aria-label="Voltar">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => (ultimo ? fechar() : setI(i + 1))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[13px] font-semibold text-white shadow-md shadow-brand/30 hover:brightness-110"
                  >
                    {ultimo ? 'Começar' : 'Próximo'} {!ultimo && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
                {!ultimo && (
                  <button onClick={fechar} className="mt-3 text-[12px] font-medium text-[var(--vg-muted)] hover:underline">
                    Pular o tour
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Abre o tour de novo (botão em Configurações da conta). */
export function reverTour() {
  window.dispatchEvent(new Event('unigas:tour'));
}
