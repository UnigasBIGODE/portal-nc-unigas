import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Mail, RotateCcw } from 'lucide-react';
import { MODO_DEMO } from '@/lib/api';

/** Converte o link do e-mail (…/#/definir-senha?token=…) numa rota interna da demo. */
export function rotaDoLink(link?: string) {
  if (!link || !link.includes('token=')) return null;
  return '/definir-senha?' + link.split('?')[1];
}

/** Credenciais de teste exibidas na tela de login (só no modo demonstração). */
export function PainelLoginDemo({ preencher }: { preencher: (email: string, senha: string) => void }) {
  const [logins, setLogins] = useState<{ perfil: string; email: string; senha: string }[]>([]);
  useEffect(() => {
    if (MODO_DEMO) import('./backend').then((m) => setLogins(m.loginsDemo()));
  }, []);
  if (!MODO_DEMO) return null;
  return (
    <div className="mt-5 rounded-2xl border border-line bg-elevated/70 p-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
        <FlaskConical className="h-4 w-4 text-[#E30613]" /> Demonstração — clique para entrar como:
      </p>
      <div className="mt-3 space-y-2">
        {logins.map((l) => (
          <button
            key={l.email}
            type="button"
            onClick={() => preencher(l.email, l.senha)}
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
          >
            <span className="block text-[13px] font-medium text-fg">{l.perfil}</span>
            <span className="block truncate text-[12px] text-muted">
              {l.email} · {l.senha}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => import('./backend').then((m) => m.restaurarDemo())}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg"
      >
        <RotateCcw className="h-3 w-3" /> Restaurar dados de exemplo
      </button>
    </div>
  );
}

/** Na demo os e-mails não saem de verdade: mostra a "caixa de saída". */
export function EmailsDemo() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<{ to: string; subject: string; link?: string }[]>([]);
  useEffect(() => {
    if (!MODO_DEMO) return;
    const carregar = () => import('./backend').then((m) => setLista([...m.emailsDemo]));
    carregar();
    window.addEventListener('unigas:demo-email', carregar);
    return () => window.removeEventListener('unigas:demo-email', carregar);
  }, []);
  if (!MODO_DEMO || !lista.length) return null;
  return (
    <div className="mt-4 rounded-2xl border border-line bg-elevated/70 p-3 text-left">
      <p className="flex items-center gap-2 text-[12px] font-semibold text-fg">
        <Mail className="h-3.5 w-3.5" /> E-mail simulado (demonstração)
      </p>
      {lista.slice(0, 1).map((e, i) => (
        <div key={i} className="mt-2 text-[12px] text-muted">
          Para {e.to}: “{e.subject}”
          {rotaDoLink(e.link) && (
            <button className="mt-1 block font-medium text-[#E30613] hover:underline" onClick={() => navigate(rotaDoLink(e.link)!)}>
              Abrir o link do e-mail →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
