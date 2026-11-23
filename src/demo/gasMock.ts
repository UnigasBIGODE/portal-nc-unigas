// @ts-nocheck
/**
 * MODO DEMONSTRAÇÃO — simula os serviços do Google Apps Script no navegador
 * (planilha em memória, salva no localStorage deste navegador).
 * O código do backend (apps-script/*.gs) roda sem alterações sobre estes mocks.
 */
import { sha256 } from 'js-sha256';
import md5 from 'js-md5';

const CHAVE = 'unigas_demo_estado_v1';
const ehData = (v) => Object.prototype.toString.call(v) === '[object Date]';

function carregar() {
  try {
    const s = localStorage.getItem(CHAVE);
    if (s) return JSON.parse(s, (k, v) => (v && typeof v === 'object' && v.$d ? new Date(v.$d) : v));
  } catch (e) {
    /* sem localStorage */
  }
  return { sheets: {}, ordem: [], props: {}, arquivos: {} };
}

export const estado = carregar();
export const emails: { to: string; subject: string; link?: string; data: Date }[] = [];

export function salvarEstado() {
  try {
    localStorage.setItem(
      CHAVE,
      JSON.stringify(estado, function (k, v) {
        const o = this[k];
        return ehData(o) ? { $d: o.toISOString() } : v;
      }),
    );
  } catch (e) {
    /* cota cheia ou indisponível: segue em memória */
  }
}

export function apagarEstado() {
  try {
    localStorage.removeItem(CHAVE);
  } catch (e) {}
}

class Range {
  constructor(sh, r, c, nr, nc) {
    Object.assign(this, { sh, r, c, nr, nc });
  }
  getValues() {
    const d = this.sh._d(), out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) {
        const v = (d[this.r - 1 + i] || [])[this.c - 1 + j];
        row.push(v === undefined || v === null ? '' : ehData(v) ? new Date(v.getTime()) : v);
      }
      out.push(row);
    }
    return out;
  }
  setValues(vals) {
    const d = this.sh._d();
    vals.forEach((row, i) => {
      const ri = this.r - 1 + i;
      while (d.length <= ri) d.push([]);
      row.forEach((v, j) => {
        if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
        if (ehData(v)) v = new Date(v.getTime());
        d[ri][this.c - 1 + j] = v;
      });
    });
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
  clearContent() {
    const d = this.sh._d();
    for (let i = 0; i < this.nr; i++) {
      const row = d[this.r - 1 + i];
      if (row) for (let j = 0; j < this.nc; j++) row[this.c - 1 + j] = '';
    }
    return this;
  }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
}

class Sheet {
  constructor(nome) {
    this.nome = nome;
    if (!estado.sheets[nome]) { estado.sheets[nome] = []; estado.ordem.push(nome); }
  }
  _d() { return estado.sheets[this.nome]; }
  getName() { return this.nome; }
  getLastRow() {
    const d = this._d();
    for (let i = d.length - 1; i >= 0; i--) if ((d[i] || []).some((v) => v !== '' && v !== null && v !== undefined)) return i + 1;
    return 0;
  }
  getLastColumn() {
    let m = 0;
    this._d().forEach((r) => {
      for (let j = r.length - 1; j >= 0; j--) if (r[j] !== '' && r[j] !== undefined && r[j] !== null) { m = Math.max(m, j + 1); break; }
    });
    return m;
  }
  getDataRange() { return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  setFrozenRows() { return this; }
}

const ss = {
  getId: () => 'demo-planilha',
  getSheetByName: (n) => (estado.sheets[n] ? new Sheet(n) : null),
  insertSheet: (n) => new Sheet(n),
  getSheets: () => estado.ordem.map((n) => new Sheet(n)),
  deleteSheet: (sh) => { delete estado.sheets[sh.nome]; estado.ordem = estado.ordem.filter((n) => n !== sh.nome); },
  setSpreadsheetTimeZone: () => {},
};

const fmtParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function formatDate(d, tz, padrao) {
  const p = {};
  fmtParts.formatToParts(d).forEach((x) => { p[x.type] = x.value; });
  return padrao.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss|M/g, (m, lit) => {
    if (lit !== undefined) return lit;
    return { yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second, M: String(Number(p.month)) }[m];
  });
}

const assinado = (arr) => Array.from(arr).map((x) => (x > 127 ? x - 256 : x));
const semSinal = (arr) => Uint8Array.from(arr.map((x) => x & 0xff));
function b64(bytes) {
  let s = '';
  semSinal(bytes).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}
const blob = (bytes, mime, nome) => ({ getBytes: () => bytes, getContentType: () => mime, getName: () => nome });
const cacheMap = new Map();
const utf8 = (s) => Array.from(new TextEncoder().encode(String(s)));

export const globais = {
  Logger: { log: (...a) => console.info('[Apps Script]', ...a) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush: () => {} },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, s) => assinado(alg === 'md5' ? md5.array(String(s)) : sha256.array(String(s))),
    getUuid: () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => ((Math.random() * 16) | (c === 'x' ? 0 : 8)).toString(16))),
    formatDate,
    base64Encode: (b) => b64(typeof b === 'string' ? utf8(b) : b),
    base64EncodeWebSafe: (b) => b64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    base64Decode: (s) => assinado(Array.from(atob(s), (c) => c.charCodeAt(0))),
    newBlob: blob,
    sleep: () => {},
  },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => { const e = cacheMap.get(k); return !e || e.exp < Date.now() ? null : e.v; },
      put: (k, v, s = 600) => { cacheMap.set(k, { v: String(v), exp: Date.now() + s * 1000 }); },
      remove: (k) => cacheMap.delete(k),
    }),
  },
  LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {}, hasLock: () => true }) },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (estado.props[k] === undefined ? null : estado.props[k]),
      setProperty: (k, v) => { estado.props[k] = String(v); },
      deleteProperty: (k) => { delete estado.props[k]; },
    }),
  },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'admin@unigas.demo' }) },
  MailApp: {
    getRemainingDailyQuota: () => 100,
    sendEmail: (o) => {
      const link = (o.htmlBody.match(/href="([^"]+)"/) || [])[1];
      emails.unshift({ to: o.to, subject: o.subject, link, data: new Date() });
      window.dispatchEvent(new CustomEvent('unigas:demo-email'));
    },
  },
  DriveApp: {
    createFolder: () => ({ getId: () => 'pasta-demo' }),
    getFolderById: () => ({
      createFile: (b) => {
        const id = 'arq-' + Math.random().toString(36).slice(2, 10);
        estado.arquivos[id] = { nome: b.getName(), mime: b.getContentType(), b64: b64(b.getBytes()) };
        return { getId: () => id, getUrl: () => '#' };
      },
    }),
    getFileById: (id) => {
      const a = estado.arquivos[id];
      if (!a) throw new Error('Arquivo não encontrado');
      return { getBlob: () => blob(assinado(Array.from(atob(a.b64), (c) => c.charCodeAt(0))), a.mime, a.nome), setTrashed: () => { delete estado.arquivos[id]; } };
    },
  },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ setMimeType() { return this; }, getContent: () => s }) },
  ScriptApp: {
    getProjectTriggers: () => [],
    deleteTrigger: () => {},
    WeekDay: { MONDAY: 'MONDAY' },
    newTrigger: () => { const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, inTimezone: () => b, onWeekDay: () => b, create: () => ({}) }; return b; },
  },
  UrlFetchApp: { fetch: () => { throw new Error('Indisponível na demonstração'); } },
};

export const estaVazio = () => !estado.sheets.NC;
