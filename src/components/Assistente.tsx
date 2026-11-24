/**
 * Assistente de IA (Gemini) do portal: botão flutuante + painel de conversa em vidro.
 * A chave da IA fica no Apps Script; o site só manda a pergunta.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn, primeiroNome } from '@/lib/utils';

type Papel = 'usuario' | 'ia';
interface Mensagem {
  id: number;
  papel: Papel;
  texto: string;
  erro?: boolean;
}
type ModoNC = 'resumo' | 'plano';

const Ctx = createContext<{ disponivel: boolean; abrir: () => void; pedirNC: (modo: ModoNC, ncId: number) => void }>({
  disponivel: false,
  abrir: () => {},
  pedirNC: () => {},
});

export const useAssistente = () => useContext(Ctx);

const CHAVE_SESSAO = 'unigas_ia_conversa';
const SUGESTOES = ['Quais NCs estão mais atrasadas?', 'Faça um resumo das NCs por área', 'Quais prazos vencem nos próximos 7 dias?', 'Como está o % de encerradas no prazo?'];

function lerConversa(): Mensagem[] {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || '[]');
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- texto com formatação leve (sem HTML)

function Inline({ texto }: { texto: string }) {
  // **negrito**, _itálico_ e "NC 12345" vira link
  const partes = texto.split(/(\*\*[^*]+\*\*|_[^_]+_|\bNC\s?\d{4,7}\b)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (/^_[^_]+_$/.test(p)) return <em key={i} className="text-[var(--vg-muted)]">{p.slice(1, -1)}</em>;
        const nc = p.match(/^NC\s?(\d{4,7})$/);
        if (nc)
          return (
            <Link key={i} to={`/ncs/${nc[1]}`} className="font-semibold text-brand underline-offset-2 hover:underline">
              {p}
            </Link>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Formatado({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const blocos: ReactNode[] = [];
  let lista: { tipo: 'ul' | 'ol'; itens: string[] } | null = null;
  const fecharLista = () => {
    if (!lista) return;
    const L = lista;
    blocos.push(
      L.tipo === 'ul' ? (
        <ul key={blocos.length} className="my-1.5 list-disc space-y-1 pl-5">
          {L.itens.map((t, i) => <li key={i}><Inline texto={t} /></li>)}
        </ul>
      ) : (
        <ol key={blocos.length} className="my-1.5 list-decimal space-y-1 pl-5">
          {L.itens.map((t, i) => <li key={i}><Inline texto={t} /></li>)}
        </ol>
      ),
    );
    lista = null;
  };
  linhas.forEach((l) => {
    const ul = l.match(/^\s*[-*•]\s+(.*)/);
    const ol = l.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const tipo = ul ? 'ul' : 'ol';
      if (!lista || lista.tipo !== tipo) {
        fecharLista();
        lista = { tipo, itens: [] };
      }
      lista.itens.push((ul || ol)![1]);
      return;
    }
    fecharLista();
    const t = l.replace(/^#{1,4}\s+/, '');
    if (!t.trim()) return;
    blocos.push(
      <p key={blocos.length} className={cn('my-1', /^#{1,4}\s/.test(l) && 'font-semibold')}>
        <Inline texto={t} />
      </p>,
    );
  });
  fecharLista();
  return <>{blocos}</>;
}

// ---------------------------------------------------------------- provider + painel

export function AssistenteProvider({ children }: { children: ReactNode }) {
  const { usuario, config } = useAuth();
  const disponivel = !!usuario && !!config?.iaDisponivel;
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Mensagem[]>(lerConversa);
  const [pensando, setPensando] = useState(false);
  const seq = useRef(Date.now());

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* ignora */
    }
  }, [msgs]);
  useEffect(() => {
    if (!usuario) setMsgs([]);
  }, [usuario]);

  const enviar = useCallback(
    async (rotulo: string, payload: Record<string, unknown>) => {
      const historico = msgs.filter((m) => !m.erro).slice(-8).map((m) => ({ papel: m.papel, texto: m.texto }));
      setMsgs((m) => [...m, { id: ++seq.current, papel: 'usuario', texto: rotulo }]);
      setPensando(true);
      try {
        const r = await api<{ resposta: string }>('ia.perguntar', payload.modo === 'chat' ? { ...payload, historico } : payload);
        setMsgs((m) => [...m, { id: ++seq.current, papel: 'ia', texto: r.resposta }]);
      } catch (e) {
        setMsgs((m) => [...m, { id: ++seq.current, papel: 'ia', texto: mensagemErro(e), erro: true }]);
      } finally {
        setPensando(false);
      }
    },
    [msgs],
  );

  const pedirNC = useCallback(
    (modo: ModoNC, ncId: number) => {
      setAberto(true);
      enviar(modo === 'resumo' ? `Resuma a NC ${ncId}` : `Sugira um plano de ação para a NC ${ncId}`, { modo, nc_id: ncId });
    },
    [enviar],
  );

  return (
    <Ctx.Provider value={{ disponivel, abrir: () => setAberto(true), pedirNC }}>
      {children}
      {disponivel &&
        createPortal(
          <Painel
            aberto={aberto}
            setAberto={setAberto}
            msgs={msgs}
            pensando={pensando}
            nome={primeiroNome(usuario?.nome ?? '')}
            perguntar={(t) => enviar(t, { modo: 'chat', pergunta: t })}
            limpar={() => setMsgs([])}
          />,
          document.body,
        )}
    </Ctx.Provider>
  );
}

