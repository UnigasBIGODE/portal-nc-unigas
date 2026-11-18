import { useState, type FormEvent } from 'react';
import { Moon, ShieldCheck, Sun } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/components/Toast';
import { useTitulo } from '@/hooks/queries';
import { Aviso, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Pills } from '@/components/ui';
import { iniciais } from '@/lib/utils';

export default function Conta() {
  useTitulo('Minha conta');
  const { usuario, isAdmin, config } = useAuth();
  const { tema, setTema } = useTheme();
  const toast = useToast();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [msg, setMsg] = useState<{ tom: 'success' | 'danger'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nova !== conf) return setMsg({ tom: 'danger', texto: 'As senhas não conferem.' });
    setSalvando(true);
    try {
      await api('alterarSenha', { senhaAtual: atual, novaSenha: nova });
      toast({ tipo: 'sucesso', titulo: 'Senha alterada com sucesso' });
      setMsg(null);
      setAtual('');
      setNova('');
      setConf('');
    } catch (err) {
      setMsg({ tom: 'danger', texto: mensagemErro(err) });
    } finally {
      setSalvando(false);
    }
  }

  if (!usuario) return null;
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Sua conta" title="Configurações da conta" />
      <div className="stagger space-y-4">
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-brand text-lg font-semibold text-white">{iniciais(usuario.nome)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{usuario.nome}</p>
            <p className="text-sm text-muted">
              {usuario.email}
              {usuario.tr && ` · ${usuario.tr}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isAdmin ? (
                <Badge tom="brand">
                  <ShieldCheck className="h-3 w-3" /> Administrador – todas as áreas
                </Badge>
              ) : (
                usuario.areas.map((a) => <Badge key={a}>{a}</Badge>)
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Aparência" description="O tema escuro é o padrão." />
          <div className="p-5 pt-4">
            <Pills
              value={tema}
              onChange={setTema}
              label="Tema"
              itens={[
                { value: 'dark', label: <><Moon className="h-3.5 w-3.5" /> Escuro</> },
                { value: 'light', label: <><Sun className="h-3.5 w-3.5" /> Claro</> },
              ]}
              className="w-fit"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Alterar senha" description="Mínimo de 8 caracteres, com letras e números." />
          <form onSubmit={salvar} className="grid gap-4 p-5 pt-4 sm:grid-cols-3">
            <Field label="Senha atual">
              <Input type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required />
            </Field>
            <Field label="Nova senha">
              <Input type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} required />
            </Field>
            <Field label="Confirmar nova senha">
              <Input type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} required />
            </Field>
            {msg && <Aviso tom={msg.tom} className="sm:col-span-3">{msg.texto}</Aviso>}
            <div className="sm:col-span-3">
              <Button type="submit" loading={salvando}>
                Salvar nova senha
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5 text-sm text-muted">
          Precisa de ajuda? {config?.emailSuporte ? <a className="text-brand hover:underline" href={`mailto:${config.emailSuporte}`}>{config.emailSuporte}</a> : 'Fale com o time Unigás – SSM.'}
        </Card>
      </div>
    </div>
  );
}
