import { Lead } from '../types/crm';
import { calcularIdadeEmpresa } from '../services/cnpjService';
import { classificarCnae } from '../data/cnaeAderencia';

/**
 * Score de Aderência Santander (0–100).
 *
 * 3 camadas determinísticas:
 *  - Fit Produto  (0–60): COM_PAR=60, SEM_PAR=45, fora=15, risco=-1
 *  - Fit Porte    (0–30): MEI+ ou fat≥60k=30; fat≥20k=22; fat≥5k=15; ME≥1a=10; ME<1a=8; MEI=3
 *  - Fit Engaj.   (0–10): respondeu=10; 1+ tentativa=5; senão=0
 *
 * Fechado/descartado = -1 (não conta).
 */
export function calcularScore(lead: Lead): number {
  if (lead.status === 'fechado' || lead.status === 'descartado') return -1;

  const aderencia = classificarCnae(lead.cnaeCodigo);
  if (aderencia === 'risco') return -1;

  // ── 1. Fit Produto ─────────────────────────────────────────────────
  let fitProduto = 15;
  if (aderencia === 'com_parcelamento') fitProduto = 60;
  else if (aderencia === 'sem_parcelamento') fitProduto = 45;

  // ── 2. Fit Porte ───────────────────────────────────────────────────
  let fitPorte = 0;
  const fat = lead.faturamentoMensal ?? 0;
  const isMeiPlus = Boolean(lead.isMeiDesenquadrado);

  if (isMeiPlus || fat >= 60000) fitPorte = 30;
  else if (fat >= 20000) fitPorte = 22;
  else if (fat >= 5000) fitPorte = 15;
  else if (!lead.isMei && lead.dataAbertura) {
    const anos = lead.idadeAnos ?? calcularIdadeEmpresa(lead.dataAbertura).anos;
    fitPorte = anos >= 1 ? 10 : 8;
  } else if (lead.isMei) {
    fitPorte = 3;
  }

  // ── 3. Fit Engajamento ─────────────────────────────────────────────
  let fitEngajamento = 0;
  if (['contato_2', 'contato_3', 'negociacao'].includes(lead.status)) fitEngajamento = 10;
  else if ((lead.tentativasContato ?? 0) > 0) fitEngajamento = 5;

  return Math.max(0, Math.min(100, fitProduto + fitPorte + fitEngajamento));
}

export type ScoreCategoria =
  | 'hot' | 'alvo' | 'medio' | 'baixo' | 'muito_baixo' | 'descarte' | 'compliance';

export interface ScoreInfo {
  score: number;
  categoria: ScoreCategoria;
  rotulo: string;
  badgeStyle: string;
}

export function obterInfoScore(lead: Lead): ScoreInfo | null {
  const score = calcularScore(lead);

  if (score < 0) return {
    score, categoria: 'compliance',
    rotulo: '⛔ Compliance',
    badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
  };
  if (score >= 85) return {
    score, categoria: 'hot',
    rotulo: '🔥 HOT',
    badgeStyle: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
  };
  if (score >= 65) return {
    score, categoria: 'alvo',
    rotulo: '🟢 Alvo',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
  };
  if (score >= 45) return {
    score, categoria: 'medio',
    rotulo: '🟡 Médio',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-300 font-medium',
  };
  if (score >= 25) return {
    score, categoria: 'baixo',
    rotulo: '⚪ Baixo',
    badgeStyle: 'bg-slate-100 text-slate-600 border-slate-300 font-medium',
  };
  if (score >= 10) return {
    score, categoria: 'muito_baixo',
    rotulo: '🔵 Muito Baixo',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
  };
  return {
    score, categoria: 'descarte',
    rotulo: '⚫ Descarte',
    badgeStyle: 'bg-slate-200 text-slate-500 border-slate-300 font-normal',
  };
}
