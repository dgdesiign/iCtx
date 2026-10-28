export type LeadStatus =
  | 'novo'
  | 'contato_1'
  | 'contato_2'
  | 'contato_3'
  | 'negociacao'
  | 'fechado'
  | 'descartado';

export interface Socio {
  nome: string;
  qualificacao: string;
}

export interface ContatoLog {
  id: string;
  dataHora: string;
  tipo: 'whatsapp' | 'ligacao' | 'mudanca_status' | 'nota';
  templateTitulo?: string;
  mensagemEnviada?: string;
  observacao?: string;
}

export interface Lead {
  id: string;
  cnpj: string; // 14 dígitos limpos
  cnpjFormatado: string;
  nomeContato: string;
  telefonePrincipal: string; // só números
  telefonePrincipalFormatado: string;
  telefoneSecundario?: string;
  telefoneSecundarioFormatado?: string;
  razaoSocial: string;
  nomeFantasia: string;
  empresaExibicao: string; // Prioriza Nome Fantasia; se vazio, Razão Social
  dataAbertura?: string;
  idadeEmpresa?: string;
  idadeAnos?: number;
  cnaeCodigo?: string;
  cnaeDescricao?: string;
  naturezaJuridica?: string;
  isMei?: boolean;
  isMeiDesenquadrado?: boolean;
  nomeTitular?: string;
  empresaParaMensagem?: string; // "sua empresa" se for MEI/Desenquadrado sem nome fantasia, ou o nome fantasia real
  capitalSocial?: number;
  email?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  socios: Socio[];
  status: LeadStatus;
  produtoSugerido: string;
  templateId?: string;
  criadoEm: string;
  atualizadoEm: string;
  ultimoContatoEm?: string;
  dataUltimoContato?: string; // ISO date
  proximoFollowUp?: string; // ISO date
  tentativasContato?: number;
  historicoContatos: ContatoLog[];
  notas?: string;
  motivoDescarte?: string;
  coachNota?: number;
  coachFeedback?: string;
  coachData?: string; // ISO date
  historicoCoach?: Array<{ data: string; nota: number; feedback: string }>;
  templateUsadoInicialmente?: string;
  vendeuConta?: boolean;            // ausente = vendido
  vendeuMaquina?: boolean;          // ausente = vendido
  pixCount?: number;                // 0..3
  maquinaVendas?: number;           // R$ acumulado
  dataFechamento?: string;          // ISO timestamp
  ativacaoProximoLembrete?: string; // 'YYYY-MM-DD' local
  ativacaoTentativas?: number;
  ativacaoBloqueio?: 'conta_negada' | 'maquina_descredenciada' | 'cancelado_cliente';
  cnpjInicio?: string;
  contaAtivaEm?: string;
  maquinaAtivaEm?: string;
  fitContratadoEm?: string;
  contaEncerradaEm?: string;
  maquinaEncerradaEm?: string;
  credenciamento?: CredenciamentoData;
}

export type UserRole = 'supervisor' | 'executivo';

export interface EquipeMembro {
  nome: string;
  email: string;
  role?: UserRole;
  payload: {
    leads: Lead[];
  };
}

export type TemplateEtapa =
  | 'contato_1'
  | 'contato_2'
  | 'contato_3'
  | 'objecao'
  | 'fechamento'
  | 'geral';

export interface MessageTemplate {
  id: string;
  titulo: string;
  etapa: TemplateEtapa;
  texto: string;
  canal: 'whatsapp' | 'ligacao';
  descricao?: string;
  destaque?: string; // ex: "0,5% a.m.", "Grátis", "Reversão"
}

export interface ColumnConfig {
  id: LeadStatus;
  titulo: string;
  subtitulo: string;
  corBadge: string;
  corBorda: string;
  corHeader: string;
  corBg: string;
  proximaEtapa?: LeadStatus;
}

export type CredenciamentoStep = 1 | 2 | 3 | 4 | 5;

export type DocumentoTipo =
  | 'RG'
  | 'CNH'
  | 'Contrato Social'
  | 'Cartão CNPJ'
  | 'Desenquadramento CNPJ'
  | 'Contrato de Empresário Individual';

export interface CredenciamentoData {
  iniciadoEm?: string;           // ISO
  concluidoEm?: string;          // ISO
  stepAtual?: CredenciamentoStep;
  parceiroIndicado?: boolean;
  documentos?: DocumentoTipo[];
  santanderConcluido?: boolean;
  akConcluido?: boolean;
  produto?: 'CONTA_INTEGRADA' | 'LINK_PAGAMENTO';
  pacote?: 'AVANCAR_2' | 'AVANCAR_3';
  combo?: string;                // '1MM', 'GETPAY', 'LINKDEPAGAMENTO', etc
  tipoCombo?: string;            // 'Combo GetNet D2'
  segmento?: string;             // 'B1'
  faturamento?: string;          // 'De 500K A 1M'
}
