import { X } from 'lucide-react';
import { Button, Select } from './ui';
import { useOpcoesFiltro } from '@/hooks/queries';
import { useAuth } from '@/context/AuthContext';
import type { FiltrosNC } from '@/lib/types';
import { NOMES_MESES } from '@/lib/utils';

type Campo = 'area' | 'gerencia' | 'etapa' | 'criticidade' | 'regiao' | 'status' | 'verificador';

export interface Periodo {
  ano?: number;
  mes?: number;
}

export function FiltrosBar({
  valor,
  onChange,
  campos = ['area', 'gerencia', 'etapa', 'criticidade', 'regiao'],
  periodo,
  onPeriodo,
}: {
  valor: FiltrosNC;
  onChange: (f: FiltrosNC) => void;
  campos?: Campo[];
  periodo?: Periodo;
  onPeriodo?: (p: Periodo) => void;
}) {
  const { data: op } = useOpcoesFiltro();
  const { config, usuario } = useAuth();
  const set = (k: keyof FiltrosNC, v: string) => onChange({ ...valor, [k]: v || undefined });
  const ativos = campos.filter((c) => valor[c]).length + (periodo?.mes || periodo?.ano ? 1 : 0);
  const anoAtual = new Date().getFullYear();
  const cls = 'h-9 w-auto min-w-[140px] flex-1 sm:flex-none rounded-full text-[13px]';

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros">
      {onPeriodo && (
        <>
          <Select className={cls} value={periodo?.mes ?? ''} onChange={(e) => onPeriodo({ ...periodo, mes: e.target.value ? Number(e.target.value) : undefined })} aria-label="Mês de referência">
            <option value="">Mês atual</option>
            {NOMES_MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Select className={cls} value={periodo?.ano ?? ''} onChange={(e) => onPeriodo({ ...periodo, ano: e.target.value ? Number(e.target.value) : undefined })} aria-label="Ano de referência">
            <option value="">{anoAtual}</option>
            {(op?.anos ?? []).filter((a) => a !== anoAtual).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </>
      )}
      {campos.includes('area') && (usuario?.perfil === 'ADMIN' || (op?.areas.length ?? 0) > 1) && (
        <Select className={cls} value={valor.area ?? ''} onChange={(e) => set('area', e.target.value)} aria-label="Área">
          <option value="">Todas as áreas</option>
          {op?.areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
      )}
      {campos.includes('gerencia') && (
        <Select className={cls} value={valor.gerencia ?? ''} onChange={(e) => set('gerencia', e.target.value)} aria-label="Gerência">
          <option value="">Todas as gerências</option>
          {op?.gerencias.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
      )}
      {campos.includes('etapa') && (
        <Select className={cls} value={valor.etapa ?? ''} onChange={(e) => set('etapa', e.target.value)} aria-label="Etapa">
          <option value="">Todas as etapas</option>
          <option value="EXECUÇÃO">Em execução c/ Unigás</option>
          <option value="VERIFICAÇÃO">Em verificação c/ Comgás</option>
          <option value="FINALIZADO">Finalizado</option>
        </Select>
      )}
      {campos.includes('criticidade') && (
        <Select className={cls} value={valor.criticidade ?? ''} onChange={(e) => set('criticidade', e.target.value)} aria-label="Criticidade">
          <option value="">Toda criticidade</option>
          {[0, 1, 2, 3, 4, 5, 6].map((c) => (
            <option key={c} value={c}>
              {c} – {config?.rotulosCriticidade[c]}
            </option>
          ))}
        </Select>
      )}
      {campos.includes('regiao') && (
        <Select className={cls} value={valor.regiao ?? ''} onChange={(e) => set('regiao', e.target.value)} aria-label="Região">
          <option value="">Todas as regiões</option>
          {op?.regioes.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
      )}
      {campos.includes('status') && (
        <Select className={cls} value={valor.status ?? ''} onChange={(e) => set('status', e.target.value)} aria-label="Status de prazo">
          <option value="">Todo status</option>
          <option>No prazo</option>
          <option>Atrasado</option>
          <option>Fora do prazo</option>
          <option>Sem prazo</option>
        </Select>
      )}
      {campos.includes('verificador') && (
        <Select className={cls} value={valor.verificador ?? ''} onChange={(e) => set('verificador', e.target.value)} aria-label="Verificador">
          <option value="">Todos os verificadores</option>
          {op?.verificadores.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
      )}
      {ativos > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const limpo: FiltrosNC = { ...valor };
            campos.forEach((c) => delete limpo[c]);
            onChange(limpo);
            onPeriodo?.({});
          }}
        >
          <X className="h-3.5 w-3.5" /> Limpar ({ativos})
        </Button>
      )}
    </div>
  );
}
