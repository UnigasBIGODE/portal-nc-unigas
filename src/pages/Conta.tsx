import { useRef, useState, type FormEvent } from 'react';
import { Camera, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, prepararFotoPerfil } from '@/components/Avatar';
import { api, mensagemErro } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/components/Toast';
import { useTitulo } from '@/hooks/queries';
import { Aviso, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Pills } from '@/components/ui';

export default function Conta() {
  useTitulo('Minha conta');
  const { usuario, isAdmin, config, atualizarSessao } = useAuth();
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [previa, setPrevia] = useState<string | null>(null);
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

  async function trocarFoto(file: File | undefined) {
    if (!file) return;
    setEnviandoFoto(true);
    try {
      const foto = await prepararFotoPerfil(file);
      setPrevia(foto);
      await api('contaFoto', { foto });
      await atualizarSessao();
      toast({ tipo: 'sucesso', titulo: 'Foto de perfil atualizada' });
    } catch (err) {
      toast({ tipo: 'erro', titulo: 'Não foi possível salvar a foto', descricao: err instanceof Error && !('code' in err) ? err.message : mensagemErro(err) });
    } finally {
      setPrevia(null);
      setEnviandoFoto(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  }

  async function removerFoto() {
    setEnviandoFoto(true);
    try {
      await api('contaFoto', { foto: '' });
      await atualizarSessao();
      toast({ tipo: 'sucesso', titulo: 'Foto removida' });
    } catch (err) {
      toast({ tipo: 'erro', titulo: 'Não foi possível remover a foto', descricao: mensagemErro(err) });
    } finally {
      setEnviandoFoto(false);
    }
  }

  if (!usuario) return null;
  const fotoAtual = previa ?? usuario.foto;
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Sua conta" title="Configurações da conta" />
      <div className="stagger space-y-4">
        <Card className="flex flex-wrap items-center gap-5 p-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => arquivo.current?.click()}
              disabled={enviandoFoto}
              className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              aria-label="Alterar foto de perfil"
            >
              <Avatar nome={usuario.nome} foto={fotoAtual} className="h-20 w-20 text-[22px]" />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="h-6 w-6" />
              </span>
              {enviandoFoto && (
                <motion.span className="absolute -inset-1 rounded-full border-2 border-brand border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} aria-hidden />
              )}
            </button>
            <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={(e) => trocarFoto(e.target.files?.[0])} />
          </div>
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
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => arquivo.current?.click()} loading={enviandoFoto}>
                <Camera className="h-3.5 w-3.5" /> {usuario.foto ? 'Trocar foto' : 'Adicionar foto'}
              </Button>
              {usuario.foto && (
                <Button size="sm" variant="ghost" onClick={removerFoto} disabled={enviandoFoto}>
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Aparência" description="Escolha como o portal aparece para você. Também dá para trocar pela chave no topo." />
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
