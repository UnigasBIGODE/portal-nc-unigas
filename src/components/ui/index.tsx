/**
 * Componentes de interface no estilo shadcn/ui (Button, Card, Badge, Input,
 * Select, Textarea, Skeleton, Dialog, estados vazio/erro), sem dependências extras.
 */
import {
  forwardRef,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, RotateCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------- Button

type Variant = 'primary' | 'secondary' | 'ghost' | 'brand' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantes: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg shadow-sm hover:shadow-md hover:opacity-90',
  secondary: 'bg-card text-fg border border-line shadow-sm hover:bg-elevated hover:border-fg/15',
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variantes[variant],
        tamanhos[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------- Card

export function Card({ className, lift, ...p }: HTMLAttributes<HTMLDivElement> & { lift?: boolean }) {
  return <div className={cn('rounded-card border border-line bg-card shadow-card', lift && 'card-lift', className)} {...p} />;
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
  'w-full rounded-xl border border-line bg-card px-3 text-sm shadow-sm text-fg placeholder:text-muted/70 transition-colors focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

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

const SETA_SELECT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238E8E96' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, style, ...p }, ref) {
  return (
    <select
      ref={ref}
      className={cn(campoBase, 'h-10 cursor-pointer appearance-none pr-8', className)}
      style={{ backgroundImage: SETA_SELECT, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', ...style }}
      {...p}
    >
      {children}
    </select>
  );
});

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
              'relative flex max-h-[92vh] w-full flex-col rounded-t-card border border-line bg-card shadow-pop sm:rounded-card',
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
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1 overflow-x-auto rounded-full border border-line bg-card p-1 shadow-sm', className)}>
      {itens.map((i) => {
        const ativo = i.value === value;
        return (
          <button
            key={i.value}
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(i.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200',
              ativo ? 'text-primary-fg' : 'text-muted hover:text-fg',
            )}
          >
            {ativo && (
              <motion.span
                layoutId={`pill-${grupo}`}
                className="absolute inset-0 rounded-full bg-primary shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
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
  return (
    <div role="tablist" className={cn('flex gap-6 border-b border-line', className)}>
      {itens.map((i) => {
        const ativo = i.value === value;
        return (
          <button
            key={i.value}
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(i.value)}
            className={cn('relative -mb-px inline-flex items-center gap-2 pb-3 pt-1 text-[14px] font-medium transition-colors', ativo ? 'text-fg' : 'text-muted hover:text-fg')}
          >
            {i.label}
            {i.count !== undefined && <span className={cn('tabular rounded-full px-1.5 text-[11px]', ativo ? 'bg-brand text-white' : 'bg-elevated text-muted')}>{i.count}</span>}
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
        {eyebrow && <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-brand">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </motion.div>
      {actions && (
        <motion.div className="flex flex-wrap items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
          {actions}
        </motion.div>
      )}
    </div>
  );
}
