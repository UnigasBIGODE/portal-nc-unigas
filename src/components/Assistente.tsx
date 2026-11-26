/**
 * Assistente de IA (Gemini) do portal: botão flutuante + painel de conversa em vidro.
 * A chave da IA fica no Apps Script; o site só manda a pergunta.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Check, ChevronRight, Copy, Info, Lightbulb, RotateCcw, Search, Send, Target, X } from 'lucide-react';
import { api, mensagemErro } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn, primeiroNome } from '@/lib/utils';

type Papel = 'usuario' | 'ia';
interface Mensagem {
  id: number;
  papel: Papel;
  texto: string;
  erro?: boolean;
  modo?: 'chat' | 'resumo' | 'plano';
}
type ModoNC = 'resumo' | 'plano';

const Ctx = createContext<{ disponivel: boolean; abrir: () => void; pedirNC: (modo: ModoNC, ncId: number) => void; perguntar: (t: string) => void }>({
  disponivel: false,
  abrir: () => {},
  pedirNC: () => {},
  perguntar: () => {},
});

export const useAssistente = () => useContext(Ctx);

const CHAVE_SESSAO = 'unigas_ia_conversa';

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

const POSE = {
  icone: './luma/icone.webp',
  otimo: './luma/otimo.webp',
  analisar: './luma/analisar.webp',
  sugestao: './luma/sugestao.webp',
  conte: './luma/conte.webp',
  corpo: './luma/corpo.webp',
} as const;
export const LUMA_POSE = POSE;

/** Rosto da LUMA (ícone piscando) em círculo. */
export function LumaAvatar({ className }: { className?: string }) {
  return (
    <span className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#3a0a0d] to-[#140405] ring-1 ring-brand/30', className)}>
      <img src={POSE.icone} alt="" className="h-full w-full scale-[1.12] object-cover" draggable={false} />
    </span>
  );
}

export function AssistenteProvider({ children }: { children: ReactNode }) {
  const { usuario, config } = useAuth();
  const disponivel = !!usuario && !!config?.iaDisponivel;
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Mensagem[]>(lerConversa);
  const [pensando, setPensando] = useState(false);
  const [rascunho, setRascunho] = useState('');
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
        setMsgs((m) => [...m, { id: ++seq.current, papel: 'ia', texto: r.resposta, modo: payload.modo as Mensagem['modo'] }]);
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

  const perguntar = useCallback(
    (t: string) => {
      setAberto(true);
      enviar(t, { modo: 'chat', pergunta: t });
    },
    [enviar],
  );

  return (
    <Ctx.Provider value={{ disponivel, abrir: () => setAberto(true), pedirNC, perguntar }}>
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
            rascunho={rascunho}
            setRascunho={setRascunho}
          />,
          document.body,
        )}
    </Ctx.Provider>
  );
}

const ATALHOS: { rotulo: string; icone: typeof Search; pergunta?: string; rascunho?: string }[] = [
  { rotulo: 'Analisar uma NC', icone: Search, rascunho: 'Analise a NC ' },
  { rotulo: 'Identificar causa raiz', icone: Lightbulb, pergunta: 'Quais causas raiz mais se repetem nas minhas NCs? Considere reincidências no mesmo local e NCs semelhantes.' },
  { rotulo: 'Propor ações corretivas', icone: Target, pergunta: 'Proponha ações corretivas para as NCs mais críticas e mais atrasadas.' },
  { rotulo: 'Resumo dos meus indicadores', icone: BarChart3, pergunta: 'Faça um resumo dos meus indicadores e diga o que merece atenção agora.' },
];

