import { INITIAL_TEMPLATES } from '../data/initialTemplates';
import { ColumnConfig, Lead, LeadStatus, MessageTemplate } from '../types/crm';

const STORAGE_LEADS_KEY = 'santander_leads_v2';
const STORAGE_TEMPLATES_KEY = 'santander_templates_v3';

export const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    id: 'novo',
    titulo: 'Lead Novo',
    subtitulo: 'Aguardando abordagem',
    corBadge: 'bg-slate-100 text-slate-700',
    corBorda: 'border-slate-300',
    corHeader: 'bg-slate-200/80 text-slate-800',
    corBg: 'bg-slate-100/70',
    proximaEtapa: 'contato_1',
  },
  {
    id: 'contato_1',
    titulo: 'Contato 1',
    subtitulo: '1ª mensagem enviada',
    corBadge: 'bg-blue-100 text-blue-800',
    corBorda: 'border-blue-300',
    corHeader: 'bg-blue-100/80 text-blue-900',
    corBg: 'bg-blue-50/60',
    proximaEtapa: 'contato_2',
  },
  {
    id: 'contato_2',
    titulo: 'Contato 2',
    subtitulo: 'Follow-up / Não respondeu',
    corBadge: 'bg-amber-100 text-amber-800',
    corBorda: 'border-amber-300',
    corHeader: 'bg-amber-100/80 text-amber-900',
    corBg: 'bg-amber-50/60',
    proximaEtapa: 'contato_3',
  },
  {
    id: 'contato_3',
    titulo: 'Contato 3 (Ligação)',
    subtitulo: 'Tentativa por telefone',
    corBadge: 'bg-purple-100 text-purple-800',
    corBorda: 'border-purple-300',
    corHeader: 'bg-purple-100/80 text-purple-900',
    corBg: 'bg-purple-50/60',
    proximaEtapa: 'negociacao',
  },
  {
    id: 'negociacao',
    titulo: 'Em Negociação',
    subtitulo: 'Respondeu / Interesse',
    corBadge: 'bg-indigo-100 text-indigo-800',
    corBorda: 'border-indigo-300',
    corHeader: 'bg-indigo-100/80 text-indigo-900',
    corBg: 'bg-indigo-50/60',
    proximaEtapa: 'fechado',
  },
  {
    id: 'fechado',
    titulo: 'Fechado 🎉',
    subtitulo: 'Conta aberta / Crédito',
    corBadge: 'bg-emerald-100 text-emerald-800',
    corBorda: 'border-emerald-300',
    corHeader: 'bg-emerald-100/80 text-emerald-900',
    corBg: 'bg-emerald-50/60',
  },
  {
    id: 'descartado',
    titulo: 'Descartado',
    subtitulo: 'Sem interesse / No momento não',
    corBadge: 'bg-rose-100 text-rose-800',
    corBorda: 'border-rose-300',
    corHeader: 'bg-rose-100/80 text-rose-900',
    corBg: 'bg-rose-50/60',
  },
];

import { autocorrigeLead } from '../services/cnpjService';

export function carregarLeads(): Lead[] {
  try {
    const salvo = localStorage.getItem(STORAGE_LEADS_KEY);
    if (salvo) {
      const parsed: Lead[] = JSON.parse(salvo);
      if (Array.isArray(parsed)) {
        // Autocorrige leads que possam ter dados invertidos de versões anteriores
        return parsed.map((lead) => autocorrigeLead(lead));
      }
    }
  } catch (err) {
    console.error('Erro ao ler leads do storage:', err);
  }
  return [];
}

export function salvarLeads(leads: Lead[]): void {
  try {
    localStorage.setItem(STORAGE_LEADS_KEY, JSON.stringify(leads));
  } catch (err) {
    console.error('Erro ao salvar leads no storage:', err);
  }
}

import { calcularProximoFollowUp } from './cadencia';

/**
 * Atualiza o status do lead aplicando as regras de cadência automática:
 * - dataUltimoContato recebe a data atual
 * - proximoFollowUp calculado de acordo com a etapa (contato_1: +3d, contato_2: +3d, contato_3: +5d, negociacao: +2d, novo/fechado: vazio)
 * - tentativasContato incrementado para contato_1, contato_2 e contato_3
 */
