import type { Lead } from '../types/crm';
import { CAMPANHA, type Faixa } from '../config/campanha';
import {
  faseAtivacao,
  janelaCheia,
  contaAtiva,
  maquinaAtiva,
  produtosVendidos,
} from './ativacao';

// ---------- helpers ----------

/** Retorna 'YYYY-MM' de uma data ISO ou 'YYYY-MM-DD'. */
function mesRef(iso: string | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 7);
}

/** Retorna o mês de abertura do lead, ou '' se não houver. */
function mesAbertura(lead: Lead): string {
  const j = janelaCheia(lead);
  if (!j) return '';
  return mesRef(j.dataAbertura);
}

/** Soma N meses a 'YYYY-MM' e retorna 'YYYY-MM'. */
function somarMeses(mes: string, n: number): string {
  if (!mes) return '';
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  const py = d.getFullYear();
  const pm = String(d.getMonth() + 1).padStart(2, '0');
  return `${py}-${pm}`;
}

/** Verifica se 'YYYY-MM' está entre dois meses (inclusive). */
function mesEntre(mes: string, ini: string, fim: string): boolean {
  return mes >= ini && mes <= fim;
}

// ---------- elegibilidade ----------

/**
 * MEI comum (não desenquadrado) NÃO credencia. 0 pontos sempre.
 * MEI+, ME, EIRELI, LTDA, demais = elegíveis.
 */
export function elegivel(lead: Lead): boolean {
  const porte = String((lead as any).porte ?? '').trim().toUpperCase();
  if (porte === 'MEI') return false;
  // Se o lead foi marcado como MEI comum no service de CNPJ
  if (lead.isMei === true && lead.isMeiDesenquadrado !== true) return false;
  return true;
}

/**
 * Retorna true se o CNPJ tem mais de 1 ano a partir de uma data de referência.
 * Usa cnpjInicio (data_inicio_atividade da Receita) e a data de abertura do 
 * lead como ref. Se cnpjInicio ausente → null (desconhecido, trata como <1 ano).
 */
export function maisDeUmAno(lead: Lead, refMes: string): boolean | null {
  if (!lead.cnpjInicio) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(lead.cnpjInicio)) return null;
  const [ay, am, ad] = lead.cnpjInicio.slice(0, 10).split('-').map(Number);
  const [ry, rm] = refMes.split('-').map(Number);
  // Abertura + 1 ano
  const aniAnos = ay + 1;
  // Compara: a data de referência já passou do aniversário de 1 ano?
  if (ry > aniAnos) return true;
  if (ry < aniAnos) return false;
  // Mesmo ano do aniversário — comparar mês (ignorando dia para simplicidade)
  return rm >= am;
}

// ---------- pontos por produto/mês ----------

export type Produto = 'conta' | 'getnet';

export interface PontosProduto {
  pts: number;
  m01: boolean;  // true = pago como M0/M1 (100%)
  motivo: 'M0/M1' | 'M2_ativacao_tardia' | 'M2_retencao' | 'expirado' | 'nao_ativou' | 'nao_elegivel';
}

/**
 * Calcula pontos de UM produto (conta ou getnet) em UM mês específico.
 * 
 * Regras:
 * - Se o lead não é elegível (MEI comum) → 0 pts.
 * - Se produto não foi vendido → 0 pts.
 * - Se produto não está ativo (dataAtivacaoEm ausente) → 0 pts (nunca ativou).
 * - Se ativou em M0/M1:
 *     - Paga cheio no mês da ativação (M0 ou M1).
 *     - Paga 50% no mês M2 SE ainda ativo nesse M2 (retenção).
 * - Se ativou em M2 (tardio):
 *     - Paga 50% no M2 (só isso).
 * - Se ativou em M3+: 0 pts.
 */
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

  const mais = maisDeUmAno(lead, mesAb) === true;
  const t = CAMPANHA.tabela[produto];

  // Ativou em M0 ou M1
  if (mesAtiv === mesM0 || mesAtiv === mesM1) {
    // Pagamento cheio no mês da ativação
    if (mesAlvo === mesAtiv) {
      const pts = mais ? t.m01.mais1ano : t.m01.menos1ano;
      return { pts, m01: true, motivo: 'M0/M1' };
    }
    // Retenção em M2 (só se o mês alvo é M2 e o produto ainda está ativo)
    if (mesAlvo === mesM2) {
      const dataEncerramento = produto === 'conta' 
        ? lead.contaEncerradaEm 
        : lead.maquinaEncerradaEm;
      // Se encerrou antes ou durante o M2 → sem retenção
      if (dataEncerramento && mesRef(dataEncerramento) <= mesM2) {
        return zero('expirado');
      }
      const pts = Math.floor((mais ? t.m2.mais1ano : t.m2.menos1ano));
      return { pts, m01: false, motivo: 'M2_retencao' };
    }
    // Antes do M0, depois do M2, ou entre (impossível) → 0
    return zero('expirado');
  }

  // Ativou em M2 (tardio)
  if (mesAtiv === mesM2) {
    if (mesAlvo === mesM2) {
      const pts = Math.floor((mais ? t.m2.mais1ano : t.m2.menos1ano));
      return { pts, m01: false, motivo: 'M2_ativacao_tardia' };
    }
    return zero('expirado');
  }

  // Ativou em M3+ → nunca pontua
  return zero('expirado');
}