function Painel({
  aberto,
  setAberto,
  msgs,
  pensando,
  nome,
  perguntar,
  limpar,
  rascunho,
  setRascunho,
}: {
  aberto: boolean;
  setAberto: (v: boolean) => void;
  msgs: Mensagem[];
  pensando: boolean;
  nome: string;
  perguntar: (t: string) => void;
  limpar: () => void;
  rascunho: string;
  setRascunho: (t: string) => void;
}) {
  const texto = rascunho;
  const setTexto = setRascunho;
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
      {/* botão flutuante */}
      <AnimatePresence>
        {!aberto && (
          <motion.button
            key="botao-luma"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={() => setAberto(true)}
            className="luma-botao group fixed bottom-5 right-5 z-[45] flex h-[60px] items-center gap-3 rounded-full py-1.5 pl-1.5 pr-6 text-white"
            aria-label="Abrir a LUMA, Inteligência Artificial Unigás"
          >
            <LumaAvatar className="h-12 w-12" />
            <span className="text-[19px] font-extrabold tracking-wide">LUMA</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aberto && (
          <motion.section
            key="painel"
            role="dialog"
            aria-label="LUMA — Inteligência Artificial Unigás"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{ transformOrigin: 'bottom right' }}
            className="vg-trilho fixed inset-x-2 bottom-2 top-[76px] z-[65] flex flex-col overflow-hidden rounded-[26px] !bg-[var(--vg-raised)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(680px,calc(100vh-110px))] sm:w-[420px]"
          >
            <header className="flex items-center gap-3 border-b border-[var(--vg-line)] px-4 py-3">
              <LumaAvatar className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="text-[19px] font-extrabold leading-tight tracking-wide">LUMA</p>
                <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--vg-muted)]">
                  Inteligência Artificial Unigás
                  <span className="inline-flex items-center gap-1 font-semibold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
                  </span>
                </p>
              </div>
              {msgs.length > 0 && (
                <button onClick={limpar} className="vg-botao h-8 w-8" title="Nova conversa" aria-label="Nova conversa">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setAberto(false)} className="vg-botao h-8 w-8" aria-label="Fechar a LUMA">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto text-[13.5px] leading-relaxed">
              {msgs.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="luma-faixa relative overflow-hidden px-5 pb-4 pt-5 text-white">
                    <p className="relative z-[1] max-w-[62%] text-[21px] font-extrabold leading-[1.15] tracking-tight">
                      Sua parceira <span className="text-[#FF4D55]">inteligente</span> na qualidade.
                    </p>
                    <img src={POSE.otimo} alt="" className="luma-flutua absolute -bottom-1 right-3 h-[118px]" draggable={false} />
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    <div className="flex items-start gap-2.5">
                      <LumaAvatar className="mt-0.5 h-8 w-8" />
                      <div className="vg-painel !rounded-2xl !rounded-tl-md px-3.5 py-2.5">
                        <p className="font-semibold">Olá, {nome}! Eu sou a LUMA.</p>
                        <p className="mt-1">
                          Sua especialista em Não Conformidades. Estou aqui para ajudar você a analisar NCs, investigar causas e encontrar as melhores soluções.
                        </p>
                        <p className="mt-1.5 font-medium">Como podemos melhorar hoje?</p>
                      </div>
                    </div>
                    <p className="pt-1 text-[12px] font-semibold text-[var(--vg-muted)]">Sugestões rápidas</p>
                    <div className="space-y-2">
                      {ATALHOS.map((a, i) => (
                        <motion.button
                          key={a.rotulo}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 + i * 0.05 }}
                          onClick={() => {
                            if (a.pergunta) perguntar(a.pergunta);
                            else {
                              setTexto(a.rascunho || '');
                              setTimeout(() => campo.current?.focus(), 30);
                            }
                          }}
                          className="vg-perguntar group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-[13px] font-semibold text-[var(--vg-ink)]"
                        >
                          <a.icone className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                          <span className="flex-1">{a.rotulo}</span>
                          <ChevronRight className="h-4 w-4 text-[var(--vg-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {msgs.length > 0 && (
                <div className="space-y-3 px-4 py-4">
                  {msgs.map((m) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2.5', m.papel === 'usuario' ? 'justify-end' : 'justify-start')}>
                      {m.papel === 'usuario' ? (
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-white shadow-sm shadow-brand/25">{m.texto}</div>
                      ) : m.erro ? (
                        <div className="flex max-w-[95%] items-end gap-2">
                          <img src={POSE.conte} alt="" className="h-14 shrink-0" draggable={false} />
                          <div className="rounded-2xl rounded-bl-md border border-danger/20 bg-danger/[0.07] px-3.5 py-2.5">
                            <p className="font-semibold">Não consegui responder agora.</p>
                            <p className="mt-0.5 text-[12.5px] text-[var(--vg-muted)]">{m.texto}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <LumaAvatar className="mt-0.5 h-8 w-8" />
                          <div className="group relative max-w-[88%] rounded-2xl rounded-tl-md vg-painel !rounded-2xl !rounded-tl-md px-3.5 py-2.5">
                            {m.modo === 'plano' && (
                              <div className="-mx-1 mb-2 flex items-center gap-2 rounded-xl bg-[#FFF4D6] px-2 py-1.5 text-[12px] font-bold text-[#8a5a00] dark:bg-[#3a2c0a] dark:text-[#ffd77a]">
                                <img src={POSE.sugestao} alt="" className="h-8" draggable={false} /> Tenho uma sugestão!
                              </div>
                            )}
                            <Formatado texto={m.texto} />
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
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                  {pensando && (
                    <div className="flex items-end gap-2" role="status">
                      <img src={POSE.analisar} alt="" className="luma-pensa h-16" draggable={false} />
                      <div className="mb-1 rounded-2xl rounded-bl-md bg-[var(--vg-inner)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--vg-muted)]">
                        Vamos analisar
                        <span className="ml-1 inline-flex gap-0.5" aria-hidden>
                          {[0, 1, 2].map((i) => (
                            <motion.span key={i} className="inline-block h-1 w-1 rounded-full bg-current" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
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
                  placeholder="Converse com a LUMA sobre suas NCs…"
                  className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[13.5px] text-[var(--vg-ink)] outline-none placeholder:text-[var(--vg-muted)]"
                  style={{ outline: 'none', boxShadow: 'none' }}
                  aria-label="Mensagem para a LUMA"
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
              <p className="mt-1.5 flex items-center justify-center gap-1 px-1 text-center text-[10.5px] text-[var(--vg-muted)]">
                <Info className="h-3 w-3" aria-hidden /> A LUMA pode errar. Confira os números na lista de NCs antes de decidir.
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
