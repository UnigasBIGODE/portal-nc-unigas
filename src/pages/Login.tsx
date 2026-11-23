import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Aviso, Button, Field, Input } from '@/components/ui';
import { mensagemErro } from '@/lib/api';
import { useTitulo } from '@/hooks/queries';
import { NumeroAnimado } from '@/components/KpiCard';
import { PainelLoginDemo } from '@/demo/PainelDemo';

/** Moldura das telas públicas: tema claro, painel da marca animado + formulário. */
export function TelaPublica({ children }: { children: ReactNode }) {
  return (
    <div className="light relative grid min-h-screen bg-[#F5F6F8] text-[#111318] lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca */}
      <aside className="relative hidden overflow-hidden border-r border-[#E6E8EC] bg-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="anim-float-a pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#E30613]/10 blur-[90px]" aria-hidden />
        <div className="anim-float-b pointer-events-none absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-[#111318]/[0.06] blur-[90px]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{ backgroundImage: 'radial-gradient(rgb(17 19 24 / 0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          aria-hidden
        />
        <Logo forcarClaro className="anim-fade-in relative h-14 w-auto self-start" />
        <div className="relative">
          <p className="anim-fade-up text-[13px] font-semibold uppercase tracking-[0.14em] text-[#E30613]">Portal de Não Conformidades</p>
          <h2 className="anim-fade-up mt-3 max-w-md text-[40px] font-bold leading-[1.1] tracking-tight" style={{ ['--d' as string]: '80ms' }}>
            Cada NC no prazo, cada área no controle.
          </h2>
          <p className="anim-fade-up mt-4 max-w-md text-[15px] leading-relaxed text-[#666C7A]" style={{ ['--d' as string]: '160ms' }}>
            Acompanhe as não conformidades do Obrasoft em tempo real, com alertas automáticos e indicadores por área.
          </p>
          <IlustracaoKpis />
        </div>
        <p className="relative text-[12px] text-[#666C7A]">© {new Date().getFullYear()} Unigás – Sistemas de Aquecimento</p>
      </aside>

      {/* Formulário */}
      <main className="relative flex items-center justify-center px-5 py-10">
        <div className="anim-float-a pointer-events-none absolute right-10 top-10 h-64 w-64 rounded-full bg-[#E30613]/[0.06] blur-[80px] lg:hidden" aria-hidden />
        <div className="relative w-full max-w-[420px]">
          <Logo forcarClaro className="anim-fade-in mx-auto mb-8 h-16 w-auto lg:hidden" />
          <div className="anim-scale-in rounded-[20px] border border-[#E6E8EC] bg-white p-7 shadow-[0_24px_60px_-28px_rgba(16,24,40,0.25)] sm:p-8">{children}</div>
          <p className="mt-6 text-center text-[12px] text-[#666C7A] lg:hidden">Portal de Não Conformidades · Unigás</p>
        </div>
      </main>
    </div>
  );
}

function IlustracaoKpis() {
  const barras = [38, 52, 44, 68, 57, 74, 63, 82];
  return (
    <div className="relative mt-10 grid max-w-md grid-cols-[1.25fr_1fr] gap-3">
      <div className="anim-fade-up rounded-2xl border border-[#E6E8EC] bg-white/90 p-4 shadow-[0_12px_30px_-18px_rgba(16,24,40,0.3)] backdrop-blur" style={{ ['--d' as string]: '260ms' }}>
        <p className="text-[12px] text-[#666C7A]">Encerradas no prazo</p>
        <div className="mt-3 flex h-20 items-end gap-1.5">
          {barras.map((h, i) => (
            <span
              key={i}
              className="anim-grow-y w-full rounded-t-md"
              style={{ height: `${h}%`, background: i === barras.length - 1 ? '#E30613' : `linear-gradient(to top, #E4E4E7, #8A8A94)`, ['--d' as string]: `${400 + i * 70}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="anim-fade-up rounded-2xl border border-[#E6E8EC] bg-white/90 p-4 shadow-[0_12px_30px_-18px_rgba(16,24,40,0.3)]" style={{ ['--d' as string]: '340ms' }}>
          <p className="text-[12px] text-[#666C7A]">% no prazo</p>
          <p className="tabular mt-1 text-[26px] font-bold leading-none">
            <NumeroAnimado valor={92} sufixo="%" />
          </p>
        </div>
        <div className="anim-fade-up flex items-center gap-2 rounded-2xl border border-[#E30613]/20 bg-[#E30613]/[0.06] p-3 text-[12px] font-medium text-[#E30613]" style={{ ['--d' as string]: '420ms' }}>
          <span className="relative flex h-2 w-2">
            <span className="anim-ping absolute inset-0 rounded-full bg-[#E30613]" />
            <span className="relative h-2 w-2 rounded-full bg-[#E30613]" />
          </span>
          3 alertas críticos
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  useTitulo('Entrar');
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation() as { state?: { de?: string } };
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const tremor = useAnimationControls();
  const entrando = useRef(false);

  if (usuario && !entrando.current) return <Navigate to={loc.state?.de ?? '/'} replace />;

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    entrando.current = true;
    try {
      await login(email, senha);
      setEnviando(false);
      setSucesso(true);
      await new Promise((r) => setTimeout(r, 750));
      navigate(loc.state?.de ?? '/', { replace: true });
    } catch (err) {
      entrando.current = false;
      setErro(mensagemErro(err));
      void tremor.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
      setEnviando(false);
    }
  }
  const atraso = (ms: number) => ({ ['--d' as string]: `${ms}ms` });

  return (
    <TelaPublica>
      <h1 className="anim-fade-up text-[26px] font-bold tracking-tight" style={atraso(120)}>Entrar</h1>
      <p className="anim-fade-up mt-1 text-sm text-muted" style={atraso(180)}>Bem-vindo(a) de volta. Use seu e-mail corporativo e senha.</p>
      <motion.form
        onSubmit={entrar}
        className="mt-6 space-y-4"
        animate={tremor}
      >
        <div className="anim-fade-up" style={atraso(240)}>
        <Field label="E-mail">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="nome@empresa.com.br" autoFocus />
          </div>
        </Field>
        </div>
        <div className="anim-fade-up" style={atraso(300)}>
        <Field label="Senha">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input type={ver ? 'text' : 'password'} autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} className="pl-10 pr-10" />
            <button type="button" onClick={() => setVer((v) => !v)} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-fg" aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}>
              {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        </div>
        <AnimatePresence>
          {erro && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Aviso>{erro}</Aviso>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="anim-fade-up" style={atraso(360)}>
          <Button
            type="submit"
            size="lg"
            className={`w-full transition-colors duration-300 ${sucesso ? '!bg-[#16A34A] hover:!bg-[#16A34A]' : ''}`}
            loading={enviando}
            disabled={sucesso}
          >
            <AnimatePresence mode="wait" initial={false}>
              {sucesso ? (
                <motion.span key="ok" className="flex items-center gap-2" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                  <Check className="h-5 w-5" strokeWidth={3} /> Bem-vindo(a)!
                </motion.span>
              ) : (
                <motion.span key="txt" exit={{ y: -10, opacity: 0 }}>
                  Entrar
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
        <div className="anim-fade-in text-center" style={atraso(420)}>
          <Link to="/esqueci-senha" className="text-[13px] text-muted underline-offset-4 hover:text-fg hover:underline">
            Esqueci minha senha
          </Link>
        </div>
      </motion.form>
      <PainelLoginDemo
        preencher={(e, s) => {
          setEmail(e);
          setSenha(s);
        }}
      />
    </TelaPublica>
  );
}
