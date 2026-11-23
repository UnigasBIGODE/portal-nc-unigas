/**
 * Instalação como aplicativo (PWA): registra o service worker e guarda o
 * evento "beforeinstallprompt" para o botão "Instalar app".
 */
import { useEffect, useState } from 'react';
import { MODO_DEMO } from './api';

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let evento: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function iniciarPwa() {
  if (MODO_DEMO || import.meta.env.DEV || typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e as EventoInstalar;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    avisar();
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* sem PWA: o site continua normal */
      });
    });
  }
}

export const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const emModoApp = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** { podeInstalar, instalar, precisaInstrucoesIOS } */
export function useInstalarApp() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);
  const instalado = typeof window !== 'undefined' && emModoApp();
  return {
    podeInstalar: !MODO_DEMO && !instalado && !!evento,
    precisaInstrucoesIOS: !MODO_DEMO && !instalado && !evento && typeof navigator !== 'undefined' && ehIOS(),
    async instalar() {
      if (!evento) return false;
      await evento.prompt();
      const r = await evento.userChoice;
      evento = null;
      avisar();
      return r.outcome === 'accepted';
    },
  };
}
