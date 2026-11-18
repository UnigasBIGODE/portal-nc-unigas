import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

/**
 * Modo demonstração (VITE_DEMO=1): embute o código real do Apps Script
 * (../apps-script/*.gs) no site, rodando sobre mocks em src/demo/gasMock.ts.
 */
function gasBackend(): Plugin {
  const ID = 'virtual:gas-backend';
  const dir = new URL('../apps-script/', import.meta.url);
  return {
    name: 'gas-backend',
    resolveId: (id) => (id === ID ? '\0' + ID : null),
    load(id) {
      if (id !== '\0' + ID) return null;
      // Repositório só do site (sem a pasta apps-script): o modo demo fica indisponível.
      if (!existsSync(dir)) return `throw new Error('Modo demonstração indisponível: pasta apps-script ausente.');`;
      const codigo = readdirSync(dir)
        .filter((f) => f.endsWith('.gs'))
        .sort()
        .map((f) => readFileSync(new URL(f, dir), 'utf8'))
        .join('\n;\n');
      const nomes = ['SpreadsheetApp', 'Utilities', 'CacheService', 'LockService', 'PropertiesService', 'Session', 'MailApp', 'DriveApp', 'ContentService', 'ScriptApp', 'UrlFetchApp', 'Logger'];
      return `import { globais } from '/src/demo/gasMock.ts';
const { ${nomes.join(', ')} } = globais;
${codigo}
function resetMemo() { _memo = {}; }
function configurarDemo_(url) {
  _memo = {};
  var t = lerTabela_('Config', true);
  t.linhas.forEach(function (r) { if (r.chave === 'app_url') r.valor = url; if (r.chave === 'email_suporte') r.valor = 'suporte@unigas.demo'; });
  gravarTabela_(t);
  _memo = {};
}
export { doPost, setup, gerarDadosExemplo, definirSenhaPorEmail_, resetMemo, configurarDemo_, USUARIOS_SEED };`;
    },
  };
}

// base './' permite publicar em subpasta (ex.: GitHub Pages) — o app usa HashRouter.
export default defineConfig({
  base: './',
  plugins: [react(), gasBackend()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', '@tanstack/react-table'],
          charts: ['recharts'],
        },
      },
    },
  },
});
