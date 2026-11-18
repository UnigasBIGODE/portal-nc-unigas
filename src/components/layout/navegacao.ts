import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  SlidersHorizontal,
  Tags,
  Trophy,
  Upload,
  UserCog,
  Users,
} from 'lucide-react';

export interface ItemNav { to: string; label: string; icon: typeof Bell; end?: boolean; descricao?: string }

export const MENU: ItemNav[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/ncs', label: 'Não Conformidades', icon: ClipboardList },
  { to: '/areas', label: 'Por Área', icon: Building2 },
  { to: '/relatorio', label: 'Relatório Mensal', icon: BarChart3 },
  { to: '/alertas', label: 'Alertas', icon: Bell },
];

export const ADMIN: ItemNav[] = [
  { to: '/admin/importar', label: 'Importar dados', icon: Upload },
  { to: '/admin/classificacao', label: 'Classificação', icon: Tags },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
  { to: '/admin/areas', label: 'Áreas', icon: FileSpreadsheet },
  { to: '/admin/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
  { to: '/admin/auditoria', label: 'Auditoria', icon: History },
  { to: '/admin/consolidado', label: 'Visão consolidada', icon: Trophy },
];

export const CONTA: ItemNav = { to: '/conta', label: 'Configurações da conta', icon: UserCog };

/** Trilha de navegação (breadcrumb) a partir da rota. */
export function trilha(pathname: string): { label: string; to?: string }[] {
  if (pathname === '/') return [{ label: 'Dashboard' }];
  const nc = pathname.match(/^\/ncs\/(\d+)/);
  if (nc) return [{ label: 'Não Conformidades', to: '/ncs' }, { label: `NC ${nc[1]}` }];
  const item = [...MENU, ...ADMIN, CONTA].find((m) => m.to === pathname);
  if (pathname.startsWith('/admin')) return [{ label: 'Administração' }, { label: item?.label ?? '' }];
  return [{ label: item?.label ?? '' }];
}
