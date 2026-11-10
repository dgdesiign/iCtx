import type { Lead } from '../types/crm';
import { CAMPANHA, type Faixa } from '../config/campanha';
import {
  faseAtivacao,
  janelaCheia,
  contaAtiva,
  maquinaAtiva,
  produtosVendidos,
  dataLocalISO,
} from './ativacao';

export const FATURAMENTO_ANUAL_MINIMO = 510000;

function mesRef(iso: string | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 7);
}

function mesAbertura(lead: Lead): string {
  const j = janelaCheia(lead);
  if (!j) return '';
  return mesRef(j.dataAbertura);
}

function somarMeses(mes: string, n: number): string {
  if (!mes) return '';
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  const py = d.getFullYear();
  const pm = String(d.getMonth() + 1).padStart(2, '0');
  return `${py}-${pm}`;
}

export function elegivel(lead: Lead): boolean {
  const opcaoMei = lead.dataCompletaReceita?.opcao_pelo_mei;
  if (typeof opcaoMei === 'boolean') {
    return !opcaoMei;
  }
  const porte = String((lead as any).porte ?? '').trim().toUpperCase();
  if (porte === 'MEI') return false;
  if (lead.isMei === true && lead.isMeiDesenquadrado !== true) return false;
  return true;
}

export function maisDeUmAno(lead: Lead, refMes: string): boolean | null {
  if (!lead.cnpjInicio) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(lead.cnpjInicio)) return null;
  const [ay, am] = lead.cnpjInicio.slice(0, 10).split('-').map(Number);
  const [ry, rm] = refMes.split('-').map(Number);
  const aniAnos = ay + 1;
  if (ry > aniAnos) return true;
  if (ry < aniAnos) return false;
  return rm >= am;
}

/**
 * NOVA REGRA: O cliente só atinge a tabela cheia (10 pts) se:
 * 1. CNPJ com mais de 1 ano, E
 * 2. Faturamento anual >= R$ 510.000 (ou seja, mensal >= R$ 42.500)
 */
export function elegivelParaPontosCheios(lead: Lead, refMes: string): boolean {
  const idadeOk = maisDeUmAno(lead, refMes) === true;
  if (!idadeOk) return false;

  // Faturamento: se não informado, assume baixo (conservador)
  const faturamentoMensal = Number(lead.faturamentoMensal) || 0;
  const faturamentoAnual = faturamentoMensal * 12;

  return faturamentoAnual >= FATURAMENTO_ANUAL_MINIMO;
}

export type Produto = 'conta' | 'getnet';

export interface PontosProduto {
  pts: number;
  m01: boolean;
  motivo: 'M0/M1' | 'M2_ativacao_tardia' | 'M2_retencao' | 'expirado' | 'nao_ativou' | 'nao_elegivel';
}

export function pontosProduto(
  lead: Lead,
  produto: Produto,
  mesAlvo: string
): PontosProduto {
  const zero = (motivo: PontosProduto['motivo']): PontosProduto => 
    ({ pts: 0, m01: false, motivo });

  if (!elegivel(lead)) return zero('nao_elegivel');

  const p = produtosVendidos(lead);
  if (produto === 'conta' && !p.conta) return zero('nao_ativou');
  if (produto === 'getnet' && !p.maquina) return zero('nao_ativou');

  const dataAtivacao = produto === 'conta' ? lead.contaAtivaEm : lead.maquinaAtivaEm;
  if (!dataAtivacao) return zero('nao_ativou');

  const mesAb = mesAbertura(lead);
  if (!mesAb) return zero('nao_ativou');

  const mesAtiv = mesRef(dataAtivacao);
  const mesM0 = mesAb;
  const mesM1 = somarMeses(mesAb, 1);
  const mesM2 = somarMeses(mesAb, 2);

  // AQUI A CORREÇÃO: usa a nova regra combinada (idade + faturamento)
  const mais = elegivelParaPontosCheios(lead, mesAb);
  const t = CAMPANHA.tabela[produto];

  if (mesAtiv === mesM0 || mesAtiv === mesM1) {
    if (mesAlvo === mesAtiv) {
      const pts = mais ? t.m01.mais1ano : t.m01.menos1ano;
      return { pts, m01: true, motivo: 'M0/M1' };
    }
    if (mesAlvo === mesM2) {
      const dataEncerramento = produto === 'conta' 
        ? lead.contaEncerradaEm 
        : lead.maquinaEncerradaEm;
      if (dataEncerramento && mesRef(dataEncerramento) <= mesM2) {
        return zero('expirado');
      }
      const pts = Math.floor((mais ? t.m2.mais1ano : t.m2.menos1ano));
      return { pts, m01: false, motivo: 'M2_retencao' };
    }
    return zero('expirado');
  }

  if (mesAtiv === mesM2) {
    if (mesAlvo === mesM2) {
      const pts = Math.floor((mais ? t.m2.mais1ano : t.m2.menos1ano));
      return { pts, m01: false, motivo: 'M2_ativacao_tardia' };
    }
    return zero('expirado');
  }

  return zero('expirado');
}

