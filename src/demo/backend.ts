/**
 * MODO DEMONSTRAÇÃO — executa o backend real (apps-script/*.gs, embutido no
 * build pelo plugin "gas-backend" do vite.config.ts) dentro do navegador.
 */
// @ts-expect-error módulo virtual gerado no build
import * as gas from 'virtual:gas-backend';
import { apagarEstado, emails, estaVazio, salvarEstado } from './gasMock';

/** Logins da demonstração: o admin + os dois primeiros responsáveis do seed (apps-script/setup.gs). */
export function loginsDemo() {
  const seed: { nome: string; email: string; areas: string[] }[] = gas.USUARIOS_SEED ?? [];
  return [
    { perfil: 'Administrador (Unigás SSM)', email: 'admin@unigas.demo', senha: 'Admin1234' },
    ...seed.slice(0, 2).map((u) => ({ perfil: `Responsável – ${u.areas.join(', ')}`, email: u.email, senha: 'Demo1234' })),
  ];
}

function inicializar() {
  if (!estaVazio()) return;
  gas.setup();
  if (import.meta.env.VITE_DEMO_SEM_EXEMPLO !== '1') gas.gerarDadosExemplo(80);
  gas.resetMemo();
  gas.definirSenhaPorEmail_('admin@unigas.demo', 'Admin1234');
  loginsDemo().slice(1).map((l) => l.email).forEach((e) => {
    gas.resetMemo();
    gas.definirSenhaPorEmail_(e, 'Demo1234');
  });
  gas.resetMemo();
  gas.configurarDemo_(window.location.href.split('#')[0]);
  salvarEstado();
}

let pronto = false;

export async function chamarDemo(action: string, payload: unknown, token: string | null) {
  if (!pronto) {
    inicializar();
    pronto = true;
  }
  // simula a latência do Apps Script
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
  const out = gas.doPost({ postData: { contents: JSON.stringify({ action, payload, token }) } });
  salvarEstado();
  return JSON.parse(out.getContent());
}

export function restaurarDemo() {
  apagarEstado();
  try {
    localStorage.removeItem('unigas_token');
  } catch {
    /* ignora */
  }
  window.location.reload();
}

export { emails as emailsDemo };
