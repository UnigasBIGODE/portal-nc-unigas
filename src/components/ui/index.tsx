/**
 * Componentes de interface no estilo shadcn/ui (Button, Card, Badge, Input,
 * Select, Textarea, Skeleton, Dialog, estados vazio/erro), sem dependências extras.
 */
import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as KeyboardEventReact,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, ChevronDown, Loader2, RotateCw, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------- Button

type Variant = 'primary' | 'secondary' | 'ghost' | 'brand' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantes: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg shadow-sm hover:shadow-md hover:opacity-90',
  secondary: 'bg-[var(--vg-raised)] text-fg border border-[var(--vg-rim)] shadow-[inset_0_1px_0_var(--vg-gloss),0_2px_8px_rgb(var(--vg-sombra)/0.08)] hover:bg-card hover:border-fg/15',
  outline: 'border border-line text-fg hover:bg-elevated',
  ghost: 'text-muted hover:text-fg hover:bg-elevated',
  brand: 'bg-brand text-white shadow-sm shadow-brand/30 hover:bg-brand-hover hover:shadow-md hover:shadow-brand/30',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
};
const tamanhos: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/** Onda (ripple) a partir do ponto clicado. */
function ondular(e: React.PointerEvent<HTMLElement>) {
  const alvo = e.currentTarget;
  const host = alvo.querySelector(':scope > .ripple-host');
  if (!host || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const r = alvo.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 2.2;
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.width = s.style.height = `${d}px`;
  s.style.left = `${e.clientX - r.left - d / 2}px`;
  s.style.top = `${e.clientY - r.top - d / 2}px`;
  host.appendChild(s);
  s.addEventListener('animationend', () => s.remove());
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, onPointerDown, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onPointerDown={(e) => {
        ondular(e);
        onPointerDown?.(e);
      }}
      className={cn(
        'lg-host lg-track relative inline-flex shrink-0 items-center justify-center rounded-full font-medium duration-300 disabled:pointer-events-none disabled:opacity-50',
        variantes[variant],
        tamanhos[size],
        className,
      )}
      {...props}
    >
      <span className="lg-btn" data-v={variant === 'primary' || variant === 'brand' ? 'solido' : 'vidro'} aria-hidden />
      <span className="ripple-host" aria-hidden />
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------- Card

/** Cartão. `lift`: sobe no hover com brilho seguindo o mouse. `tilt`: inclinação 3D suave. */
export function Card({ className, lift, tilt, onMouseMove, onMouseLeave, ...p }: HTMLAttributes<HTMLDivElement> & { lift?: boolean; tilt?: boolean }) {
  const mover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (lift || tilt) {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      if (tilt) {
        el.style.setProperty('--ry', `${((x / r.width) - 0.5) * 6}deg`);
        el.style.setProperty('--rx', `${(0.5 - y / r.height) * 6}deg`);
      }
    }
    onMouseMove?.(e);
  };
  const sair = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
    onMouseLeave?.(e);
  };
  return (
    <div
      className={cn('vg-painel', (lift || tilt) && 'card-lift card-spot', tilt && 'card-tilt', className)}
      onMouseMove={mover}
      onMouseLeave={sair}
      {...p}
    />
  );
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...p} />;
}

// ---------------------------------------------------------------- Badge

export type Tom = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
const tons: Record<Tom, string> = {
  neutral: 'bg-elevated text-fg/80 border-line',
  brand: 'bg-brand/[0.08] text-brand border-brand/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/[0.08] text-danger border-danger/25',
  info: 'bg-info/10 text-info border-info/25',
};

