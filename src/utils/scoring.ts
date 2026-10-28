import { Lead } from '../types/crm';
import { ehFollowUpVencido } from './cadencia';
import { calcularIdadeEmpresa } from '../services/cnpjService';

/**
 * Palavras-chave prioritárias de CNAE para negócios de alta propensão:
 * restaurante, bar, comércio, varejo, clínica, salão, oficina, hotel
 */
const CNAE_KEYWORDS = [
  'restaurante',
  'bar',
  'comercio',
  'varejo',
  'clinica',
  'salao',
  'oficina',
  'hotel',
];

/**
 * Remove acentuação e converte para minúsculo para busca insensível a acentos
 */
function normalizarTexto(txt: string | undefined | null): string {
  if (!txt) return '';
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula o Score de Priorização do Lead (0 a 100).
 * Se o lead estiver em status 'fechado' ou 'descartado', retorna -1 (não conta).
 * 
 * Pontuação base:
 * · idadeEmpresa (anos): ≥5 → +25; 1–4 → +15; <1 → +5
 * · CNAE prioritário (match textual em cnaeDescricao: restaurante, bar, comércio, varejo, clínica, salão, oficina, hotel) → +20
 * · porte === 'MEI Desenq.' → +15
 * · qsa com pelo menos 1 sócio identificado → +10
 * · tentativasContato > 0 → +15 (já engajou)
 * · tentativasContato >= 3 → -10 (pode estar queimado)
 * · proximoFollowUp vencido → +15 (sinal de ação imediata)
 */
export function calcularScore(lead: Lead): number {
  if (lead.status === 'fechado' || lead.status === 'descartado') {
    return -1;
  }

  let score = 0;

  // 1. Idade da Empresa em anos
  let anos = lead.idadeAnos;
  if (anos === undefined || anos === null) {
    anos = calcularIdadeEmpresa(lead.dataAbertura).anos;
  }

  if (anos >= 5) {
    score += 25;
  } else if (anos >= 1) {
    score += 15;
  } else {
    score += 5;
  }

  // 2. CNAE Prioritário
  const cnaeNorm = normalizarTexto(lead.cnaeDescricao);
  const temCnaePrioritario = CNAE_KEYWORDS.some((kw) => cnaeNorm.includes(kw));
  if (temCnaePrioritario) {
    score += 20;
  }

  // 3. Porte: MEI Desenquadrado
  if (lead.isMeiDesenquadrado) {
    score += 15;
  }

  // 4. QSA com pelo menos 1 sócio identificado
  const temSocioIdentificado =
    Array.isArray(lead.socios) &&
    lead.socios.length > 0 &&
    lead.socios.some((s) => s.nome && s.nome.trim().length > 0);

  if (temSocioIdentificado) {
    score += 10;
  }

  // 5. tentativasContato > 0 (+15)
  const tentativas = lead.tentativasContato || 0;
  if (tentativas > 0) {
    score += 15;
  }

  // 6. tentativasContato >= 3 (-10)
  if (tentativas >= 3) {
    score -= 10;
  }

  // 7. proximoFollowUp vencido (+15)
  if (ehFollowUpVencido(lead)) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

export type ScoreCategoria = 'quente' | 'morno' | 'frio' | 'nenhum';

export interface ScoreInfo {
  score: number;
  categoria: ScoreCategoria;
  rotulo: string;
  badgeStyle: string;
}

/**
 * Retorna as informações visuais formatadas para o selo de score do lead.
 */
export function obterInfoScore(lead: Lead): ScoreInfo | null {
  const score = calcularScore(lead);
  if (score < 0) return null;

  if (score >= 75) {
    return {
      score,
      categoria: 'quente',
      rotulo: '🟢 Quente',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    };
  }

  if (score >= 45) {
    return {
      score,
      categoria: 'morno',
      rotulo: '🟡 Morno',
      badgeStyle: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    };
  }

  return {
    score,
    categoria: 'frio',
    rotulo: '⚪ Frio',
    badgeStyle: 'bg-slate-100 text-slate-600 border-slate-300 font-medium',
  };
}
