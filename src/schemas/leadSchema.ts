import { z } from 'zod';

// Status do Lead no Funil de Vendas iCtx
export const LeadStatusSchema = z.enum([
  'novo',
  'em_prospeccao',
  'negociacao',
  'fechado',
  'descartado',
  'contato_1',
  'contato_2',
  'contato_3',
]);

export type LeadStatusZod = z.infer<typeof LeadStatusSchema>;

// Quadro Societário (QSA)
export const SocioSchema = z.object({
  nome: z.string().default(''),
  qualificacao: z.string().default(''),
});

export type SocioZod = z.infer<typeof SocioSchema>;

// Histórico de Interações / Logs de Contato
export const ContatoLogSchema = z.object({
  id: z.string().default(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))),
  dataHora: z.string().catch(() => new Date().toISOString()),
  tipo: z.enum(['whatsapp', 'ligacao', 'mudanca_status', 'nota']).default('nota'),
  templateTitulo: z.string().optional(),
  mensagemEnviada: z.string().optional(),
  observacao: z.string().optional(),
});

export type ContatoLogZod = z.infer<typeof ContatoLogSchema>;

// Schemas de Inteligência Santander / Getnet
export const OfertaRecomendadaSchema = z.enum([
  'D1 Com Parcelamento',
  'D1 Sem Parcelamento',
  'D2',
  'Pendente',
]);

export const StatusContaPJSchema = z.enum([
  'Não Iniciada',
  'Link Enviado',
  'Em Análise',
  'Aprovada',
  'Derivada para Agência',
]);

export const ModeloEquipamentoSchema = z.enum([
  'POS 3G',
  'Get Clássica',
  'Get Tap',
  'Link de Pagamento',
]);

export const StatusPedidoPOSSchema = z.enum([
  'Não Solicitado',
  'Submetido',
  'Em Processo de Entrega',
  'Entregue',
]);

// Helper de formatação de CNPJ caso ausente
function formatarCnpjPadrao(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return cnpj;
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Schema Central do Lead com validação defensiva e passthrough para não perder campos legados
export const LeadSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String).catch(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))),
    cnpj: z.string().catch('').default(''),
    cnpjFormatado: z.string().optional(),
    nomeContato: z.string().catch('Não informado').default('Não informado'),
    telefonePrincipal: z.string().catch('').default(''),
    telefonePrincipalFormatado: z.string().catch('').default(''),
    telefoneSecundario: z.string().optional(),
    telefoneSecundarioFormatado: z.string().optional(),
    razaoSocial: z.string().catch('').default(''),
    nomeFantasia: z.string().catch('').default(''),
    empresaExibicao: z.string().catch('').default(''),
    
    // Status e Classificação
    status: LeadStatusSchema.catch('novo').default('novo'),
    cadenciaContatos: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).catch(0).default(0),
    produtoSugerido: z.string().catch('Conta Santander + Getnet').default('Conta Santander + Getnet'),
    
    // Societário & Localização
    socios: z.array(SocioSchema).catch([]).default([]),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    municipio: z.string().optional(),
    uf: z.string().optional(),
    cep: z.string().optional(),
    cidade: z.string().optional(),
    
    // Porte e CNAE
    cnae: z.string().optional(),
    cnaeCodigo: z.string().optional(),
    cnaeDescricao: z.string().optional(),
    naturezaJuridica: z.string().optional(),
    isMei: z.boolean().catch(false).default(false),
    isMeiDesenquadrado: z.boolean().catch(false).default(false),
    capitalSocial: z.number().optional(),
    
    // Histórico e Timestamps
    criadoEm: z.string().catch(() => new Date().toISOString()),
    atualizadoEm: z.string().catch(() => new Date().toISOString()),
    ultimoContatoEm: z.string().optional(),
    dataUltimoContato: z.string().optional(),
    proximoFollowUp: z.string().optional(),
    tentativasContato: z.number().catch(0).default(0),
    historicoContatos: z.array(ContatoLogSchema).catch([]).default([]),
    notas: z.string().optional(),
    observacoes: z.string().optional(),
    motivoDescarte: z.string().optional(),

    // Operação Santander & Getnet
    faturamentoMensal: z.number().optional(),
    ofertaRecomendada: OfertaRecomendadaSchema.catch('Pendente').default('Pendente'),
    statusContaPJ: StatusContaPJSchema.catch('Não Iniciada').default('Não Iniciada'),
    linkContaPJ: z.string().optional(),
    dataEnvioLink: z.string().optional(),
    modeloEquipamento: ModeloEquipamentoSchema.catch('POS 3G').default('POS 3G'),
    statusPedidoPOS: StatusPedidoPOSSchema.catch('Não Solicitado').default('Não Solicitado'),
    completudeCadastral: z.boolean().catch(false).default(false),
    
    // Ativação e Campanha Santander
    pixCount: z.number().optional(),
    maquinaVendas: z.number().optional(),
    vendeuConta: z.boolean().optional(),
    vendeuMaquina: z.boolean().optional(),
    contaAtivaEm: z.string().optional(),
    maquinaAtivaEm: z.string().optional(),
    fitContratadoEm: z.string().optional(),
    dataFechamento: z.string().optional(),
  })
  .passthrough() // Mantém atributos legados do Google Sheets e integrações
  .transform((data) => {
    // Normalização automática de exibição
    const empresa = data.nomeFantasia || data.razaoSocial || data.empresaExibicao || 'Empresa Sem Nome';
    const cnpjFmt = data.cnpjFormatado || (data.cnpj ? formatarCnpjPadrao(data.cnpj) : '');
    
    return {
      ...data,
      empresaExibicao: data.empresaExibicao || empresa,
      cnpjFormatado: cnpjFmt,
      cidade: data.cidade || data.municipio || '',
    };
  });

