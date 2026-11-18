import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { Aviso, Button, Field, Input } from '@/components/ui';
import { api, mensagemErro } from '@/lib/api';
import { useTitulo } from '@/hooks/queries';
import { TelaPublica } from './Login';
import { EmailsDemo } from '@/demo/PainelDemo';

export function EsqueciSenha() {
  useTitulo('Esqueci minha senha');
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await api('esqueciSenha', { email });
      setOk(true);
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaPublica>
      {ok ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-4 text-lg font-semibold">Verifique seu e-mail</h1>
          <p className="mt-2 text-sm text-muted">Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha. O link vale por 24 horas.</p>
          <EmailsDemo />
          <Link to="/login" className="mt-6 inline-block text-sm text-brand hover:underline">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
            <p className="mt-1 text-sm text-muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
          </div>
          <Field label="E-mail">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          {erro && <Aviso>{erro}</Aviso>}
          <Button type="submit" size="lg" className="w-full" loading={enviando}>
            Enviar link
          </Button>
          <div className="text-center">
            <Link to="/login" className="text-[13px] text-muted hover:text-fg">
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </TelaPublica>
  );
}

export function DefinirSenha() {
  useTitulo('Criar senha');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [conf, setConf] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha !== conf) return setErro('As senhas não conferem.');
    if (senha.length < 8 || !/\d/.test(senha) || !/[A-Za-z]/.test(senha)) return setErro('Use pelo menos 8 caracteres, com letras e números.');
    setEnviando(true);
    try {
      const r = await api<{ email: string }>('definirSenha', { token, senha });
      setEmail(r.email);
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  }

  if (!token)
    return (
      <TelaPublica>
        <Aviso>Link inválido. Peça um novo em “Esqueci minha senha”.</Aviso>
        <Link to="/esqueci-senha" className="mt-4 block text-center text-sm text-brand">
          Pedir novo link
        </Link>
      </TelaPublica>
    );

  return (
    <TelaPublica>
      {email ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-4 text-lg font-semibold">Senha criada!</h1>
          <p className="mt-2 text-sm text-muted">Agora você já pode entrar com {email}.</p>
          <Button className="mt-6 w-full" size="lg" onClick={() => navigate('/login')}>
            Ir para o login
          </Button>
        </div>
      ) : (
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Crie sua senha</h1>
            <p className="mt-1 text-sm text-muted">Mínimo de 8 caracteres, com letras e números.</p>
          </div>
          <Field label="Nova senha">
            <Input type="password" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
          </Field>
          <Field label="Confirme a senha">
            <Input type="password" autoComplete="new-password" required value={conf} onChange={(e) => setConf(e.target.value)} />
          </Field>
          {erro && <Aviso>{erro}</Aviso>}
          <Button type="submit" size="lg" className="w-full" loading={enviando}>
            Salvar senha
          </Button>
        </form>
      )}
    </TelaPublica>
  );
}