export function pontosFit(lead: Lead, mesAlvo: string): number {
  if (!elegivel(lead)) return 0;
  if (!lead.fitContratadoEm) return 0;
  if (mesRef(lead.fitContratadoEm) !== mesAlvo) return 0;
  return CAMPANHA.fit.pontos;
}

export interface PontosMes {
  conta: number;
  getnet: number;
  fit: number;
  total: number;
  m01Conta: number;
  m01Getnet: number;
  m01Total: number;
  detalhes: Array<{
    leadId: string;
    produto: Produto | 'fit';
    pts: number;
    m01: boolean;
    motivo: string;
  }>;
}

export function pontosMes(leads: Lead[], mesAlvo: string): PontosMes {
  const r: PontosMes = {
    conta: 0, getnet: 0, fit: 0, total: 0,
    m01Conta: 0, m01Getnet: 0, m01Total: 0,
    detalhes: [],
  };

  for (const lead of leads) {
    if ((lead as any).deletedAt) continue;

    const pc = pontosProduto(lead, 'conta', mesAlvo);
    if (pc.pts > 0) {
      r.conta += pc.pts;
      if (pc.m01) r.m01Conta += pc.pts;
      r.detalhes.push({ leadId: lead.id, produto: 'conta', pts: pc.pts, m01: pc.m01, motivo: pc.motivo });
    }

    const pg = pontosProduto(lead, 'getnet', mesAlvo);
    if (pg.pts > 0) {
      r.getnet += pg.pts;
      if (pg.m01) r.m01Getnet += pg.pts;
      r.detalhes.push({ leadId: lead.id, produto: 'getnet', pts: pg.pts, m01: pg.m01, motivo: pg.motivo });
    }

    const pf = pontosFit(lead, mesAlvo);
    if (pf > 0) {
      r.fit += pf;
      r.detalhes.push({ leadId: lead.id, produto: 'fit', pts: pf, m01: false, motivo: 'fit' });
    }
  }

  r.m01Total = r.m01Conta + r.m01Getnet;
  r.total = r.conta + r.getnet + r.fit;
  return r;
}

export interface Potencial {
  conta: number;
  getnet: number;
  total: number;
  idadeDesconhecida: boolean;
  elegivel: boolean;
  faturamentoBaixo: boolean;
}

/**
 * Pontos MÁXIMOS possíveis se o lead ativar hoje.
 * Aplica a nova regra combinada (idade + faturamento).
 */
export function potencial(lead: Lead, refMes: string = ''): Potencial {
  if (!elegivel(lead)) {
    return { conta: 0, getnet: 0, total: 0, idadeDesconhecida: false, elegivel: false, faturamentoBaixo: false };
  }
  const ref = refMes || mesAbertura(lead) || dataLocalISO(new Date()).slice(0, 7);
  const mais = elegivelParaPontosCheios(lead, ref);
  const faturamentoMensal = Number(lead.faturamentoMensal) || 0;
  const faturamentoBaixo = (faturamentoMensal * 12) < FATURAMENTO_ANUAL_MINIMO;
  
  const t = CAMPANHA.tabela;
  const conta = mais ? t.conta.m01.mais1ano : t.conta.m01.menos1ano;
  const getnet = mais ? t.getnet.m01.mais1ano : t.getnet.m01.menos1ano;
  return {
    conta,
    getnet,
    total: conta + getnet,
    idadeDesconhecida: maisDeUmAno(lead, ref) === null,
    elegivel: true,
    faturamentoBaixo,
  };
}

export function bonusPorFaixa(pts: number, faixas: readonly Faixa[]): number {
  let valor = 0;
  for (const f of faixas) {
    if (pts >= f.pts) valor = f.valor;
    else break;
  }
  return valor;
}

