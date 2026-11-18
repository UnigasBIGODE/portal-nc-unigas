import { lazy, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Logo } from './components/Logo';
import Login from './pages/Login';
import { DefinirSenha, EsqueciSenha } from './pages/Senha';
import Dashboard from './pages/Dashboard';

const ListaNCs = lazy(() => import('./pages/ListaNCs'));
const DetalheNC = lazy(() => import('./pages/DetalheNC'));
const PorArea = lazy(() => import('./pages/PorArea'));
const RelatorioMensal = lazy(() => import('./pages/RelatorioMensal'));
const Alertas = lazy(() => import('./pages/Alertas'));
const Conta = lazy(() => import('./pages/Conta'));
const Importar = lazy(() => import('./pages/admin/Importar'));
const Classificacao = lazy(() => import('./pages/admin/Classificacao'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios'));
const Areas = lazy(() => import('./pages/admin/Areas'));
const Configuracoes = lazy(() => import('./pages/admin/Configuracoes'));
const Auditoria = lazy(() => import('./pages/admin/Auditoria'));
const Consolidado = lazy(() => import('./pages/admin/Consolidado'));

function Carregando() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex flex-col items-center gap-6">
        <Logo className="h-16 w-auto opacity-90" />
        <Loader2 className="h-5 w-5 animate-spin text-muted" aria-label="Carregando" />
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const loc = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/definir-senha" element={<DefinirSenha />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="ncs" element={<ListaNCs />} />
        <Route path="ncs/:id" element={<DetalheNC />} />
        <Route path="areas" element={<PorArea />} />
        <Route path="relatorio" element={<RelatorioMensal />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="conta" element={<Conta />} />
        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<Navigate to="importar" replace />} />
          <Route path="importar" element={<Importar />} />
          <Route path="classificacao" element={<Classificacao />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="areas" element={<Areas />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="consolidado" element={<Consolidado />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
