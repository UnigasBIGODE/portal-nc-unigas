import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export function Logo({ className, forcarEscuro, forcarClaro }: { className?: string; forcarEscuro?: boolean; forcarClaro?: boolean }) {
  const { tema } = useTheme();
  const src = forcarClaro ? './logo-light.png' : forcarEscuro || tema === 'dark' ? './logo-dark.png' : './logo-light.png';
  return <img src={src} alt="Unigás" className={cn('select-none', className)} draggable={false} />;
}
