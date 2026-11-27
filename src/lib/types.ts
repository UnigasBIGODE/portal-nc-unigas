export type Etapa = 'EXECUÇÃO' | 'VERIFICAÇÃO' | 'FINALIZADO';
export type StatusPrazo = 'No prazo' | 'Atrasado' | 'Fora do prazo' | 'Sem prazo' | 'Sem data de execução';
export type NivelAlerta = 'ATENCAO' | 'CRITICO' | null;
export type Perfil = 'ADMIN' | 'RESPONSAVEL';

export interface NC {
  nc_id: number;
  mes: number | null;
  ano: number | null;
  area: string;
  area_responsavel: string;
  titulo: string;
  descricao?: string;
  descricao_resumo?: string;
  plano_acao?: string;
  criticidade: number | null;
  resp_resolucao: string;
  verificador: string;
  gerencia: string;
  regiao: string;
  data_cadastro: string | null;
  prazo: string | null;
  data_execucao: string | null;
  etapa: Etapa;
  status_prazo: StatusPrazo;
  dias_atraso: number;
  dias_para_prazo: number | null;
  aberta: boolean;
  nivel_alerta: NivelAlerta;
  execucao_critica: boolean;
  mes_encerramento: string | null;
  atualizado_em: string | null;
  atualizado_por: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tr: string;
  perfil: Perfil;
  areas: string[];
  /** Foto de perfil (data URL), quando houver. */
  foto?: string;
}

export interface ConfigPublica {
  rotulosCriticidade: string[];
  metaPct: number;
  alertaAtencaoDias: number;
  alertaCriticoDias: number;
  criticidadeCriticaMin: number;
  alertaPrazoDias: number;
  emailSuporte: string;
  /** Assistente de IA configurado e ativo. */
  iaDisponivel?: boolean;
}

export interface UltimaImportacao {
  data: string | null;
  arquivo: string;
  novas: number;
  atualizadas: number;
}

export interface Sessao {
  token?: string;
  usuario: Usuario;
  ultimaImportacao: UltimaImportacao | null;
  config: ConfigPublica;
}

export interface FiltrosNC {
  busca?: string;
  area?: string;
  gerencia?: string;
  etapa?: string;
  criticidade?: string;
  regiao?: string;
  status?: string;
  verificador?: string;
  aba?: string;
  cadastro_de?: string;
  cadastro_ate?: string;
}

export interface Dashboard {
  kpis: {
    abertas: number;
    execucao: number;
    verificacao: number;
    atrasadas: number;
    pctNoPrazoMes: number | null;
    pctNoPrazoMesAnterior: number | null;
    variacaoPct: number | null;
    encerradasMes: number;
    mediaDiasAtraso: number;
    mesReferencia: string;
    mesReferenciaRotulo: string;
  };
  encerradasPorMes: { mes: string; rotulo: string; total: number; noPrazo: number; foraPrazo: number; pct: number | null }[];
  abertasPorArea: { area: string; execucao: number; verificacao: number; total: number; atrasadas: number }[];
  porCriticidade: { criticidade: number | null; rotulo: string; total: number }[];
  porGerencia: { gerencia: string; total: number }[];
  cadastradasPorMes: { mes: string; rotulo: string; total: number }[];
  atencao: NC[];
  metaPct: number;
  ultimaImportacao: UltimaImportacao | null;
  geradoEm: string;
}

export interface ListaNCs {
  itens: NC[];
  total: number;
  page: number;
  pageSize: number;
  contagens: { todas: number; execucao: number; verificacao: number; finalizadas: number; atrasadas: number };
}

export interface Comentario { id: string; usuario_id: string; autor: string; texto: string; criado_em: string }
export interface Anexo { id: string; autor: string; nome_arquivo: string; criado_em: string }
export interface Historico { id: string; autor: string; campo: string; campo_rotulo: string; valor_antigo: string; valor_novo: string; data: string }

export interface DetalheNC {
  nc: NC;
  comentarios: Comentario[];
  anexos: Anexo[];
  historico: Historico[];
  podeEditarPlano: boolean;
  podeEditarTudo: boolean;
}

export interface ResumoArea {
  area: string;
  responsaveis: string[];
  totalAberto: number;
  execucao: number;
  verificacao: number;
  atrasadas: number;
  execCriticaNoPrazo: number;
  execCriticaAtrasada: number;
  encerradasAno: number;
  noPrazoAno: number;
  pctNoPrazo: number | null;
  mediaDiasAtraso: number;
  totalGeral: number;
}

export interface Relatorio {
  ano: number;
  meta: number;
  anos: number[];
  linhas: { mes: string; rotulo: string; total: number; noPrazo: number; foraPrazo: number; pct: number | null; atingiuMeta: boolean | null }[];
  total: { total: number; noPrazo: number; foraPrazo: number; pct: number | null; atingiuMeta: boolean | null };
}

export interface Alerta {
  tipo: 'NOVA' | 'VENCENDO' | 'ATRASADA' | 'VERIFICACAO';
  nivel: 'critico' | 'atencao' | 'info';
  mensagem: string;
  nc_id: number;
  titulo: string;
  area: string;
  etapa: Etapa;
  dias_atraso: number;
  prazo: string | null;
  criticidade: number | null;
}

export interface Alertas { itens: Alerta[]; total: number; criticos: number; atencao: number }

export interface OpcoesFiltro { areas: string[]; gerencias: string[]; regioes: string[]; verificadores: string[]; anos: number[] }

/** NC lida na prévia da importação, para escolher/alterar o setor antes de gravar. */
export interface SetorImport {
  nc_id: number;
  titulo: string;
  nova: boolean;
  /** já veio finalizada no arquivo */
  finalizada?: boolean;
  /** setor que a NC já tem no portal ('' = a classificar) */
  atual: string;
  /** setor que veio na planilha (se tinha a coluna) */
  arquivo: string;
  /** sugestão automática (aprendida com as NCs já classificadas) */
  sugestao: string;
  confianca: number;
}

export interface ResultadoImportacao {
  novas: number;
  atualizadas: number;
  semAlteracao: number;
  totalErros: number;
  totalAvisos: number;
  erros: { linha: number; nc_id: number | string; msg: string; arquivo?: string }[];
  avisos: { linha: number; nc_id: number | string; msg: string; arquivo?: string }[];
  retomadas?: RetomadaImport[];
  totalRetomadas?: number;
  prorrogacoes?: ProrrogacaoImport[];
  totalProrrogacoes?: number;
  novasIds?: number[];
  ids?: number[];
  setores?: SetorImport[];
  foraEscopo?: number;
  foraEscopoIds?: { nc_id: number; resp: string; linha: number }[];
  emails?: number;
  finalizadas?: number;
  finalizadasSemData?: number;
}

/** NC com pedido de prorrogação que o Obrasoft devolveu para execução (resposta do verificador). */
export interface ProrrogacaoImport {
  nc_id: number;
  titulo: string;
  area: string;
  pedido: string;
  prazo: string;
  aprovada: boolean;
}

/** NC que volta de etapa na importação (ex.: FINALIZADO → EXECUÇÃO). */
export interface RetomadaImport {
  nc_id: number;
  titulo: string;
  area: string;
  de: string;
  para: string;
  motivo?: string;
}

export interface UsuarioAdmin extends Usuario {
  ativo: boolean;
  temSenha: boolean;
  criado_em: string | null;
  ultimo_acesso: string | null;
}

export interface AreaAdmin { area: string; descricao: string; ativa: boolean; responsaveis: string[]; total: number; abertas: number }
