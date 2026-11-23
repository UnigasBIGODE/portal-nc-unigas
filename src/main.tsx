import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MODO_DEMO, type ApiError } from './lib/api';
import { iniciarPwa } from './lib/pwa';

iniciarPwa();

// Na demonstração (publicada dentro do claude.ai) a navegação fica em memória.
const Router = MODO_DEMO ? MemoryRouter : HashRouter;
import './index.css';

// Cada chamada ao Apps Script leva 1–3 s: cache agressivo no cliente.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      retry: (n, e) => !['SESSAO_INVALIDA', 'SEM_PERMISSAO', 'NAO_ENCONTRADA', 'CONFIG'].includes((e as ApiError).code) && n < 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <ToastProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ToastProvider>
          </MotionConfig>
        </ThemeProvider>
      </QueryClientProvider>
    </Router>
  </React.StrictMode>,
);