function Painel({
  aberto,
  setAberto,
  msgs,
  pensando,
  nome,
  perguntar,
  limpar,
}: {
  aberto: boolean;
  setAberto: (v: boolean) => void;
  msgs: Mensagem[];
  pensando: boolean;
  nome: string;
  perguntar: (t: string) => void;
  limpar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [copiado, setCopiado] = useState<number | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, pensando, aberto]);
  useEffect(() => {
    if (aberto) setTimeout(() => campo.current?.focus(), 250);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto, setAberto]);

  const mandar = () => {
    const t = texto.trim();
    if (!t || pensando) return;
    setTexto('');
    perguntar(t);
  };

  return (
    <>
      {/* botão flutuante (orbe) */}
      <AnimatePresence>
        {!aberto && (
          <motion.button
            key="orbe"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={() => setAberto(true)}
            className="vg-trilho group fixed bottom-5 right-5 z-[45] flex h-14 items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-[13px] font-bold text-[var(--vg-ink)]"
            aria-label="Abrir o assistente de IA"
          >
            <span className="vg-orbe !h-10 !w-10" aria-hidden />
            <span className="hidden sm:inline">Pergunte à IA</span>
            <Sparkles className="h-4 w-4 text-brand sm:hidden" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aberto && (
          <motion.section
            key="painel"
            role="dialog"
            aria-label="Assistente de IA"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{ transformOrigin: 'bottom right' }}
            className="vg-trilho fixed inset-x-2 bottom-2 top-[76px] z-[65] flex flex-col overflow-hidden rounded-[26px] !bg-[var(--vg-raised)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(640px,calc(100vh-120px))] sm:w-[420px]"
          >
            <header className="flex items-center gap-3 border-b border-[var(--vg-line)] px-4 py-3">
              <span className="vg-orbe !h-9 !w-9" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-tight">Assistente Unigás</p>
                <p className="text-[11.5px] text-[var(--vg-muted)]">IA Gemini · responde com os dados das suas NCs</p>
              </div>
              {msgs.length > 0 && (
                <button onClick={limpar} className="vg-botao h-8 w-8" title="Nova conversa" aria-label="Nova conversa">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setAberto(false)} className="vg-botao h-8 w-8" aria-label="Fechar assistente">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13.5px] leading-relaxed">
              {msgs.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <p className="text-[15px] font-semibold">Olá, {nome}! 👋</p>
                  <p className="text-[var(--vg-muted)]">
                    Pergunte sobre as NCs que você acompanha: atrasos, prazos, áreas, uma NC específica pelo número… Nas páginas das NCs também há os botões <b>Resumir</b> e <b>Plano de ação</b>.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SUGESTOES.map((s, i) => (
                      <motion.button
                        key={s}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + i * 0.05 }}
                        onClick={() => perguntar(s)}
                        className="vg-perguntar rounded-full px-3 py-1.5 text-left text-[12.5px] font-medium text-[var(--vg-ink)]"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
              {msgs.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', m.papel === 'usuario' ? 'justify-end' : 'justify-start')}
                >
                  {m.papel === 'usuario' ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-white shadow-sm shadow-brand/25">{m.texto}</div>
                  ) : (
                    <div className={cn('group relative max-w-[92%] rounded-2xl rounded-bl-md px-3.5 py-2.5', m.erro ? 'bg-danger/10 text-danger' : 'vg-painel !rounded-2xl !rounded-bl-md')}>
                      {m.erro ? m.texto : <Formatado texto={m.texto} />}
                      {!m.erro && (
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(m.texto);
                            setCopiado(m.id);
                            setTimeout(() => setCopiado(null), 1500);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--vg-muted)] opacity-70 transition-opacity hover:opacity-100"
                        >
                          {copiado === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copiado === m.id ? 'Copiado' : 'Copiar'}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {pensando && (
                <div className="flex items-center gap-2 text-[12.5px] text-[var(--vg-muted)]" role="status">
                  <span className="vg-orbe !h-5 !w-5" aria-hidden />
                  Pensando
                  <span className="inline-flex gap-0.5" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="h-1 w-1 rounded-full bg-current" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
                    ))}
                  </span>
                </div>
              )}
              <div ref={fim} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mandar();
              }}
              className="border-t border-[var(--vg-line)] p-3"
            >
              <div className="vg-perguntar flex items-end gap-2 rounded-[20px] p-1.5 pl-3.5 transition-shadow focus-within:shadow-[0_0_0_3px_rgb(227_6_19/0.18)]">
                <textarea
                  ref={campo}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      mandar();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Pergunte sobre as NCs…"
                  className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[13.5px] text-[var(--vg-ink)] outline-none placeholder:text-[var(--vg-muted)]"
                  style={{ outline: 'none', boxShadow: 'none' }}
                  aria-label="Pergunta para a IA"
                />
                <button
                  type="submit"
                  disabled={!texto.trim() || pensando}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white shadow-md shadow-brand/30 transition-all hover:scale-105 disabled:scale-100 disabled:opacity-40"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-center text-[10.5px] text-[var(--vg-muted)]">A IA pode errar. Confira os números na lista de NCs antes de decidir.</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
