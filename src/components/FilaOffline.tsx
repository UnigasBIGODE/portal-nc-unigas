/** Indicador "N envio(s) pendente(s)" na barra superior + envio automático quando a conexão volta. */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, CloudUpload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { EVENTO_FILA, listarFila, processarFila, type ItemFila } from '@/lib/filaOffline';

export function IndicadorFila() {
  const { usuario } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [enviando, setEnviando] = useState(false);
  const id = usuario?.id;

  const atualizar = useCallback(async () => {
    if (!id) return setItens([]);
    setItens(await listarFila(id));
  }, [id]);

  const processar = useCallback(async () => {
    if (!id) return;
    const pend = await listarFila(id);
    if (!pend.length) return;
    setEnviando(true);
    const r = await processarFila(id);
    setEnviando(false);
    if (r.enviados.length) {
      const n = r.enviados.length;
      toast({ tipo: 'sucesso', titulo: n === 1 ? 'Envio pendente concluído' : `${n} envios pendentes concluídos`, descricao: r.enviados.map((i) => i.descricao).join(' · ') });
      qc.invalidateQueries();
    }
    for (const f of r.falhas) toast({ tipo: 'erro', titulo: `Não foi possível concluir: ${f.item.descricao}`, descricao: f.erro });
    atualizar();
  }, [id, toast, qc, atualizar]);

  useEffect(() => {
    atualizar();
    processar();
    const naFila = () => atualizar();
    const voltou = () => {
      setOnline(true);
      processar();
    };
    const caiu = () => setOnline(false);
    window.addEventListener(EVENTO_FILA, naFila);
    window.addEventListener('online', voltou);
    window.addEventListener('offline', caiu);
    // garantia: alguns celulares não disparam "online" ao trocar de rede
    const t = setInterval(processar, 60_000);
    return () => {
      window.removeEventListener(EVENTO_FILA, naFila);
      window.removeEventListener('online', voltou);
      window.removeEventListener('offline', caiu);
      clearInterval(t);
    };
  }, [atualizar, processar]);

  const n = itens.length;
  return (
    <AnimatePresence>
      {(n > 0 || !online) && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={processar}
          disabled={enviando || n === 0}
          title={n ? itens.map((i) => i.descricao).join('\n') + '\n\nSerá enviado automaticamente quando a conexão voltar.' : 'Sem conexão no momento'}
          className="vg-segmento inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-amber-700 dark:text-amber-300"
          role="status"
        >
          {online && n > 0 ? <CloudUpload className={enviando ? 'h-3.5 w-3.5 animate-pulse' : 'h-3.5 w-3.5'} aria-hidden /> : <CloudOff className="h-3.5 w-3.5" aria-hidden />}
          {n > 0 ? `${n} envio${n > 1 ? 's' : ''} pendente${n > 1 ? 's' : ''}` : 'Sem conexão'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
