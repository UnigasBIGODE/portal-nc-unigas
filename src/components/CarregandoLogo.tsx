import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { GlassIconReveal } from '@/components/ui/liquid-glass-logo-reveal';
import { cn } from '@/lib/utils';

/** Cores do fundo do portal (iguais a --bg em index.css): o canvas pinta o próprio fundo. */
const FUNDO = { light: '#F5F6F8', dark: '#0B0B0D' } as const;

/** Velocidade do efeito nas telas de carregamento (1 = original, ~3,5 s). */
const VELOCIDADE = 1.3;
/** Tempo até a logo terminar de aparecer, em ms (present + 1,1 s de assentamento, na velocidade acima). */
export const DURACAO_REVELACAO = Math.round(((2.4 + 1.1) / VELOCIDADE) * 1000);

/** Logo da Unigás surgindo de uma gota de vidro líquido. */
export function LogoVidro({ className }: { className?: string }) {
  const { tema } = useTheme();
  const escuro = tema === 'dark';
  return (
    <GlassIconReveal
      logo={escuro ? './logo-dark.png' : './logo-light.png'}
      label="Carregando Unigás"
      look={escuro ? 'dark' : 'light'}
      background={FUNDO[escuro ? 'dark' : 'light']}
      plateColor={escuro ? '#141418' : '#ffffff'}
      iconPlate={false}
      originalColors
      logoColor="#E30613"
      tileSize={280}
      logoScale={0.6}
      finalScale={0.95}
      speed={VELOCIDADE}
      hold={0.6}
      tuning={{ startZoom: 1.9, sheen: 1 }}
      className={cn('cursor-default', className)}
    />
  );
}

/** Tela inteira de carregamento (verificação da sessão, abertura do portal). */
export function TelaCarregamento({ saindo }: { saindo?: boolean }) {
  return (
    <div
      className={cn('fixed inset-0 z-[200] bg-bg transition-opacity duration-500', saindo && 'pointer-events-none opacity-0')}
      role="status"
      aria-live="polite"
    >
      <LogoVidro className="h-full w-full" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

/** Carregamento dentro da área de conteúdo (troca de página). */
export function CarregandoPagina() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
      <LogoVidro className="h-[min(60vh,520px)] w-full max-w-[640px] rounded-3xl" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

/**
 * Abertura do portal: a logo se revela por completo uma vez por sessão do navegador,
 * por cima de tudo, e some suavemente quando termina.
 */
export function AberturaPortal() {
  const [fase, setFase] = useState<'mostrando' | 'saindo' | 'fim'>(() => {
    try {
      return sessionStorage.getItem('unigas_abertura') ? 'fim' : 'mostrando';
    } catch {
      return 'mostrando';
    }
  });
  useEffect(() => {
    if (fase !== 'mostrando') return;
    try {
      sessionStorage.setItem('unigas_abertura', '1');
    } catch {
      /* navegação privada */
    }
    const t1 = setTimeout(() => setFase('saindo'), DURACAO_REVELACAO + 300);
    const t2 = setTimeout(() => setFase('fim'), DURACAO_REVELACAO + 820);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fase]);
  if (fase === 'fim') return null;
  return <TelaCarregamento saindo={fase === 'saindo'} />;
}
