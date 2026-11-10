// src/types/Client.ts
// Arquitetura Enterprise SaaS B2B - Motor de Vendas iCtx (Getnet & Santander PJ)

export type OfertaRecomendada =
  | 'D1 Com Parcelamento'
  | 'D1 Sem Parcelamento'
  | 'D2'
  | 'Pendente';

export type StatusContaPJ =
  | 'Não Iniciada'
  | 'Link Enviado'
  | 'Em Análise'
  | 'Aprovada'
  | 'Derivada para Agência';

export type ModeloEquipamento =
  | 'Get Clássica'
  | 'POS 3G'
  | 'Get Tap'
  | 'Link de Pagamento';

export type StatusPedidoPOS =
  | 'Não Solicitado'
  | 'Submetido'
  | 'Em Processo de Entrega'
  | 'Entregue';

export type StatusFunil =
  | 'Novo'
  | 'Em Prospecção'
  | 'Negociação'
  | 'Fechado'
  | 'Descartado';

export interface Client {
  // Dados Básicos
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email?: string;
  statusFunil?: StatusFunil | string;

  // Inteligência Comercial
  faturamentoMensal?: number;
  cnae?: string;
  cnaeDescricao?: string;
  ofertaRecomendada: OfertaRecomendada;

  // Integração Santander (Conta PJ)
  statusContaPJ: StatusContaPJ;
  linkContaPJ?: string;
  dataEnvioLink?: string;

  // Operação Getnet
  modeloEquipamento: ModeloEquipamento;
  statusPedidoPOS: StatusPedidoPOS;
  completudeCadastral: boolean; // Reflete se o cliente já validou a selfie/CNH no app

  // Metadados adicionais para rastreamento
  dataUltimaAtualizacao?: string;
  observacoes?: string;
  
  // Compatibilidade com Lead legada
  [key: string]: any;
}

/**
 * Converte um Lead existente no CRM para a interface Client padronizada,
 * preenchendo valores padrão da esteira Getnet / Santander PJ.
 */
export function normalizarParaClient(lead: any): Client {
  if (!lead) {
    return {
      id: '',
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      telefone: '',
      ofertaRecomendada: 'Pendente',
      statusContaPJ: 'Não Iniciada',
      modeloEquipamento: 'POS 3G',
      statusPedidoPOS: 'Não Solicitado',
      completudeCadastral: false,
    };
  }

  // Se já for um Client com os campos preenchidos
  const faturamento =
    typeof lead.faturamentoMensal === 'number'
      ? lead.faturamentoMensal
      : typeof lead.capitalSocial === 'number'
      ? lead.capitalSocial
      : undefined;

  // Inferir oferta recomendada se ausente
  let oferta: OfertaRecomendada = lead.ofertaRecomendada || 'Pendente';
  if (!lead.ofertaRecomendada && faturamento !== undefined) {
    if (faturamento > 60000) {
      oferta = 'D1 Com Parcelamento';
    } else if (faturamento > 20000) {
      oferta = 'D1 Sem Parcelamento';
    } else {
      oferta = 'D2';
    }
  }

  // Inferir status da Conta PJ
  let statusConta: StatusContaPJ = lead.statusContaPJ || 'Não Iniciada';
  if (!lead.statusContaPJ) {
    if (lead.contaAtivaEm || lead.produtosAtivos?.conta) {
      statusConta = 'Aprovada';
    } else if (lead.credenciamento?.santanderConcluido) {
      statusConta = 'Em Análise';
    }
  }

  // Inferir status Getnet
  let modelo: ModeloEquipamento = lead.modeloEquipamento || 'POS 3G';
  let statusPOS: StatusPedidoPOS = lead.statusPedidoPOS || 'Não Solicitado';
  if (!lead.statusPedidoPOS) {
    if (lead.maquinaAtivaEm || lead.produtosAtivos?.maquina) {
      statusPOS = 'Entregue';
    } else if (lead.credenciamento?.akConcluido) {
      statusPOS = 'Em Processo de Entrega';
    }
  }

  // Normaliza telefone e CNPJ
  const tel =
    lead.telefone ||
    lead.telefonePrincipal ||
    lead.telefonePrincipalFormatado ||
    '';
  const doc = lead.cnpj || lead.cnpjFormatado || '';

  return {
    id: lead.id || String(Date.now()),
    razaoSocial: lead.razaoSocial || lead.empresaExibicao || 'Razão Social Não Informada',
    nomeFantasia: lead.nomeFantasia || lead.empresaExibicao || lead.razaoSocial || 'Nome Fantasia',
    cnpj: doc,
    telefone: tel,
    email: lead.email || '',
    statusFunil: lead.statusFunil || lead.status || 'Novo',
    faturamentoMensal: faturamento,
    cnae: lead.cnae || lead.cnaeCodigo || '',
    cnaeDescricao: lead.cnaeDescricao || '',
    ofertaRecomendada: oferta,
    statusContaPJ: statusConta,
    linkContaPJ: lead.linkContaPJ,
    dataEnvioLink: lead.dataEnvioLink,
    modeloEquipamento: modelo,
    statusPedidoPOS: statusPOS,
    completudeCadastral: Boolean(lead.completudeCadastral || lead.credenciamento?.documentos?.length),
    dataUltimaAtualizacao: lead.atualizadoEm || new Date().toISOString(),
    observacoes: lead.notas || lead.observacoes,
  };
}
