import { CarregandoPagina } from '@/components/CarregandoLogo';
import { LiquidToggle, NimbusToggleIcons } from '@/components/ui/liquid-glass-toggle';
import { Component, Suspense, createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Bell, ChevronRight, ChevronsLeft, LifeBuoy, LogOut, Menu, Search, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useInstalarApp } from '@/lib/pwa';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/context/ThemeContext';
import { useAlertas } from '@/hooks/queries';
import { totalPendencias, usePendencias } from '@/pages/admin/Pendencias';
import { Logo } from '../Logo';
import { Avatar } from '../Avatar';
import { AlertaBadge } from '../StatusBadges';
import { Badge, Button, Dialog, Skeleton } from '../ui';
import { cn } from '@/lib/utils';
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

/** Vidro compartilhado do menu: uma "gota" que desliza até o item sob o mouse. */
const HoverMenu = createContext<{ hover: string | null; setHover: (v: string | null, el?: HTMLElement | null, rotulo?: string) => void }>({ hover: null, setHover: () => {} });

/** Vidro deslizante reutilizado pelos itens do menu que não são links (Suporte, Sair…). */
function VidroMenu({ id }: { id: string }) {
  const { hover } = useContext(HoverMenu);
  return (
    <AnimatePresence>
      {hover === id && (
        <motion.span
          layoutId="lg-menu"
          className="lg-glass rounded-xl"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.7 }}
        />
      )}
    </AnimatePresence>
  );
}

function ItemMenu({ item, recolhido, badge, indice }: { item: ItemNav; recolhido: boolean; badge?: number; indice: number }) {
  const Icon = item.icon;
  const { hover, setHover } = useContext(HoverMenu);
  return (
    <NavLink
      to={item.to}
      onMouseEnter={(e) => setHover(item.to, e.currentTarget, item.label)}
      onFocus={(e) => setHover(item.to, e.currentTarget, item.label)}
      end={item.end}
      aria-label={recolhido ? item.label : undefined}
      style={{ ['--d' as string]: `${40 + indice * 30}ms` }}
      className={({ isActive }) =>
        cn(
          'anim-slide-right lg-track group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium outline-none transition-colors duration-200',
          isActive ? 'font-semibold text-[var(--vg-pick-ink)]' : 'text-muted hover:text-fg',
          recolhido && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="menu-ativo"
              className="vg-pick absolute inset-0 rounded-xl"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <AnimatePresence>
            {hover === item.to && (
              <motion.span
                layoutId="lg-menu"
                className="lg-glass rounded-xl"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.7 }}
              />
            )}
          </AnimatePresence>
          <Icon className="relative h-[18px] w-[18px] shrink-0 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.18]" aria-hidden />
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

// ---------------------------------------------------------------- instalar app

function BotaoInstalar({ recolhido }: { recolhido: boolean }) {
  const { podeInstalar, precisaInstrucoesIOS, instalar } = useInstalarApp();
  const { setHover } = useContext(HoverMenu);
  const toast = useToast();
  const [ios, setIos] = useState(false);
  if (!podeInstalar && !precisaInstrucoesIOS) return null;
  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.97 }}
        onMouseEnter={(e) => setHover('instalar', e.currentTarget, 'Instalar app')}
        onClick={async (e) => {
          e.stopPropagation();
          if (podeInstalar) {
            if (await instalar()) toast({ tipo: 'sucesso', titulo: 'App instalado', descricao: 'Abra o Portal NC direto pela tela inicial.' });
          } else setIos(true);
        }}
        aria-label={recolhido ? 'Instalar app' : undefined}
        className={cn('lg-track relative flex h-10 w-full items-center gap-3 overflow-hidden rounded-xl bg-brand/[0.07] px-3 text-[14px] font-semibold text-brand transition-colors hover:bg-brand/[0.12]', recolhido && 'justify-center px-0')}
      >
        <motion.span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 4 }} aria-hidden />
        <VidroMenu id="instalar" />
        <Smartphone className="relative h-[18px] w-[18px]" aria-hidden /> {!recolhido && <span className="relative">Instalar app</span>}
      </motion.button>
      <Dialog open={ios} onClose={() => setIos(false)} size="sm" title="Instalar no iPhone / iPad" footer={<Button onClick={() => setIos(false)}>Entendi</Button>}>
        <ol className="space-y-3 text-[14px]">
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[12px] font-bold text-white">1</span> Abra o portal no <b>Safari</b>.</li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[12px] font-bold text-white">2</span> Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[12px] font-bold text-white">3</span> Escolha <b>Adicionar à Tela de Início</b> e confirme.</li>
        </ol>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- sidebar

