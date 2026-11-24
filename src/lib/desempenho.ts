/**
 * Modo de desempenho do portal.
 *
 *  - "completo": vidro com desfoque, fundo animado e efeitos WebGL.
 *  - "leve": sem desfoque de fundo (backdrop-filter), sem animações contínuas e sem WebGL
 *    pesado — para computadores mais simples, sem placa de vídeo ou com aceleração desligada.
 *  - "auto" (padrão): começa no completo e passa sozinho para o leve se a máquina parecer
 *    fraca (poucos núcleos/memória, vídeo por software) ou se a tela ficar lenta (< 40 fps).
 *
 * A classe "leve" vai no <html>; o CSS em index.css desliga os efeitos.
 */
import { useEffect, useState } from 'react';

export type PreferenciaDesempenho = 'auto' | 'leve' | 'completo';

const CHAVE_PREF = 'unigas_desempenho';
const CHAVE_AUTO = 'unigas_desempenho_auto';

let ouvintes: ((leve: boolean) => void)[] = [];

export function preferenciaDesempenho(): PreferenciaDesempenho {
  try {
    const v = localStorage.getItem(CHAVE_PREF);
    return v === 'leve' || v === 'completo' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function modoLeve(): boolean {
  return document.documentElement.classList.contains('leve');
}

export function aoMudarModo(fn: (leve: boolean) => void) {
  ouvintes.push(fn);
  return () => {
    ouvintes = ouvintes.filter((f) => f !== fn);
  };
}

function aplicar(leve: boolean) {
  const html = document.documentElement;
  if (html.classList.contains('leve') === leve) return;
  html.classList.toggle('leve', leve);
  ouvintes.forEach((f) => f(leve));
}

/** Vídeo por software (sem aceleração) costuma ser o motivo dos travamentos. */
function videoPorSoftware(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return true;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const nome = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(nome);
  } catch {
    return false;
  }
}

function maquinaSimples(): boolean {
  const nucleos = navigator.hardwareConcurrency || 8;
  const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;
  const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return nucleos <= 2 || memoria <= 2 || !!economia || videoPorSoftware();
}

/** Mede os quadros por segundo por alguns segundos; se ficar lento, liga o modo leve. */
function medirFluidez() {
  let quadros = 0;
  let inicio = 0;
  let lentos = 0;
  let ultimo = 0;
  const passo = (t: number) => {
    if (!inicio) inicio = ultimo = t;
    quadros++;
    if (t - ultimo > 50) lentos++; // quadro que levou mais de 50 ms (< 20 fps)
    ultimo = t;
    const dur = t - inicio;
    if (dur < 4000) {
      requestAnimationFrame(passo);
      return;
    }
    const fps = (quadros * 1000) / dur;
    if (document.visibilityState === 'visible' && (fps < 40 || lentos > 12)) {
      try {
        localStorage.setItem(CHAVE_AUTO, 'leve');
      } catch {
        /* ignora */
      }
      if (preferenciaDesempenho() === 'auto') aplicar(true);
    }
  };
  // espera a página carregar (a abertura é pesada de propósito) antes de medir
  setTimeout(() => {
    if (document.visibilityState === 'visible') requestAnimationFrame(passo);
  }, 6000);
}

/** Chamar o quanto antes (main.tsx), antes do primeiro desenho da tela. */
export function iniciarDesempenho() {
  const pref = preferenciaDesempenho();
  let autoLeve = false;
  try {
    autoLeve = localStorage.getItem(CHAVE_AUTO) === 'leve';
  } catch {
    /* ignora */
  }
  const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (pref === 'leve') aplicar(true);
  else if (pref === 'completo') aplicar(false);
  else if (autoLeve || reduzir || maquinaSimples()) aplicar(true);
  else medirFluidez();
}

export function definirPreferenciaDesempenho(pref: PreferenciaDesempenho) {
  try {
    localStorage.setItem(CHAVE_PREF, pref);
    if (pref !== 'auto') localStorage.removeItem(CHAVE_AUTO);
  } catch {
    /* ignora */
  }
  if (pref === 'auto') {
    aplicar(false);
    if (maquinaSimples()) aplicar(true);
    else medirFluidez();
  } else aplicar(pref === 'leve');
}

/** Hook simples para componentes React. */
export function useModoLeve() {
  const [leve, setLeve] = useState(() => (typeof document !== 'undefined' ? modoLeve() : false));
  useEffect(() => aoMudarModo(setLeve), []);
  return leve;
}
