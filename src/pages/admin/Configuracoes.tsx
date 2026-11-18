import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensagemErro } from '@/lib/api';
import type { ConfigPublica } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useTitulo } from '@/hooks/queries';
import { Aviso, Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, Skeleton } from '@/components/ui';

export default function Configuracoes() {
  useTitulo('Configurações');
  const qc = useQueryClient();
  const toast = useToast();
  const { setConfig } = useAuth();
  const q = useQuery({ queryKey: ['config'], queryFn: () => api<{ valores: Record<string, string> }>('config.obter') });
  const [v, setV] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tom: 'success' | 'danger'; t: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (q.data) setV(q.data.valores);
  }, [q.data]);

  const campo = (k: string) => ({ value: v[k] ?? '', onChange: (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value }) });

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    try {
      const r = await api<{ publica: ConfigPublica }>('config.salvar', { valores: v });
      setConfig(r.publica);
      qc.invalidateQueries();
      toast({ tipo: 'sucesso', titulo: 'Configurações salvas', descricao: 'Os indicadores foram recalculados.' });
      setMsg(null);
    } catch (e) {
      setMsg({ tom: 'danger', t: mensagemErro(e) });
    } finally {
      setSalvando(false);
    }
  }

  if (q.isError) return <Card><ErrorState mensagem={mensagemErro(q.error)} onRetry={() => q.refetch()} /></Card>;
  if (!q.data) return <Skeleton className="h-96" />;

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Administração" title="Configurações" subtitle="Limites de alerta, meta e rótulos usados em todo o sistema." actions={<Button loading={salvando} onClick={salvar}>Salvar alterações</Button>} />
      {msg && <Aviso tom={msg.tom} className="mb-4">{msg.t}</Aviso>}
      <div className="stagger space-y-4">
        <Card>
          <CardHeader title="Alertas e metas" />
          <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Atenção (dias de atraso)" hint="Padrão: 15">
              <Input type="number" min={0} {...campo('alerta_atencao_dias')} />
            </Field>
            <Field label="Crítico (dias de atraso)" hint="Padrão: 30">
              <Input type="number" min={0} {...campo('alerta_critico_dias')} />
            </Field>
            <Field label="Prazo vencendo (dias antes)" hint="Alerta de prazo próximo">
              <Input type="number" min={0} {...campo('alerta_prazo_dias')} />
            </Field>
            <Field label="Criticidade “crítica” a partir de" hint="Execução crítica (0–6). Padrão: 3">
              <Input type="number" min={0} max={6} {...campo('criticidade_critica_min')} />
            </Field>
            <Field label="Meta de % encerradas no prazo" hint="Usada no relatório mensal">
              <Input type="number" min={0} max={100} {...campo('meta_pct_no_prazo')} />
            </Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Rótulos de criticidade" description="Nome exibido para cada nível da escala 0–6" />
          <div className="grid gap-3 p-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Field key={i} label={`Nível ${i}`}>
                <Input {...campo(`rotulo_criticidade_${i}`)} />
              </Field>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Sistema" />
          <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2">
            <Field label="Endereço do site (app_url)" hint="Usado nos links de convite e redefinição de senha. Ex.: https://nc-unigas.vercel.app">
              <Input type="url" placeholder="https://…" {...campo('app_url')} />
            </Field>
            <Field label="E-mail de suporte" hint="Aparece no menu “Suporte”">
              <Input type="email" {...campo('email_suporte')} />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