export function Badge({ tom = 'neutral', className, children, ...p }: HTMLAttributes<HTMLSpanElement> & { tom?: Tom }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium', tons[tom], className)} {...p}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Campos

const campoBase =
  'w-full rounded-xl border border-[var(--vg-line)] bg-[var(--vg-raised)] px-3 text-sm shadow-[inset_0_1px_0_var(--vg-gloss)] text-fg placeholder:text-muted/70 transition-colors focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

export function Field({ label, hint, erro, children, className }: { label?: ReactNode; hint?: ReactNode; erro?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-fg/90">{label}</span>}
      {children}
      {hint && !erro && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
      {erro && <span className="mt-1 block text-[12px] text-danger">{erro}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(campoBase, 'h-10', className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(campoBase, 'min-h-[96px] resize-none py-2.5 leading-relaxed', className)} {...p} />;
});

type OpcaoSel = { value: string; label: ReactNode; texto: string; disabled?: boolean };

function textoDe(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textoDe).join('');
  if (isValidElement(n)) return textoDe((n.props as { children?: ReactNode }).children);
  return '';
}

function lerOpcoes(children: ReactNode): OpcaoSel[] {
  const out: OpcaoSel[] = [];
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const pr = c.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    if (c.type === 'option') {
      const texto = textoDe(pr.children);
      out.push({ value: pr.value !== undefined ? String(pr.value) : texto, label: pr.children, texto, disabled: pr.disabled });
    } else if (pr.children) out.push(...lerOpcoes(pr.children));
  });
  return out;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  onChange?: (e: { target: { value: string; name?: string }; currentTarget: { value: string; name?: string } }) => void;
  /** Destaca o campo (ex.: filtro com valor escolhido). */
  ativo?: boolean;
  /** Ícone à esquerda do texto. */
  icone?: ReactNode;
};

/**
 * Lista de opções com o visual do portal (substitui o <select> nativo, que usa o menu do sistema):
 * popover animado com vidro, marcação da opção escolhida, busca em listas longas e teclado.
 * Mantém a mesma API do <select>: <option> como filhos e onChange(e) com e.target.value.
 */