export function proximaFaixa(
  pts: number,
  faixas: readonly Faixa[]
): { pts: number; valor: number; faltam: number } | null {
  for (const f of faixas) {
    if (pts < f.pts) {
      return { pts: f.pts, valor: f.valor, faltam: f.pts - pts };
    }
  }
  return null;
}

export function gatilhoDoMes(mesDeCasa: number): { conta: number; getnet: number } {
  for (const g of CAMPANHA.gatilho) {
    if (g.mesDeCasaAte === null || mesDeCasa <= g.mesDeCasaAte) {
      return { conta: g.conta, getnet: g.getnet };
    }
  }
  return { conta: 16, getnet: 12 };
}

export interface Remuneracao {
  pontos: PontosMes;
  valorBase: number;
  bonusConta: number;
  bonusGetnet: number;
  bonusEquipe: number;
  gatilho: {
    exigido: { conta: number; getnet: number };
    atingido: boolean;
    m01Conta: number;
    m01Getnet: number;
  };
  totalSeLiberado: number;
  totalLiberado: number;
  equipeBateu: boolean;
}

export function remuneracao(
  pontos: PontosMes,
  opcoes: { mesDeCasa: number; equipeBateu: boolean }
): Remuneracao {
  const valorBase = pontos.total * CAMPANHA.valorPonto;
  const bonusConta = bonusPorFaixa(pontos.total, CAMPANHA.bonusConta);
  const bonusGetnet = bonusPorFaixa(pontos.getnet, CAMPANHA.bonusGetnet);
  const bonusEquipe = opcoes.equipeBateu 
    ? bonusPorFaixa(pontos.m01Total, CAMPANHA.bonusEquipe) 
    : 0;

  const exigido = gatilhoDoMes(opcoes.mesDeCasa);
  const atingido = 
    pontos.m01Conta >= exigido.conta && 
    pontos.m01Getnet >= exigido.getnet;

  const totalSeLiberado = valorBase + bonusConta + bonusGetnet + bonusEquipe;
  const totalLiberado = atingido ? totalSeLiberado : valorBase;

  return {
    pontos,
    valorBase,
    bonusConta,
    bonusGetnet,
    bonusEquipe,
    gatilho: {
      exigido,
      atingido,
      m01Conta: pontos.m01Conta,
      m01Getnet: pontos.m01Getnet,
    },
    totalSeLiberado,
    totalLiberado,
    equipeBateu: opcoes.equipeBateu,
  };
}

export function selfTestPontos(): string[] {
  const falhas: string[] = [];
  const t = (nome: string, ok: boolean) => { if (!ok) falhas.push(nome); };

  const base: Lead = {
    id: 'test',
    status: 'fechado',
    isMei: false,
    isMeiDesenquadrado: true,
    cnpjInicio: '2020-01-01',
    faturamentoMensal: 50000,
    dataAbertura: '2026-10-05',
    contaAtivaEm: '2026-10-10',
    maquinaAtivaEm: '2026-10-20',
    pixCount: 3,
    maquinaVendas: 500,
  } as unknown as Lead;

  t('MEI comum não é elegível', elegivel({ ...base, isMei: true, isMeiDesenquadrado: false }) === false);
  t('MEI+ é elegível', elegivel(base) === true);
  t('cnpj 2020 + ref 2026 = >1 ano', maisDeUmAno(base, '2026-10') === true);
  t('elegivelParaPontosCheios com faturamento >= 42.500', elegivelParaPontosCheios(base, '2026-10') === true);
  t('elegivelParaPontosCheios falso se faturamento < 42.500', elegivelParaPontosCheios({ ...base, faturamentoMensal: 10000 }, '2026-10') === false);
  t('elegivelParaPontosCheios falso se CNPJ recente', elegivelParaPontosCheios({ ...base, cnpjInicio: '2026-05-01' }, '2026-10') === false);

  const m0Conta = pontosProduto(base, 'conta', '2026-10');
  t('conta M0 +1ano e faturamento ok = 4 pts', m0Conta.pts === 4 && m0Conta.m01 === true);
  const m0Get = pontosProduto(base, 'getnet', '2026-10');
  t('getnet M0 +1ano e faturamento ok = 6 pts', m0Get.pts === 6 && m0Get.m01 === true);

  const m0ContaBaixo = pontosProduto({ ...base, faturamentoMensal: 10000 }, 'conta', '2026-10');
  t('conta M0 faturamento baixo = 2 pts', m0ContaBaixo.pts === 2);

  return falhas;
}