// ---------- Fit Energia ----------

export function pontosFit(lead: Lead, mesAlvo: string): number {
  if (!elegivel(lead)) return 0;
  if (!lead.fitContratadoEm) return 0;
  // Paga 1x no mês da contratação (premissa)
  if (mesRef(lead.fitContratadoEm) !== mesAlvo) return 0;
  return CAMPANHA.fit.pontos;
}

// ---------- agregação mensal ----------

export interface PontosMes {
  conta: number;
  getnet: number;
  fit: number;
  total: number;
  m01Conta: number;   // pontos M0/M1 de conta
  m01Getnet: number;  // pontos M0/M1 de getnet
  m01Total: number;   // soma
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

// ---------- potencial (usado no card e em metas) ----------

export interface Potencial {
  conta: number;
  getnet: number;
  total: number;
  idadeDesconhecida: boolean;
  elegivel: boolean;
}

/**
 * Pontos MÁXIMOS possíveis se o lead ativar hoje (M0/M1).
 * MEI comum → 0.
 */
export function potencial(lead: Lead, refMes: string = ''): Potencial {
  if (!elegivel(lead)) {
    return { conta: 0, getnet: 0, total: 0, idadeDesconhecida: false, elegivel: false };
  }
  const ref = refMes || mesAbertura(lead) || (new Date()).toISOString().slice(0, 7);
  const mais = maisDeUmAno(lead, ref);
  const t = CAMPANHA.tabela;
  const conta = mais === true ? t.conta.m01.mais1ano : t.conta.m01.menos1ano;
  const getnet = mais === true ? t.getnet.m01.mais1ano : t.getnet.m01.menos1ano;
  return {
    conta,
    getnet,
    total: conta + getnet,
    idadeDesconhecida: mais === null,
    elegivel: true,
  };
}

// ---------- bônus ----------

/**
 * Retorna o valor da faixa atingida (por faixa — não soma entre faixas).
 */
export function bonusPorFaixa(pts: number, faixas: readonly Faixa[]): number {
  let valor = 0;
  for (const f of faixas) {
    if (pts >= f.pts) valor = f.valor;
    else break;
  }
  return valor;
}

/**
 * Retorna a próxima faixa não atingida + quanto falta.
 */
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

// ---------- gatilho ----------

export function gatilhoDoMes(mesDeCasa: number): { conta: number; getnet: number } {
  for (const g of CAMPANHA.gatilho) {
    if (g.mesDeCasaAte === null || mesDeCasa <= g.mesDeCasaAte) {
      return { conta: g.conta, getnet: g.getnet };
    }
  }
  return { conta: 16, getnet: 12 };
}

// ---------- remuneração ----------

export interface Remuneracao {
  pontos: PontosMes;
  valorBase: number;         // pontos.total × valorPonto
  bonusConta: number;        // por faixa, usa pontos.total (conta+get+fit)
  bonusGetnet: number;       // por faixa, usa SÓ pontos.getnet
  bonusEquipe: number;       // por faixa, usa m01Total (só M0/M1)
  gatilho: {
    exigido: { conta: number; getnet: number };
    atingido: boolean;
    m01Conta: number;
    m01Getnet: number;
  };
  totalSeLiberado: number;   // base + bônus (tudo, sem cheque de gatilho)
  totalLiberado: number;     // se gatilho NÃO atingido → só base
  equipeBateu: boolean;
}

export function remuneracao(
  pontos: PontosMes,
  opcoes: { mesDeCasa: number; equipeBateu: boolean }
): Remuneracao {
  const valorBase = pontos.total * CAMPANHA.valorPonto;

  // Bônus conta usa TOTAL de pontos (conta + get + fit)
  const bonusConta = bonusPorFaixa(pontos.total, CAMPANHA.bonusConta);

  // Bônus get usa SÓ pontos getnet
  const bonusGetnet = bonusPorFaixa(pontos.getnet, CAMPANHA.bonusGetnet);

  // Bônus equipe usa SÓ pontos M0/M1
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

// ---------- selfTest ----------

export function selfTestPontos(): string[] {
  const falhas: string[] = [];
  const t = (nome: string, ok: boolean) => { if (!ok) falhas.push(nome); };

  // Base: lead elegível ME+ (+1 ano), ativou conta e máquina em out/2026
  const base: Lead = {
    id: 'test',
    status: 'fechado',
    isMei: false,
    isMeiDesenquadrado: true,
    cnpjInicio: '2020-01-01',
    dataAbertura: '2026-10-05',
    contaAtivaEm: '2026-10-10',
    maquinaAtivaEm: '2026-10-20',
    pixCount: 3,
    maquinaVendas: 500,
  } as unknown as Lead;

  // --- elegibilidade ---
  t('MEI comum não é elegível', elegivel({ ...base, isMei: true, isMeiDesenquadrado: false }) === false);
  t('MEI+ é elegível', elegivel(base) === true);

  // --- maisDeUmAno ---
  t('cnpj 2020 + ref 2026 = >1 ano', maisDeUmAno(base, '2026-10') === true);
  t('cnpj recente = <1 ano', maisDeUmAno({ ...base, cnpjInicio: '2026-05-01' }, '2026-10') === false);
  t('cnpj ausente = null', maisDeUmAno({ ...base, cnpjInicio: undefined }, '2026-10') === null);

  // --- pontos M0 ---
  const m0Conta = pontosProduto(base, 'conta', '2026-10');
  t('conta M0 +1ano = 4 pts', m0Conta.pts === 4 && m0Conta.m01 === true);
  const m0Get = pontosProduto(base, 'getnet', '2026-10');
  t('getnet M0 +1ano = 6 pts', m0Get.pts === 6 && m0Get.m01 === true);

  // --- M1 não pagou de novo (já pagou em M0) ---
  t('M1 sem pontos repetidos', pontosProduto(base, 'conta', '2026-11').pts === 0);

  // --- M2 retenção ---
  const m2Conta = pontosProduto(base, 'conta', '2026-12');
  t('conta M2 retenção = 2 pts (50%)', m2Conta.pts === 2 && m2Conta.m01 === false && m2Conta.motivo === 'M2_retencao');
  const m2Get = pontosProduto(base, 'getnet', '2026-12');
  t('getnet M2 retenção = 3 pts (50%)', m2Get.pts === 3 && m2Get.motivo === 'M2_retencao');

  // --- M3+ não pontua ---
  t('M3 sem pontos', pontosProduto(base, 'conta', '2027-01').pts === 0);
  t('M4 sem pontos', pontosProduto(base, 'getnet', '2027-02').pts === 0);

  // --- Ativação tardia em M2 ---
  const tardio: Lead = { ...base, contaAtivaEm: undefined, maquinaAtivaEm: undefined } as Lead;
  const tardioM0 = pontosProduto(tardio, 'conta', '2026-10');
  t('tardio M0 sem pontos', tardioM0.pts === 0);
  const tardioM1 = pontosProduto(tardio, 'conta', '2026-11');
  t('tardio M1 sem pontos', tardioM1.pts === 0);
  const tardioAtivou: Lead = { ...base, contaAtivaEm: '2026-12-15', maquinaAtivaEm: '2026-12-20' } as Lead;
  const tardioM2 = pontosProduto(tardioAtivou, 'conta', '2026-12');
  t('ativou em M2 = 50%', tardioM2.pts === 2 && tardioM2.m01 === false && tardioM2.motivo === 'M2_ativacao_tardia');

  // --- M2 retenção com churn ---
  const comChurn: Lead = { ...base, contaEncerradaEm: '2026-12-10' } as Lead;
  const m2Churn = pontosProduto(comChurn, 'conta', '2026-12');
  t('churn em M2 zera retenção', m2Churn.pts === 0);

  // --- <1 ano ---
  const novo: Lead = { ...base, cnpjInicio: '2026-05-01' } as Lead;
  t('conta M0 <1ano = 2 pts', pontosProduto(novo, 'conta', '2026-10').pts === 2);
  t('getnet M0 <1ano = 4 pts', pontosProduto(novo, 'getnet', '2026-10').pts === 4);

  // --- agregação ---
  const pm = pontosMes([base], '2026-10');
  t('pontosMes M0 = 10 pts', pm.total === 10 && pm.conta === 4 && pm.getnet === 6);
  t('pontosMes M0 m01Total = 10', pm.m01Total === 10);

  const pmM2 = pontosMes([base], '2026-12');
  t('pontosMes M2 = 5 pts (retenção)', pmM2.total === 5 && pmM2.m01Total === 0);

  // --- Fit ---
  const comFit: Lead = { ...base, fitContratadoEm: '2026-10-15' } as Lead;
  t('fit paga 1 no mês da contratação', pontosFit(comFit, '2026-10') === 1);
  t('fit não paga em outros meses', pontosFit(comFit, '2026-11') === 0);

  // --- bônus por faixa ---
  t('bônus conta 60 = 1000', bonusPorFaixa(60, CAMPANHA.bonusConta) === 1000);
  t('bônus conta 79 = 1000', bonusPorFaixa(79, CAMPANHA.bonusConta) === 1000);
  t('bônus conta 80 = 2000', bonusPorFaixa(80, CAMPANHA.bonusConta) === 2000);
  t('bônus conta 130 = 4000', bonusPorFaixa(130, CAMPANHA.bonusConta) === 4000);
  t('bônus conta 200 = 4000 (teto)', bonusPorFaixa(200, CAMPANHA.bonusConta) === 4000);
  t('bônus get 25 = 1000', bonusPorFaixa(25, CAMPANHA.bonusGetnet) === 1000);
  t('bônus get 85 = 5000', bonusPorFaixa(85, CAMPANHA.bonusGetnet) === 5000);

  // --- próxima faixa ---
  const pf = proximaFaixa(57, CAMPANHA.bonusConta);
  t('próxima faixa 57 → 60 faltam 3', pf?.pts === 60 && pf.faltam === 3);

  // --- gatilho ---
  t('gatilho mês 1 = 12/4', gatilhoDoMes(1).conta === 12 && gatilhoDoMes(1).getnet === 4);
  t('gatilho mês 3 = 14/8', gatilhoDoMes(3).conta === 14 && gatilhoDoMes(3).getnet === 8);
  t('gatilho mês 9 = 16/12', gatilhoDoMes(9).conta === 16 && gatilhoDoMes(9).getnet === 12);

  // --- remuneração com gatilho atingido ---
  const pOk: PontosMes = {
    conta: 60, getnet: 60, fit: 0, total: 120,
    m01Conta: 60, m01Getnet: 60, m01Total: 120,
    detalhes: [],
  };
  const rOk = remuneracao(pOk, { mesDeCasa: 5, equipeBateu: false });
  t('gatilho atingido → libera tudo', rOk.gatilho.atingido === true && rOk.totalLiberado === rOk.totalSeLiberado);
  t('remuneração 120 = 3600 base', rOk.valorBase === 3600);
  t('bônus conta 120 = 3000', rOk.bonusConta === 3000);
  t('bônus get 60 = 3000', rOk.bonusGetnet === 3000);

  // --- remuneração com gatilho NÃO atingido ---
  const pFalha: PontosMes = {
    conta: 20, getnet: 10, fit: 0, total: 30,
    m01Conta: 5, m01Getnet: 10, m01Total: 15,
    detalhes: [],
  };
  const rFalha = remuneracao(pFalha, { mesDeCasa: 5, equipeBateu: false });
  t('gatilho não atingido → só base', rFalha.gatilho.atingido === false && rFalha.totalLiberado === rFalha.valorBase);

  // --- equipe bateu ---
  const rEq = remuneracao(pOk, { mesDeCasa: 5, equipeBateu: true });
  t('equipe bateu → bônus equipe entra', rEq.bonusEquipe === 5000);

  // --- exemplo do usuário: 131 pts M0/M1/M2 ---
  // 100 pts M0 + 26 pts M1 + 5 pts M2 retenção
  const pEx: PontosMes = {
    conta: 50, getnet: 31, fit: 0, total: 131,
    m01Conta: 50, m01Getnet: 26, m01Total: 76,
    detalhes: [],
  };
  const rEx = remuneracao(pEx, { mesDeCasa: 5, equipeBateu: false });
  t('exemplo: base = 3930', rEx.valorBase === 3930);
  t('exemplo: bônus conta 131 = 4000', rEx.bonusConta === 4000);
  t('exemplo: bônus get 31 = 1000 (faixa 25)', rEx.bonusGetnet === 1000);

  return falhas;
}