export type ValidatedLead = z.infer<typeof LeadSchema>;

/**
 * Validação segura de um lead avulso com fallbacks automáticos em caso de erro
 */
export function safeParseLead(raw: unknown): ValidatedLead {
  if (!raw || typeof raw !== 'object') {
    const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lead_${Date.now()}`;
    return {
      id: fallbackId,
      cnpj: '',
      cnpjFormatado: '',
      nomeContato: 'Não informado',
      telefonePrincipal: '',
      telefonePrincipalFormatado: '',
      razaoSocial: 'Empresa Sem Nome',
      nomeFantasia: 'Empresa Sem Nome',
      empresaExibicao: 'Empresa Sem Nome',
      status: 'novo',
      cadenciaContatos: 0,
      produtoSugerido: 'Conta Santander + Getnet',
      socios: [],
      isMei: false,
      isMeiDesenquadrado: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      tentativasContato: 0,
      historicoContatos: [],
      ofertaRecomendada: 'Pendente',
      statusContaPJ: 'Não Iniciada',
      modeloEquipamento: 'POS 3G',
      statusPedidoPOS: 'Não Solicitado',
      completudeCadastral: false,
      cidade: '',
    };
  }

  const result = LeadSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }

  console.warn('[Zod] Lead com campos divergentes — preenchendo fallbacks seguros sem cancelar o lote:', result.error.format());
  const r = raw as Record<string, any>;
  const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const idFinal = r.id ? String(r.id) : fallbackId;
  const cnpjFinal = r.cnpj ? String(r.cnpj).replace(/\D/g, '') : '';
  const empresaFinal = String(r.empresaExibicao || r.nomeFantasia || r.razaoSocial || 'Empresa Sem Nome');

  return {
    ...r,
    id: idFinal,
    cnpj: cnpjFinal,
    cnpjFormatado: r.cnpjFormatado || (cnpjFinal ? formatarCnpjPadrao(cnpjFinal) : ''),
    nomeContato: String(r.nomeContato || r.nome || 'Não informado'),
    telefonePrincipal: String(r.telefonePrincipal || r.telefone || '').replace(/\D/g, ''),
    telefonePrincipalFormatado: String(r.telefonePrincipalFormatado || r.telefone || ''),
    razaoSocial: String(r.razaoSocial || empresaFinal),
    nomeFantasia: String(r.nomeFantasia || empresaFinal),
    empresaExibicao: empresaFinal,
    status: (r.status && ['novo', 'em_prospeccao', 'negociacao', 'fechado', 'descartado', 'contato_1', 'contato_2', 'contato_3'].includes(r.status)) ? r.status : 'novo',
    cadenciaContatos: (Number(r.cadenciaContatos) || 0) as 0 | 1 | 2 | 3,
    produtoSugerido: String(r.produtoSugerido || 'Conta Santander + Getnet'),
    socios: Array.isArray(r.socios) ? r.socios : [],
    isMei: Boolean(r.isMei),
    isMeiDesenquadrado: Boolean(r.isMeiDesenquadrado),
    criadoEm: String(r.criadoEm || new Date().toISOString()),
    atualizadoEm: String(r.atualizadoEm || new Date().toISOString()),
    tentativasContato: Number(r.tentativasContato) || 0,
    historicoContatos: Array.isArray(r.historicoContatos) ? r.historicoContatos : [],
    ofertaRecomendada: (r.ofertaRecomendada || 'Pendente') as any,
    statusContaPJ: (r.statusContaPJ || 'Não Iniciada') as any,
    modeloEquipamento: (r.modeloEquipamento || 'POS 3G') as any,
    statusPedidoPOS: (r.statusPedidoPOS || 'Não Solicitado') as any,
    completudeCadastral: Boolean(r.completudeCadastral),
    cidade: String(r.cidade || r.municipio || ''),
  };
}

/**
 * Validação segura de uma lista de leads brutos (LocalStorage, API, Ingestão)
 * NUNCA descarta leads válidos ou com falhas parciais de schema.
 */
export function parseLeadsArray(rawList: unknown): ValidatedLead[] {
  if (!Array.isArray(rawList)) {
    console.warn('[Zod] Entrada não é uma lista:', rawList);
    return [];
  }

  const leadsValidados: ValidatedLead[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const parsed = safeParseLead(item);
    leadsValidados.push(parsed);
  }

  return leadsValidados;
}
