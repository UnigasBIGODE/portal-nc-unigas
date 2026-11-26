/**
 * Fila de envios offline: quando a pessoa está sem sinal (campo, garagem, subsolo),
 * evidências, envios para verificação e pedidos de prorrogação ficam guardados no
 * aparelho (IndexedDB) e são enviados sozinhos quando a conexão volta.
 */
import { api, ApiError, MODO_DEMO } from './api';

export const ACOES_FILA = ['enviarParaVerificacao', 'anexar', 'pedirProrrogacao'] as const;
export type AcaoFila = (typeof ACOES_FILA)[number];

export interface ItemFila {
  id: string;
  acao: AcaoFila;
  payload: unknown;
  descricao: string;
  nc_id: number;
  usuario: string;
  criadoEm: string;
  tentativas: number;
}

const BANCO = 'unigas-fila';
const LOJA = 'envios';
export const EVENTO_FILA = 'unigas:fila';

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function transacao<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await abrir();
  return new Promise((res, rej) => {
    const tx = db.transaction(LOJA, modo);
    const req = fn(tx.objectStore(LOJA));
    tx.oncomplete = () => {
      db.close();
      res(req ? (req.result as T) : undefined);
    };
    tx.onerror = () => {
      db.close();
      rej(tx.error);
    };
  });
}

export async function listarFila(usuario?: string): Promise<ItemFila[]> {
  try {
    const todos = ((await transacao<ItemFila[]>('readonly', (s) => s.getAll())) || []) as ItemFila[];
    return todos.filter((i) => !usuario || i.usuario === usuario).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  } catch {
    return [];
  }
}

function avisar() {
  window.dispatchEvent(new Event(EVENTO_FILA));
}

async function guardar(item: ItemFila) {
  await transacao('readwrite', (s) => s.put(item));
  avisar();
}

async function remover(id: string) {
  await transacao('readwrite', (s) => s.delete(id));
  avisar();
}

export function ehFalhaDeRede(e: unknown) {
  return e instanceof ApiError ? e.code === 'REDE' : e instanceof TypeError;
}

export type ResultadoEnvio<T> = { enfileirado: false; dados: T } | { enfileirado: true };

/**
 * Tenta enviar agora; se não houver conexão, guarda na fila e devolve { enfileirado: true }.
 * Outros erros (validação, permissão) continuam sendo lançados normalmente.
 */
export async function enviarOuGuardar<T>(acao: AcaoFila, payload: { nc_id: number } & Record<string, unknown>, descricao: string, usuario: string): Promise<ResultadoEnvio<T>> {
  const guardarNaFila = async () => {
    await guardar({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, acao, payload, descricao, nc_id: payload.nc_id, usuario, criadoEm: new Date().toISOString(), tentativas: 0 });
    return { enfileirado: true } as const;
  };
  const semRede = !MODO_DEMO && typeof navigator !== 'undefined' && navigator.onLine === false;
  if (semRede || (MODO_DEMO && localStorage.getItem('demo_offline') === '1')) return guardarNaFila();
  try {
    return { enfileirado: false, dados: await api<T>(acao, payload) };
  } catch (e) {
    if (ehFalhaDeRede(e)) {
      try {
        return await guardarNaFila();
      } catch {
        /* sem IndexedDB: devolve o erro original */
      }
    }
    throw e;
  }
}

export interface ResumoProcessamento {
  enviados: ItemFila[];
  falhas: { item: ItemFila; erro: string }[];
}

let processando = false;

/** Envia o que estiver pendente, na ordem em que foi guardado. */
export async function processarFila(usuario: string): Promise<ResumoProcessamento> {
  const resumo: ResumoProcessamento = { enviados: [], falhas: [] };
  if (processando) return resumo;
  if (!MODO_DEMO && navigator.onLine === false) return resumo;
  if (MODO_DEMO && localStorage.getItem('demo_offline') === '1') return resumo;
  processando = true;
  try {
    for (const item of await listarFila(usuario)) {
      try {
        await api(item.acao, item.payload);
        await remover(item.id);
        resumo.enviados.push(item);
      } catch (e) {
        if (ehFalhaDeRede(e)) break; // sinal caiu de novo: tenta mais tarde
        if (e instanceof ApiError && e.code === 'SESSAO_INVALIDA') break; // tenta depois do novo login
        // erro de verdade (ex.: NC já mudou de etapa): não adianta insistir
        await remover(item.id);
        resumo.falhas.push({ item, erro: e instanceof Error ? e.message : 'Erro desconhecido.' });
      }
    }
  } finally {
    processando = false;
  }
  return resumo;
}