export function Select({ className, children, style, value, defaultValue, onChange, disabled, ativo, icone, name, id, ...resto }: SelectProps) {
  const opcoes = lerOpcoes(children);
  const [interno, setInterno] = useState(String(defaultValue ?? opcoes[0]?.value ?? ''));
  const atual = value !== undefined && value !== null ? String(value) : interno;
  const sel = opcoes.find((o) => o.value === atual) ?? opcoes[0];
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [foco, setFoco] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; acima: boolean; maxH: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const campoBusca = useRef<HTMLInputElement>(null);
  const listaId = useId();
  const comBusca = opcoes.length > 8;
  const q = semAcento(busca.trim());
  const visiveis = q ? opcoes.filter((o) => semAcento(o.texto).includes(q)) : opcoes;
  const tecla = useRef({ texto: '', t: 0 });
  const ariaLabel = (resto as { 'aria-label'?: string })['aria-label'];

  const posicionar = () => {
    const b = botao.current?.getBoundingClientRect();
    if (!b) return;
    const largura = Math.min(Math.max(b.width, 240), window.innerWidth - 16);
    const left = Math.min(Math.max(8, b.left), window.innerWidth - largura - 8);
    const abaixo = window.innerHeight - b.bottom - 12;
    const acima = abaixo < 260 && b.top > abaixo;
    const maxH = Math.min(360, (acima ? b.top : abaixo) - 12);
    setPos({ left, top: acima ? b.top - 6 : b.bottom + 6, width: largura, acima, maxH });
  };

  function abrir() {
    if (disabled) return;
    posicionar();
    setBusca('');
    setFoco(Math.max(0, opcoes.findIndex((o) => o.value === atual)));
    setAberto(true);
  }
  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  }
  function escolher(o: OpcaoSel) {
    if (o.disabled) return;
    if (value === undefined) setInterno(o.value);
    const alvo = { value: o.value, name };
    if (o.value !== atual) onChange?.({ target: alvo, currentTarget: alvo });
    fechar();
  }

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!botao.current?.contains(t) && !lista.current?.contains(t)) fechar(false);
    };
    const mover = () => posicionar();
    document.addEventListener('mousedown', fora);
    window.addEventListener('resize', mover);
    window.addEventListener('scroll', mover, true);
    if (comBusca) setTimeout(() => campoBusca.current?.focus(), 30);
    else setTimeout(() => lista.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('resize', mover);
      window.removeEventListener('scroll', mover, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    lista.current?.querySelector<HTMLElement>(`[data-i="${foco}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [foco, aberto]);

  function teclado(e: KeyboardEventReact<HTMLElement>) {
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      fechar();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFoco((f) => Math.min(visiveis.length - 1, f + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFoco((f) => Math.max(0, f - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFoco(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFoco(visiveis.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = visiveis[foco];
      if (o) escolher(o);
    } else if (e.key === 'Tab') {
      fechar(false);
    } else if (!comBusca && e.key.length === 1) {
      const agora = Date.now();
      tecla.current.texto = (agora - tecla.current.t < 600 ? tecla.current.texto : '') + semAcento(e.key);
      tecla.current.t = agora;
      const i = visiveis.findIndex((o) => semAcento(o.texto).startsWith(tecla.current.texto));
      if (i >= 0) setFoco(i);
    }
  }

  const vazio = !sel || sel.value === '';
  return (
    <>
      <button
        ref={botao}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={teclado}
        style={style}
        className={cn(
          campoBase,
          'lg-track group relative flex h-10 items-center gap-2 pr-9 text-left transition-[border-color,box-shadow,background-color] duration-200',
          'hover:border-fg/20 hover:shadow-sm',
          aberto && 'border-brand/50 ring-4 ring-brand/10',
          ativo && !aberto && 'border-brand/35 bg-brand/[0.06] text-fg',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {icone && <span className={cn('shrink-0 text-muted transition-colors', (ativo || aberto) && 'text-brand')}>{icone}</span>}
        <span className={cn('min-w-0 flex-1 truncate', vazio && !ativo && 'text-fg/80', ativo && 'font-medium')}>{sel ? sel.label : ''}</span>
        <motion.span
          className={cn('pointer-events-none absolute right-3 top-1/2 -mt-2 text-muted', (ativo || aberto) && 'text-brand')}
          animate={{ rotate: aberto ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      {name && <input type="hidden" name={name} value={atual} />}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {aberto && pos && (
              <motion.div
                ref={lista}
                id={listaId}
                role="listbox"
                tabIndex={-1}
                aria-label={ariaLabel}
                onKeyDown={teclado}
                initial={{ opacity: 0, y: pos.acima ? 8 : -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: pos.acima ? 6 : -6, scale: 0.97, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                style={{
                  position: 'fixed',
                  left: pos.left,
                  width: pos.width,
                  ...(pos.acima ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
                  transformOrigin: pos.acima ? 'bottom center' : 'top center',
                }}
                className="sel-painel z-[70] overflow-hidden rounded-2xl border border-line bg-card/95 p-1.5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35),0_8px_20px_-12px_rgba(15,23,42,0.2)] outline-none backdrop-blur-xl"
              >
                {comBusca && (
                  <div className="relative mb-1.5 px-0.5 pt-0.5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      ref={campoBusca}
                      value={busca}
                      onChange={(e) => {
                        setBusca(e.target.value);
                        setFoco(0);
                      }}
                      onKeyDown={teclado}
                      placeholder="Buscar…"
                      className="h-9 w-full rounded-xl border border-line bg-elevated/60 pl-9 pr-3 text-[13px] outline-none transition focus:border-brand/40 focus:bg-card"
                      aria-label="Buscar opção"
                    />
                  </div>
                )}
                <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: pos.maxH - (comBusca ? 46 : 0) }}>
                  {visiveis.map((o, i) => {
                    const escolhida = o.value === atual;
                    return (
                      <div
                        key={o.value + i}
                        data-i={i}
                        role="option"
                        aria-selected={escolhida}
                        aria-disabled={o.disabled || undefined}
                        onMouseEnter={() => setFoco(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => escolher(o)}
                        className={cn(
                          'lg-track relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition-colors',
                          escolhida ? 'font-semibold text-brand' : 'text-fg',
                          o.disabled && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        {foco === i && <motion.span layoutId={`sel-foco-${listaId}`} className="lg-glass rounded-xl" transition={{ type: 'spring', stiffness: 600, damping: 38 }} />}
                        <span className="relative min-w-0 flex-1 truncate">{o.label}</span>
                        {escolhida && (
                          <motion.span className="relative" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                            <Check className="h-4 w-4" />
                          </motion.span>
                        )}
                      </div>
                    );
                  })}
                  {!visiveis.length && <p className="px-3 py-4 text-center text-[13px] text-muted">Nada encontrado.</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------- Skeleton / estados

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-xl bg-elevated', className)} aria-hidden />;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('anim-fade-up flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <motion.div
          className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-card text-muted shadow-sm"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="absolute -inset-3 -z-10 rounded-3xl bg-elevated/70 blur-md" aria-hidden />
          {icon}
        </motion.div>
      )}
      <p className="text-[15px] font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ mensagem, onRetry, className }: { mensagem: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
      <div className="grid h-12 w-12 place-items-center rounded-full bg-danger/12 text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="font-semibold">Não foi possível carregar</p>
        <p className="mt-1 max-w-md text-sm text-muted">{mensagem}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function Aviso({ tom = 'danger', children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border px-3.5 py-2.5 text-sm', tons[tom], className)}>{children}</div>;
}

// ---------------------------------------------------------------- Dialog

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="dialog" className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }}>
          <motion.div
            className="absolute inset-0 bg-[#0B0B0D]/40 backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={cn(
              'vg-modal relative flex max-h-[92vh] w-full flex-col rounded-t-[24px] border border-line bg-card shadow-pop sm:rounded-[24px]',
              size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl',
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h2 id={id} className="text-[17px] font-semibold tracking-tight">
                  {title}
                </h2>
                {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8" onClick={onClose} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-elevated/40 px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------------------------------------------------------------- Abas segmentadas (indicador deslizante)

export function Pills<T extends string>({
  value,
  onChange,
  itens,
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  itens: { value: T; label: ReactNode; count?: number }[];
  className?: string;
  label?: string;
}) {
  const grupo = useId();
  const [sobre, setSobre] = useState<T | null>(null);
  return (
    <div role="tablist" aria-label={label} onMouseLeave={() => setSobre(null)} className={cn('vg-segmento flex gap-1 overflow-x-auto rounded-full p-1', className)}>
      {itens.map((i) => {
        const ativo = i.value === value;
        return (
          <button
            key={i.value}
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(i.value)}
            onMouseEnter={() => setSobre(i.value)}
            className={cn(
              'lg-track relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200',
              ativo ? 'text-primary-fg' : 'text-muted hover:text-fg',
            )}
          >
            <AnimatePresence>
              {sobre === i.value && !ativo && (
                <motion.span
                  layoutId={`vidro-${grupo}`}
                  className="lg-glass rounded-full"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.7 }}
                />
              )}
            </AnimatePresence>
            {ativo && (
              <motion.span
                layoutId={`pill-${grupo}`}
                className="absolute inset-0 rounded-full bg-primary shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              >
                <span className="lg-btn !opacity-100" data-v="solido" style={{ zIndex: 0 }} />
              </motion.span>
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {i.label}
              {i.count !== undefined && (
                <span className={cn('tabular rounded-full px-1.5 text-[11px] transition-colors', ativo ? 'bg-primary-fg/15' : 'bg-elevated')}>{i.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Abas com sublinhado deslizante (para seções dentro de uma página). */
export function Tabs<T extends string>({ value, onChange, itens, className }: { value: T; onChange: (v: T) => void; itens: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  const grupo = useId();
  const [sobre, setSobre] = useState<T | null>(null);
  return (
    <div role="tablist" onMouseLeave={() => setSobre(null)} className={cn('flex gap-6 border-b border-line', className)}>
      {itens.map((i) => {
        const ativo = i.value === value;
        return (
          <button
            key={i.value}
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(i.value)}
            onMouseEnter={() => setSobre(i.value)}
            className={cn('lg-track relative -mb-px inline-flex items-center gap-2 pb-3 pt-1 text-[14px] font-medium transition-colors', ativo ? 'text-fg' : 'text-muted hover:text-fg')}
          >
            <AnimatePresence>
              {sobre === i.value && (
                <motion.span
                  layoutId={`vidro-tab-${grupo}`}
                  className="lg-glass !-inset-x-3 !-top-1.5 !bottom-1.5 rounded-xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.7 }}
                />
              )}
            </AnimatePresence>
            <span className="relative inline-flex items-center gap-2">
              {i.label}
              {i.count !== undefined && <span className={cn('tabular rounded-full px-1.5 text-[11px]', ativo ? 'bg-brand text-white' : 'bg-elevated text-muted')}>{i.count}</span>}
            </span>
            {ativo && <motion.span layoutId={`tab-${grupo}`} className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <motion.div className="min-w-0" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
        {eyebrow && <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>}
        <h1 className="vg-titulo">{title}</h1>
        {subtitle && <p className="mt-2 text-[13px] font-medium text-[var(--vg-muted)]">{subtitle}</p>}
      </motion.div>
      {actions && (
        <motion.div className="flex flex-wrap items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
          {actions}
        </motion.div>
      )}
    </div>
  );
}
