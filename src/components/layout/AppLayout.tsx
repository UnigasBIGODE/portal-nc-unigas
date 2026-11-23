import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Bell, ChevronRight, ChevronsLeft, LifeBuoy, LogOut, Menu, Moon, Search, ShieldCheck, Sun, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAlertas } from '@/hooks/queries';
import { Logo } from '../Logo';
import { AlertaBadge } from '../StatusBadges';
import { Badge, Button, Skeleton } from '../ui';
import { cn, iniciais } from '@/lib/utils';
import { ADMIN, CONTA, MENU, trilha, type ItemNav } from './navegacao';
import { CommandPalette } from './CommandPalette';

const LARGURA = { aberto: 272, recolhido: 84 };

function lerRecolhido() {
  try {
    return localStorage.getItem('unigas_menu_recolhido') === '1';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- item do menu

function ItemMenu({ item, recolhido, badge, indice }: { item: ItemNav; recolhido: boolean; badge?: number; indice: number }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={recolhido ? item.label : undefined}
      style={{ ['--d' as string]: `${40 + indice * 30}ms` }}
      className={({ isActive }) =>
        cn(
          'anim-slide-right group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium outline-none transition-colors duration-200',
          isActive ? 'text-brand' : 'text-muted hover:text-fg',
          recolhido && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="menu-ativo"
              className="absolute inset-0 rounded-xl bg-brand/[0.07] ring-1 ring-brand/10"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            >
              <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
            </motion.span>
          )}
          {!isActive && <span className="absolute inset-0 rounded-xl bg-elevated opacity-0 transition-opacity duration-200 group-hover:opacity-100" />}
          <Icon className="relative h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden />
          <AnimatePresence initial={false}>
            {!recolhido && (
              <motion.span className="relative flex-1 truncate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {!!badge && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'tabular relative grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white shadow-sm shadow-brand/40',
                recolhido && 'absolute right-2 top-0.5 h-4 min-w-4 px-1 text-[10px]',
              )}
            >
              {badge}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ---------------------------------------------------------------- sidebar

function Sidebar({ aberto, fechar, recolhido, alternarRecolhido }: { aberto: boolean; fechar: () => void; recolhido: boolean; alternarRecolhido: () => void }) {
  const { usuario, isAdmin, logout, config } = useAuth();
  const { data: alertas } = useAlertas();
  const navigate = useNavigate();
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const f = () => setDesktop(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  if (!usuario) return null;
  const r = desktop && recolhido;
  const areasTxt = usuario.areas.join(' · ');

  return (
    <>
      <AnimatePresence>
        {aberto && !desktop && (
          <motion.div className="fixed inset-0 z-40 bg-[#0B0B0D]/40 backdrop-blur-[3px]" onClick={fechar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>
      <motion.aside
        aria-label="Menu principal"
        className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-card"
        initial={false}
        animate={{ width: r ? LARGURA.recolhido : LARGURA.aberto, x: desktop || aberto ? 0 : -LARGURA.aberto - 10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        <div className={cn('flex h-[72px] items-center px-5', r && 'justify-center px-0')}>
          <Link to="/" onClick={fechar} aria-label="Ir para o dashboard" className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {r ? (
                <motion.span key="mini" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[0.08]">
                  <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
                    <path d="M32 6c-2 10-15 21-15 34a15 15 0 0 0 30 0C47 27 34 16 32 6zm0 42a6 6 0 0 1-6-6c0-5 4-9 6-14 2 5 6 9 6 14a6 6 0 0 1-6 6z" fill="#E30613" />
                  </svg>
                </motion.span>
              ) : (
                <motion.span key="logo" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="block">
                  <Logo className="h-10 w-auto" />
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          {!desktop && (
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={fechar} aria-label="Fechar menu">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className={cn('mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-line bg-elevated/60 p-2.5 transition-all', r && 'mx-3 justify-center border-transparent bg-transparent p-0')}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-[#9b0410] text-[13px] font-semibold text-white shadow-md shadow-brand/30 ring-2 ring-card" title={r ? usuario.nome : undefined}>
            {iniciais(usuario.nome)}
          </div>
          {!r && (
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{usuario.nome}</p>
              {isAdmin ? (
                <Badge tom="brand" className="mt-0.5 px-2 py-0 text-[11px]">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </Badge>
              ) : (
                <p className="truncate text-[12px] text-muted" title={areasTxt}>
                  {areasTxt || 'Sem área vinculada'}
                </p>
              )}
            </div>
          )}
        </div>

        <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden px-4', r && 'px-3')} onClick={() => !desktop && fechar()}>
          {!r ? <p className="label-xs mb-2 px-3">Menu</p> : <div className="mx-auto mb-2 h-px w-6 bg-line" />}
          <div className="space-y-0.5">
            {MENU.map((m, i) => (
              <ItemMenu key={m.to} item={m} indice={i} recolhido={r} badge={m.to === '/alertas' ? alertas?.criticos : undefined} />
            ))}
          </div>
          {isAdmin && (
            <>
              {!r ? <p className="label-xs mb-2 mt-6 px-3">Administração</p> : <div className="mx-auto my-4 h-px w-6 bg-line" />}
              <div className="space-y-0.5">
                {ADMIN.map((m, i) => (
                  <ItemMenu key={m.to} item={m} indice={MENU.length + i} recolhido={r} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className={cn('space-y-0.5 border-t border-line px-4 py-3', r && 'px-3')} onClick={() => !desktop && fechar()}>
          <ItemMenu item={CONTA} indice={20} recolhido={r} />
          <a
            href={config?.emailSuporte ? `mailto:${config.emailSuporte}?subject=Portal%20de%20NCs` : '#'}
            title={r ? `Suporte${config?.emailSuporte ? ': ' + config.emailSuporte : ''}` : undefined}
            className={cn('flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-muted transition-colors hover:bg-elevated hover:text-fg', r && 'justify-center px-0')}
          >
            <LifeBuoy className="h-[18px] w-[18px]" aria-hidden /> {!r && 'Suporte'}
          </a>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            title={r ? 'Sair' : undefined}
            className={cn('flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-muted transition-colors hover:bg-danger/[0.07] hover:text-danger', r && 'justify-center px-0')}
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden /> {!r && 'Sair'}
          </button>
        </div>

        {desktop && (
          <button
            onClick={alternarRecolhido}
            className="absolute -right-3 top-[86px] grid h-6 w-6 place-items-center rounded-full border border-line bg-card text-muted shadow-sm transition-colors hover:text-fg"
            aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          >
            <motion.span animate={{ rotate: recolhido ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </motion.span>
          </button>
        )}
      </motion.aside>
    </>
  );
}

// ---------------------------------------------------------------- sino

function Sino() {
  const { data, isLoading } = useAlertas();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  useEffect(() => {
    setAberto(false);
  }, [loc.pathname]);
  useEffect(() => {
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);
  const total = (data?.criticos ?? 0) + (data?.atencao ?? 0);
  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="icon" onClick={() => setAberto((v) => !v)} aria-label={`Alertas: ${total} pendentes`} aria-expanded={aberto}>
        <motion.span animate={total ? { rotate: [0, -14, 12, -8, 6, 0] } : {}} transition={{ duration: 0.9, delay: 1.2, repeat: Infinity, repeatDelay: 8 }}>
          <Bell className="h-[18px] w-[18px]" />
        </motion.span>
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5">
            {(data?.criticos ?? 0) > 0 && <span className="anim-ping absolute inset-0 rounded-full bg-brand" aria-hidden />}
            <span className="tabular relative grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white ring-2 ring-bg">{total > 99 ? '99+' : total}</span>
          </span>
        )}
      </Button>
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="absolute right-0 z-40 mt-2 w-[min(92vw,400px)] origin-top-right overflow-hidden rounded-[20px] border border-line bg-card shadow-pop"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold">Alertas</p>
                <p className="text-[12px] text-muted">{data ? `${data.criticos} críticos · ${data.atencao} de atenção` : 'Carregando…'}</p>
              </div>
              <Link to="/alertas" className="text-[13px] font-medium text-brand hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="max-h-[380px] overflow-y-auto p-2">
              {isLoading && (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              )}
              {data && data.itens.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">Nenhum alerta no momento 🎉</p>}
              {data?.itens.slice(0, 8).map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}>
                  <Link to={`/ncs/${a.nc_id}`} className="group flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-elevated">
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.nivel === 'critico' ? 'bg-danger' : a.nivel === 'atencao' ? 'bg-warning' : 'bg-info')} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        NC {a.nc_id} · {a.titulo}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {a.mensagem} · {a.area}
                      </p>
                    </div>
                    <div className="opacity-80 transition-opacity group-hover:opacity-100">
                      <AlertaBadge nivel={a.nivel} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- topo

function BarraProgresso() {
  const n = useIsFetching();
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[2.5px] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 0.2 } }}>
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Topbar({ abrirMenu, abrirBusca }: { abrirMenu: () => void; abrirBusca: () => void }) {
  const { tema, alternar } = useTheme();
  const { usuario } = useAuth();
  const loc = useLocation();
  const migalhas = trilha(loc.pathname);
  const mac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Button variant="secondary" size="icon" className="lg:hidden" onClick={abrirMenu} aria-label="Abrir menu">
          <Menu className="h-[18px] w-[18px]" />
        </Button>
        <nav aria-label="Trilha" className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
          <span className="text-muted">Portal NC</span>
          {migalhas.map((m, i) => (
            <motion.span key={loc.pathname + i} className="flex min-w-0 items-center gap-1.5" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted/60" />
              {m.to ? (
                <Link to={m.to} className="truncate text-muted hover:text-fg">
                  {m.label}
                </Link>
              ) : (
                <span className={cn('truncate', i === migalhas.length - 1 ? 'font-semibold text-fg' : 'text-muted')}>{m.label}</span>
              )}
            </motion.span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={abrirBusca}
            className="group flex h-10 items-center gap-2.5 rounded-full border border-line bg-card pl-3.5 pr-2 text-[13px] text-muted shadow-sm transition-all duration-300 hover:border-fg/15 hover:shadow-md sm:w-72"
            aria-label="Busca rápida"
          >
            <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="hidden flex-1 text-left sm:block">Buscar NC, página…</span>
            <kbd className="hidden rounded-md border border-line bg-elevated px-1.5 py-0.5 font-sans text-[11px] sm:block">{mac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <Button variant="secondary" size="icon" onClick={(e) => alternar({ x: e.clientX, y: e.clientY })} aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={tema} initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ duration: 0.25 }}>
                {tema === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </motion.span>
            </AnimatePresence>
          </Button>
          <Sino />
          <Link
            to="/conta"
            className="hidden h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand to-[#9b0410] text-[13px] font-semibold text-white shadow-md shadow-brand/30 transition-transform hover:scale-105 sm:grid"
            aria-label="Minha conta"
          >
            {usuario ? iniciais(usuario.nome) : ''}
          </Link>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- transições de página

/** Página que sai desliza e desfoca; a nova entra subindo. */
function SaidaEntrada({ chave, carregando }: { chave: string; carregando: ReactNode }) {
  // Animação só em CSS (fill-mode "backwards"): mesmo que seja interrompida, a página
  // termina sempre visível — nunca fica em branco.
  return (
    <div key={chave} className="anim-pagina">
      <ProtecaoPagina chave={chave}>
        <Suspense fallback={carregando}>
          <Outlet />
        </Suspense>
      </ProtecaoPagina>
    </div>
  );
}

/** Se uma página falhar, mostra um aviso no lugar dela em vez de deixar a tela em branco. */
class ProtecaoPagina extends Component<{ chave: string; children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null };
  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }
  componentDidUpdate(ant: { chave: string }) {
    if (ant.chave !== this.props.chave && this.state.erro) this.setState({ erro: null });
  }
  componentDidCatch(erro: Error) {
    console.error('[Portal NC] erro na página:', erro);
  }
  render() {
    if (!this.state.erro) return this.props.children;
    const versaoNova = /dynamically imported module|Failed to fetch|Loading chunk|Importing a module/i.test(String(this.state.erro?.message));
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-card">
        <p className="text-[18px] font-semibold">{versaoNova ? 'O portal foi atualizado' : 'Não foi possível abrir esta página'}</p>
        <p className="mt-2 text-[13px] text-muted">
          {versaoNova ? 'Recarregue para carregar a versão nova.' : 'Tente recarregar. Se continuar, avise o administrador.'}
        </p>
        <button onClick={() => window.location.reload()} className="mt-5 rounded-full bg-brand px-5 py-2 text-[13px] font-semibold text-white">
          Recarregar
        </button>
      </div>
    );
  }
}

/** Botão flutuante de voltar ao topo, aparece depois de rolar a página. */
function VoltarAoTopo() {
  const [ver, setVer] = useState(false);
  useEffect(() => {
    const f = () => setVer(window.scrollY > 700);
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <AnimatePresence>
      {ver && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.6 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-fg shadow-pop"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- layout

export function AppLayout() {
  const [menu, setMenu] = useState(false);
  const [busca, setBusca] = useState(false);
  const [recolhido, setRecolhido] = useState(lerRecolhido);
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBusca((v) => !v);
      }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, []);
  const alternarRecolhido = () =>
    setRecolhido((v) => {
      try {
        localStorage.setItem('unigas_menu_recolhido', v ? '0' : '1');
      } catch {
        /* ignora */
      }
      return !v;
    });

  return (
    <div className="min-h-screen" style={{ ['--menu' as string]: `${recolhido ? LARGURA.recolhido : LARGURA.aberto}px` }}>
      <BarraProgresso />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg">
        Pular para o conteúdo
      </a>
      <Sidebar aberto={menu} fechar={() => setMenu(false)} recolhido={recolhido} alternarRecolhido={alternarRecolhido} />
      <div className="transition-[padding] duration-300 ease-out lg:pl-[var(--menu)]">
        <Topbar abrirMenu={() => setMenu(true)} abrirBusca={() => setBusca(true)} />
        <main id="conteudo" className="mx-auto max-w-[1600px] px-4 pb-20 pt-7 sm:px-6 lg:px-10 lg:pt-9">
          <SaidaEntrada
            chave={loc.pathname}
            carregando={<div className="space-y-4">
                <Skeleton className="h-9 w-72" />
                <div className="grid gap-4 md:grid-cols-3">
                  <Skeleton className="h-36" />
                  <Skeleton className="h-36" />
                  <Skeleton className="h-36" />
                </div>
                <Skeleton className="h-80" />
              </div>}
          />
        </main>
      </div>
      <CommandPalette aberto={busca} fechar={() => setBusca(false)} />
      <VoltarAoTopo />
    </div>
  );
}
