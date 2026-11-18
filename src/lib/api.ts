/**
 * Cliente da API (Google Apps Script Web App).
 * POST com Content-Type text/plain para evitar o preflight de CORS.
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';
const CHAVE_TOKEN = 'unigas_token';
/** Modo demonstração: o backend roda dentro do navegador (ver src/demo). */
export const MODO_DEMO = import.meta.env.VITE_DEMO === '1';

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = 'ERRO') {
    super(message);
    this.code = code;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* modo privado */
  }
}

export async function api<T>(action: string, payload: unknown = {}): Promise<T> {
  if (MODO_DEMO) {
    const { chamarDemo } = await import('../demo/backend');
    return tratar<T>(await chamarDemo(action, payload, getToken()));
  }
  if (!API_URL) throw new ApiError('A variável VITE_API_URL não foi configurada. Veja o README.', 'CONFIG');
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, token: getToken() }),
      redirect: 'follow',
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.', 'REDE');
  }
  let json: { ok: boolean; data?: T; error?: string; code?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!json) throw new ApiError('O servidor respondeu de forma inesperada. Tente novamente em instantes.', 'RESPOSTA');
  return tratar<T>(json);
}

function tratar<T>(json: { ok: boolean; data?: T; error?: string; code?: string }): T {
  if (!json.ok) {
    if (json.code === 'SESSAO_INVALIDA') {
      setToken(null);
      window.dispatchEvent(new Event('unigas:sessao-expirada'));
    }
    throw new ApiError(json.error || 'Erro desconhecido.', json.code);
  }
  return json.data as T;
}

export function mensagemErro(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) return e.message;
  return 'Algo deu errado. Tente novamente.';
}

export function arquivoParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    r.readAsDataURL(file);
  });
}

export function baixarBase64(base64: string, nome: string, mime: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
