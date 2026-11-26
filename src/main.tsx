import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { deveGuardar, IDADE_MAXIMA_CACHE, persistidor, VERSAO_CACHE } from './lib/cacheLocal';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MODO_DEMO, type ApiError } from './lib/api';
import { iniciarPwa } from './lib/pwa';
import { iniciarLiquidGlass } from './lib/liquidGlass';
import { iniciarDesempenho } from './lib/desempenho';

iniciarDesempenho();
iniciarPwa();
iniciarLiquidGlass();

// Na demonstração (publicada dentro do claude.ai) a navegação fica em memória.
const Router = MODO_DEMO ? MemoryRouter : HashRouter;
import '@fontsource-variable/manrope';
import './index.css';

// Cada chamada ao Apps Script leva 1–3 s: cache agressivo no cliente.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      // precisa ser ≥ a idade máxima do cache local, senão os dados restaurados são descartados
      gcTime: IDADE_MAXIMA_CACHE,
      refetchOnWindowFocus: false,
      retry: (n, e) => !['SESSAO_INVALIDA', 'SEM_PERMISSAO', 'NAO_ENCONTRADA', 'CONFIG'].includes((e as ApiError).code) && n < 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: persistidor,
          maxAge: IDADE_MAXIMA_CACHE,
          buster: VERSAO_CACHE,
          dehydrateOptions: { shouldDehydrateQuery: (q) => deveGuardar(q.queryKey, q.state.status) },
        }}
      >
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <ToastProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ToastProvider>
          </MotionConfig>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </Router>
  </React.StrictMode>,
);
