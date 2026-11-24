/**
 * Liquid glass: injeta o filtro SVG de refração (usado por .lg-glass no Chromium)
 * e acompanha o cursor para o brilho especular (--gx/--gy) nos elementos .lg-track.
 */
export function iniciarLiquidGlass() {
  if (typeof document === 'undefined' || document.getElementById('lg-svg')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.id = 'lg-svg';
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML =
    '<filter id="lg-refracao" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.011 0.018" numOctaves="2" seed="7" result="ruido"/>' +
    '<feGaussianBlur in="ruido" stdDeviation="2.5" result="suave"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="suave" scale="18" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter>';
  document.body.appendChild(svg);

  let pendente: { el: HTMLElement; x: number; y: number } | null = null;
  document.addEventListener(
    'pointermove',
    (e) => {
      const alvo = e.target as Element | null;
      const el = alvo && 'closest' in alvo ? (alvo.closest('.lg-track') as HTMLElement | null) : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!pendente) {
        requestAnimationFrame(() => {
          if (pendente) {
            pendente.el.style.setProperty('--gx', `${pendente.x}px`);
            pendente.el.style.setProperty('--gy', `${pendente.y}px`);
          }
          pendente = null;
        });
      }
      pendente = { el, x: e.clientX - r.left, y: e.clientY - r.top };
    },
    { passive: true },
  );
}