export function aplicarMudancaStatusCadencia(lead: Lead, novoStatus: LeadStatus): Lead {
  const agoraIso = new Date().toISOString();
  let tentativas = lead.tentativasContato || 0;
  if (novoStatus === 'contato_1' || novoStatus === 'contato_2' || novoStatus === 'contato_3') {
    tentativas += 1;
  }

  return {
    ...lead,
    status: novoStatus,
    dataUltimoContato: agoraIso,
    ultimoContatoEm: agoraIso,
    proximoFollowUp: calcularProximoFollowUp(novoStatus),
    tentativasContato: tentativas,
    atualizadoEm: agoraIso,
  };
}

export const atualizarStatusLead = aplicarMudancaStatusCadencia;

export function carregarTemplates(): MessageTemplate[] {
  try {
    const salvo = localStorage.getItem(STORAGE_TEMPLATES_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler templates do storage:', err);
  }
  return INITIAL_TEMPLATES;
}

export function salvarTemplates(templates: MessageTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Erro ao salvar templates no storage:', err);
  }
}

import { analisarMeiRazaoSocial } from '../services/cnpjService';

/**
 * Substitui as variáveis {nome}, {empresa}, {cidade}, {idade}, {socio}, {cnae} no texto
 * com camada de inteligência anti-spam para MEI / MEI Desenquadrado / Empresário Individual
 */
export function preencherVariaveisMensagem(texto: string, lead: Partial<Lead>): string {
  // Reavalia na hora caso o lead não tenha sido previamente sanitizado
  const analise = analisarMeiRazaoSocial(lead.razaoSocial, lead.nomeFantasia, lead.naturezaJuridica);

  // 1. Resolução do Nome do Titular / Contato Real
  let nomeCompleto = (lead.nomeContato || '').trim();
  const nomeEInvalidoOuTelefone =
    !nomeCompleto ||
    /^[\d\s().+-]+$/.test(nomeCompleto) ||
    nomeCompleto.replace(/\D/g, '').length >= 8 ||
    nomeCompleto.toLowerCase().includes('consultar') ||
    nomeCompleto.toLowerCase() === 'cliente' ||
    nomeCompleto.toLowerCase() === (lead.razaoSocial || '').toLowerCase();

  if (nomeEInvalidoOuTelefone) {
    if (lead.nomeTitular) {
      nomeCompleto = lead.nomeTitular;
    } else if (analise.nomeTitularExtraido) {
      nomeCompleto = analise.nomeTitularExtraido;
    } else if (lead.socios && lead.socios.length > 0 && lead.socios[0].nome) {
      nomeCompleto = lead.socios[0].nome;
    } else {
      nomeCompleto = '';
    }
  }

  // Primeiro nome para saudação humanizada no WhatsApp (ex: "Oi Geraldino" ao invés de nomes longos ou números)
  let primeiroNome = '';
  if (nomeCompleto) {
    primeiroNome = nomeCompleto.split(/\s+/)[0];
  }

  // 2. Resolução do Nome da Empresa
  // Se for MEI ou MEI Desenquadrado sem nome fantasia comercial registrado, NUNCA usa o nome próprio/CNPJ da pessoa como empresa
  // Usa "sua empresa" de forma humanizada e sem asteriscos
  const isMeiSemFantasia =
    lead.isMeiDesenquadrado ||
    analise.isMeiOuDesenquadrado ||
    !analise.nomeFantasiaValido;

  let empresa = lead.empresaParaMensagem;
  if (!empresa) {
    if (isMeiSemFantasia) {
      empresa = 'sua empresa';
    } else if (lead.nomeFantasia && lead.nomeFantasia.length > 2) {
      empresa = lead.nomeFantasia;
    } else {
      empresa = analise.empresaParaMensagem || 'sua empresa';
    }
  }

  const cidade = lead.municipio ? `${lead.municipio}${lead.uf ? `/${lead.uf}` : ''}` : 'sua região';
  const idade = lead.idadeEmpresa || 'tempo de mercado';
  const socio = lead.socios && lead.socios.length > 0 ? lead.socios[0].nome.split(' ')[0] : (primeiroNome || 'você');
  const cnae = lead.cnaeDescricao || 'seu segmento';
  const telefone = lead.telefonePrincipalFormatado || lead.telefonePrincipal || '';

  let textoProcessado = texto;

  // Se a empresa é "sua empresa", remove asteriscos para não colocar negrito robótico em *sua empresa*
  if (empresa === 'sua empresa') {
    textoProcessado = textoProcessado
      .replace(/\*\{empresa\}\*/g, 'sua empresa')
      .replace(/\{empresa\}/g, 'sua empresa')
      .replace(/pela \*?sua empresa\*?/gi, 'pela sua empresa')
      .replace(/para a \*?sua empresa\*?/gi, 'para a sua empresa')
      .replace(/na região da \*?sua empresa\*?/gi, 'na sua região')
      .replace(/rotina aí na \*?sua empresa\*?/gi, 'rotina aí na empresa')
      .replace(/da \*?sua empresa\*?/gi, 'da sua empresa');
  } else {
    // Para empresas com Razão Social ou Fantasia comercial tradicional (ex: *CR Serviços Empresariais*)
    textoProcessado = textoProcessado.replace(/{empresa}/g, empresa);
  }

  // Se temos o primeiro nome da pessoa física (ex: Geraldino)
  if (primeiroNome) {
    textoProcessado = textoProcessado
      .replace(/\{nome\}/g, primeiroNome)
      .replace(/\{nomeCompleto\}/g, nomeCompleto);
  } else {
    // Se não há nome identificado, evita saudações esquisitas como "Oi ," ou "Oi Cliente,"
    textoProcessado = textoProcessado
      .replace(/Oi \{nome\},/gi, 'Oi,')
      .replace(/Olá \{nome\},/gi, 'Olá,')
      .replace(/\{nome\}/g, 'você')
      .replace(/\{nomeCompleto\}/g, 'você');
  }

  return textoProcessado
    .replace(/{cidade}/g, cidade)
    .replace(/{idade}/g, idade)
    .replace(/{socio}/g, socio)
    .replace(/{cnae}/g, cnae)
    .replace(/{telefone}/g, telefone);
}