function Sidebar({ aberto, fechar, recolhido, alternarRecolhido }: { aberto: boolean; fechar: () => void; recolhido: boolean; alternarRecolhido: () => void }) {
  const { usuario, isAdmin, logout, config } = useAuth();
  const { data: alertas } = useAlertas();
  const { data: pend } = usePendencias(isAdmin);
  const navigate = useNavigate();
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const f = () => setDesktop(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);
  const [dica, setDica] = useState<{ rotulo: string; y: number } | null>(null);
  const definirHover = (v: string | null, el?: HTMLElement | null, rotulo?: string) => {
    setHoverMenu(v);
    if (el && rotulo) {
      const b = el.getBoundingClientRect();
      setDica({ rotulo, y: b.top + b.height / 2 });
    } else setDica(null);
  };
  if (!usuario) return null;
  const r = desktop && recolhido;
  const areasTxt = usuario.areas.join(' · ');

  return (
    <HoverMenu.Provider value={{ hover: hoverMenu, setHover: definirHover }}>
      <AnimatePresence>
        {aberto && !desktop && (
          <motion.div className="fixed inset-0 z-40 bg-[#0B0B0D]/40 backdrop-blur-[3px]" onClick={fechar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {r && dica && hoverMenu && (
          <motion.span
            key="dica"
            className="vg-dica-flutuante pointer-events-none fixed z-[70] whitespace-nowrap rounded-[9px] border border-[var(--vg-rim)] bg-[var(--vg-pick)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--vg-ink)] shadow-[0_3px_10px_rgb(var(--vg-sombra)/0.18)]"
            style={{ left: LARGURA.recolhido + 10 }}
            initial={{ opacity: 0, x: -6, top: dica.y, y: '-50%' }}
            animate={{ opacity: 1, x: 0, top: dica.y, y: '-50%' }}
            exit={{ opacity: 0, x: -4, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
          >
            {dica.rotulo}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.aside
        onMouseLeave={() => definirHover(null)}
        aria-label="Menu principal"
        className="vg-trilho fixed inset-y-0 left-0 z-50 flex flex-col !rounded-none !border-y-0 !border-l-0"
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

        <div className={cn('vg-painel mx-4 mb-4 flex items-center gap-3 !rounded-2xl p-2.5 transition-all', r && 'mx-3 justify-center !border-transparent !bg-none !bg-transparent p-0 !shadow-none')}>
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 15, delay: 0.15 }}>
            <Link to="/conta" onClick={fechar} title={usuario.nome} aria-label="Minha conta" className="block rounded-full">
              <Avatar nome={usuario.nome} foto={usuario.foto} className="h-10 w-10 text-[13px]" />
            </Link>
          </motion.div>
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
                  <ItemMenu key={m.to} item={m} indice={MENU.length + i} recolhido={r} badge={m.to === '/admin/pendencias' ? totalPendencias(pend) : undefined} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className={cn('space-y-0.5 border-t border-line px-4 py-3', r && 'px-3')} onClick={() => !desktop && fechar()}>
          <BotaoInstalar recolhido={r} />
          <ItemMenu item={CONTA} indice={20} recolhido={r} />
          <a
            href={config?.emailSuporte ? `mailto:${config.emailSuporte}?subject=Portal%20de%20NCs` : '#'}
            aria-label={r ? `Suporte${config?.emailSuporte ? ': ' + config.emailSuporte : ''}` : undefined}
            onMouseEnter={(e) => definirHover('suporte', e.currentTarget, 'Suporte')}
            className={cn('lg-track group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-muted transition-colors hover:text-fg', r && 'justify-center px-0')}
          >
            <VidroMenu id="suporte" />
            <LifeBuoy className="relative h-[18px] w-[18px] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.18] group-hover:rotate-45" aria-hidden />
            {!r && <span className="relative">Suporte</span>}
          </a>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            aria-label={r ? 'Sair' : undefined}
            onMouseEnter={(e) => definirHover('sair', e.currentTarget, 'Sair')}
            className={cn('lg-track group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-muted transition-colors hover:text-danger', r && 'justify-center px-0')}
          >
            <VidroMenu id="sair" />
            <LogOut className="relative h-[18px] w-[18px] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-0.5 group-hover:scale-[1.18]" aria-hidden />
            {!r && <span className="relative">Sair</span>}
          </button>
        </div>

        {desktop && (
          <button
            onClick={alternarRecolhido}
            className="vg-botao absolute -right-3 top-[86px] h-6 w-6 !bg-[var(--vg-raised)] text-muted hover:text-fg"
            aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          >
            <motion.span animate={{ rotate: recolhido ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </motion.span>
          </button>
        )}
      </motion.aside>
    </HoverMenu.Provider>
  );
}

// ---------------------------------------------------------------- sino

function Sino() {
  const { data, isLoading } = useAlertas();
  const [aberto, setAberto] = useState(false);
  const [sobre, setSobre] = useState<number | null>(null);
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
      <button className="vg-botao relative h-10 w-10" onClick={() => setAberto((v) => !v)} aria-label={`Alertas: ${total} pendentes`} aria-expanded={aberto}>
        <motion.span animate={total ? { rotate: [0, -14, 12, -8, 6, 0] } : {}} transition={{ duration: 0.9, delay: 1.2, repeat: Infinity, repeatDelay: 8 }}>
          <Bell className="h-[18px] w-[18px]" />
        </motion.span>
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5">
            {(data?.criticos ?? 0) > 0 && <span className="anim-ping absolute inset-0 rounded-full bg-brand" aria-hidden />}
            <span className="tabular relative grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white ring-2 ring-white/80 dark:ring-black/40">{total > 99 ? '99+' : total}</span>
          </span>
        )}
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="vg-trilho absolute right-0 z-40 mt-3 w-[min(92vw,400px)] origin-top-right overflow-hidden rounded-[22px] !bg-card/90 shadow-pop"
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
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }} onMouseEnter={() => setSobre(i)} onMouseLeave={() => setSobre(null)}>
                  <Link to={`/ncs/${a.nc_id}`} className="lg-track group relative flex gap-3 rounded-xl px-3 py-2.5 [&>*]:relative">
                    <AnimatePresence>
                      {sobre === i && (
                        <motion.span layoutId="lg-sino" className="lg-glass !absolute rounded-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }} />
                      )}
                    </AnimatePresence>
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
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 lg:px-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="vg-trilho mx-auto flex h-[60px] max-w-[1600px] items-center gap-3 rounded-[22px] py-1.5 pl-2 pr-2 sm:rounded-full sm:pl-4"
      >
        <button className="vg-botao h-10 w-10 shrink-0 lg:hidden" onClick={abrirMenu} aria-label="Abrir menu">
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <nav aria-label="Trilha" className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <span className="hidden text-muted xl:inline">Portal NC</span>
          {migalhas.map((m, i) => {
            const ultimo = i === migalhas.length - 1;
            return (
              <motion.span
                key={loc.pathname + i}
                className={cn('min-w-0 items-center gap-1.5', ultimo ? 'flex' : 'hidden xl:flex')}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted/60 xl:block" />
                {m.to && !ultimo ? (
                  <Link to={m.to} className="truncate text-muted hover:text-fg">
                    {m.label}
                  </Link>
                ) : (
                  <span className={cn('truncate', ultimo ? 'text-[15px] font-semibold text-fg xl:text-[13px]' : 'text-muted')}>{m.label}</span>
                )}
              </motion.span>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={abrirBusca}
            className="vg-perguntar group flex h-10 w-10 items-center justify-center gap-2.5 rounded-full text-[13px] sm:w-80 sm:justify-start sm:pl-1.5 sm:pr-2"
            aria-label="Busca rápida"
          >
            <span className="vg-orbe hidden sm:block" aria-hidden />
            <span key={loc.pathname} className="vg-digitar hidden flex-1 text-left font-medium sm:block">Buscar NC, página…</span>
            <Search className="h-4 w-4 transition-transform group-hover:scale-110 sm:hidden" />
            <kbd className="hidden rounded-md border border-line bg-card/70 px-1.5 py-0.5 font-sans text-[11px] sm:block">{mac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <LiquidToggle
            size={34}
            tone={tema === 'dark' ? 'dark' : 'light'}
            checked={tema === 'dark'}
            onCheckedChange={(escuro) => {
              if (escuro === (tema === 'dark')) return;
              const r = document.querySelector('.nimbus-toggle')?.getBoundingClientRect();
              alternar(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
            }}
            icons={{ off: NimbusToggleIcons.sun, on: NimbusToggleIcons.moon }}
            label={tema === 'dark' ? 'Tema escuro ativo — mudar para claro' : 'Tema claro ativo — mudar para escuro'}
            className="shrink-0"
          />
          <Sino />
          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.25 }} className="hidden sm:block">
            <Link to="/conta" aria-label="Minha conta" title={usuario?.nome} className="block rounded-full">
              <Avatar nome={usuario?.nome ?? ''} foto={usuario?.foto} className="h-10 w-10 text-[13px]" />
            </Link>
          </motion.span>
        </div>
      </motion.div>
    </header>
  );
}

// ---------------------------------------------------------------- transições de página

/** Página que sai desliza e desfoca; a nova entra subindo. */
function SaidaEntrada({ chave, carregando }: { chave: string; carregando: ReactNode }) {
  // Animação só em CSS (fill-mode "backwards"): mesmo que seja interrompida, a página
  // termina sempre visível — nunca fica em branco.
  return (
    <div key={chave} className="anim-pagina vg-palco">
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
  // também no <html>, para elementos renderizados fora do layout (portais)
  useEffect(() => {
    document.documentElement.style.setProperty('--menu', `${recolhido ? LARGURA.recolhido : LARGURA.aberto}px`);
  }, [recolhido]);

  return (
    <div className="min-h-screen" style={{ ['--menu' as string]: `${recolhido ? LARGURA.recolhido : LARGURA.aberto}px` }}>
      <BarraProgresso />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg">
        Pular para o conteúdo
      </a>
      <Sidebar aberto={menu} fechar={() => setMenu(false)} recolhido={recolhido} alternarRecolhido={alternarRecolhido} />
      <div className="transition-[padding] duration-300 ease-out lg:pl-[var(--menu)]">
        <Topbar abrirMenu={() => setMenu(true)} abrirBusca={() => setBusca(true)} />
        <div className="vg-cena" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <main id="conteudo" className="relative z-[1] mx-auto max-w-[1600px] px-3 pb-20 pt-5 sm:px-5 lg:px-6 lg:pt-6">
          <SaidaEntrada
            chave={loc.pathname}
            carregando={<CarregandoPagina />}
          />
        </main>
      </div>
      <CommandPalette aberto={busca} fechar={() => setBusca(false)} />
      <VoltarAoTopo />
    </div>
  );
}