/**
 * Constrói o link oficial wa.me para WhatsApp Web e Mobile
 */
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const limpo = telefone.replace(/\D/g, '');
  if (!limpo) return '';
  // Garante DDI 55 do Brasil
  const numeroCompleto = limpo.startsWith('55') ? limpo : `55${limpo}`;
  return `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Exporta os leads para CSV compatível com Excel e Google Planilhas (UTF-8 com BOM)
 */
export function exportarLeadsCsv(leads: Lead[]): void {
  const colunas = [
    'CNPJ',
    'RazaoSocial',
    'NomeFantasia',
    'ResponsavelLead',
    'TelefonePrincipal',
    'TelefoneSecundario',
    'Status',
    'IdadeEmpresa',
    'Municipio',
    'UF',
    'CNAE',
    'DescricaoCNAE',
    'Socios',
    'ProdutoSugerido',
    'UltimoContato',
    'MotivoDescarte',
    'Notas',
  ];

  const linhas = leads.map((lead) => {
    const sociosFormatados = (lead.socios || [])
      .map((s) => `${s.nome} (${s.qualificacao})`)
      .join(' | ');

    return [
      lead.cnpjFormatado || lead.cnpj,
      `"${(lead.razaoSocial || '').replace(/"/g, '""')}"`,
      `"${(lead.nomeFantasia || '').replace(/"/g, '""')}"`,
      `"${(lead.nomeContato || '').replace(/"/g, '""')}"`,
      lead.telefonePrincipalFormatado || lead.telefonePrincipal,
      lead.telefoneSecundarioFormatado || lead.telefoneSecundario || '',
      lead.status,
      `"${lead.idadeEmpresa || ''}"`,
      `"${lead.municipio || ''}"`,
      lead.uf || '',
      lead.cnaeCodigo || '',
      `"${(lead.cnaeDescricao || '').replace(/"/g, '""')}"`,
      `"${sociosFormatados.replace(/"/g, '""')}"`,
      `"${lead.produtoSugerido || ''}"`,
      lead.ultimoContatoEm || '',
      `"${(lead.motivoDescarte || '').replace(/"/g, '""')}"`,
      `"${(lead.notas || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  const conteudoCsv = '\uFEFF' + [colunas.join(';'), ...linhas].join('\r\n');
  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `leads_ictx_pj_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
