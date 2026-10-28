import type { Lead } from '../types/crm';

export type AtivacaoStatus = 'aguardando' | 'em_andamento' | 'ativa' | 'risco' | 'bloqueada';
export type FaseAtivacao = 'M0' | 'M1' | 'M2' | 'expirado' | 'sem_data_abertura';

export const ATIVACAO_CFG = {
  pixMeta: 3,
  maquinaMeta: 500,
  diasAlertaFimM1: 10,
  lembreteContaDias: 2,
  lembreteMaquinaDias: 3,
  // Compatibilidade legada
  diasRiscoConta: 10,
  diasRiscoMaquina: 21,
} as const;

const pad = (n: number) => String(n).padStart(2, '0');
const clampPix = (n: unknown) => Math.min(ATIVACAO_CFG.pixMeta, Math.max(0, Math.floor(Number(n) || 0)));
const valor = (n: unknown) => Math.max(0, Number(n) || 0);

/** Datas de calendário SEMPRE 'YYYY-MM-DD' no fuso local (nunca UTC). */
export function dataLocalISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function somarDiasLocal(dias: number, base: Date = new Date()): string {
  return dataLocalISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias));
}

function paraDataLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Obtém a data de abertura do credenciamento pela cascata de fallback:
 * dataAbertura ?? dataFechamento ?? dataUltimoContato.
 */
function obterDataReferenciaAbertura(lead: Lead): string | null {
  return lead.dataAbertura ?? lead.dataFechamento?.slice(0, 10) ?? lead.dataUltimoContato?.slice(0, 10) ?? null;
}

/** Identifica em qual fase do ciclo Santander o lead se encontra (M0, M1, M2, expirado ou sem_data_abertura). */
export function faseAtivacao(lead: Lead, agora: Date = new Date()): FaseAtivacao {
  const ref = obterDataReferenciaAbertura(lead);
  if (!ref) return 'sem_data_abertura';
  const dAb = paraDataLocal(ref);
  if (!dAb) return 'sem_data_abertura';

  const anoAb = dAb.getFullYear();
  const mesAb = dAb.getMonth();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth();

  const diffMeses = (anoAtual - anoAb) * 12 + (mesAtual - mesAb);
  if (diffMeses < 0) return 'sem_data_abertura';
  if (diffMeses === 0) return 'M0';
  if (diffMeses === 1) return 'M1';
  if (diffMeses === 2) return 'M2';
  return 'expirado';
}

export interface JanelaAtivacao {
  dataAbertura: string;
  fimM1: string;
  fimM2: string;
  fase: FaseAtivacao;
  diasRestantesM1: number;
  diasRestantesM2: number;
}

/** Calcula os marcos e dias restantes para a janela de ativação M0/M1/M2. */
export function janelaCheia(lead: Lead, agora: Date = new Date()): JanelaAtivacao | null {
  const ref = obterDataReferenciaAbertura(lead);
  if (!ref) return null;
  const dAb = paraDataLocal(ref);
  if (!dAb) return null;

  const ano = dAb.getFullYear();
  const mes = dAb.getMonth();

  // fimM1: último dia do mês M1 (mes + 2 com dia 0 no construtor Date)
  const fimM1Date = new Date(ano, mes + 2, 0);
  // fimM2: último dia do mês M2 (mes + 3 com dia 0 no construtor Date)
  const fimM2Date = new Date(ano, mes + 3, 0);

  const agoraInicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const m1InicioDia = new Date(fimM1Date.getFullYear(), fimM1Date.getMonth(), fimM1Date.getDate()).getTime();
  const m2InicioDia = new Date(fimM2Date.getFullYear(), fimM2Date.getMonth(), fimM2Date.getDate()).getTime();

  const diasRestantesM1 = Math.round((m1InicioDia - agoraInicioDia) / 86400000);
  const diasRestantesM2 = Math.round((m2InicioDia - agoraInicioDia) / 86400000);

  return {
    dataAbertura: dataLocalISO(dAb),
    fimM1: dataLocalISO(fimM1Date),
    fimM2: dataLocalISO(fimM2Date),
    fase: faseAtivacao(lead, agora),
    diasRestantesM1,
    diasRestantesM2,
  };
}

/** Fator multiplicador de pontos Santander por fase: M0 e M1 = 1.0 (100%), M2 = 0.5 (50%), outros = 0. */
export function fatorPontos(fase: FaseAtivacao): 1.0 | 0.5 | 0 {
  if (fase === 'M0' || fase === 'M1') return 1.0;
  if (fase === 'M2') return 0.5;
  return 0;
}

/** Dias de calendário desde o fechamento (fallback: dataAbertura ?? dataUltimoContato). 0 se indisponível. */
export function diasDesdeFechamento(lead: Lead, agora: Date = new Date()): number {
  const ref = lead.dataFechamento ?? lead.dataAbertura ?? lead.dataUltimoContato;
  const f = ref ? paraDataLocal(ref) : null;
  if (!f) return 0;
  const ini = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  return Math.max(0, Math.round((fim - ini) / 86400000));
}

/** Ausente = vendido (conservador: nunca declara "ativa" por falta de dado). */
export function produtosVendidos(lead: Lead) {
  return { conta: lead.vendeuConta !== false, maquina: lead.vendeuMaquina !== false };
}

export function contaAtiva(lead: Lead): boolean {
  return (lead.contaAtivaEm !== undefined && lead.contaAtivaEm !== '') || clampPix(lead.pixCount) >= ATIVACAO_CFG.pixMeta;
}

export function maquinaAtiva(lead: Lead): boolean {
  return (lead.maquinaAtivaEm !== undefined && lead.maquinaAtivaEm !== '') || valor(lead.maquinaVendas) >= ATIVACAO_CFG.maquinaMeta;
}

/** Todos os produtos vendidos estão ativos (exige >=1 produto vendido). */
export function ativacaoCompleta(lead: Lead): boolean {
  const p = produtosVendidos(lead);
  if (!p.conta && !p.maquina) return false;
  return (!p.conta || contaAtiva(lead)) && (!p.maquina || maquinaAtiva(lead));
}

export function calcularAtivacaoStatus(lead: Lead, agora: Date = new Date()): AtivacaoStatus {
  if (lead.ativacaoBloqueio) return 'bloqueada';
  if (ativacaoCompleta(lead)) return 'ativa';

  const j = janelaCheia(lead, agora);
  const p = produtosVendidos(lead);
  const cAtiva = contaAtiva(lead);
  const mAtiva = maquinaAtiva(lead);
  const contaPendente = p.conta && !cAtiva;
  const maquinaPendente = p.maquina && !mAtiva;
  const algumPendente = contaPendente || maquinaPendente;
  const algumProgresso = (p.conta && cAtiva) || (p.maquina && mAtiva) || clampPix(lead.pixCount) > 0 || valor(lead.maquinaVendas) > 0;

  if (!j) {
    return algumProgresso ? 'em_andamento' : 'aguardando';
  }

  if (j.fase === 'expirado' && algumPendente) {
    return 'risco';
  }

  if ((j.fase === 'M0' || j.fase === 'M1') && algumPendente) {
    if (j.diasRestantesM1 <= ATIVACAO_CFG.diasAlertaFimM1) {
      return 'risco';
    }
    return algumProgresso ? 'em_andamento' : 'aguardando';
  }

  if (j.fase === 'M2' && algumPendente) {
    return 'em_andamento';
  }

  if (algumProgresso) {
    return 'em_andamento';
  }

  return 'aguardando';
}

export function calcularProximoLembreteAtivacao(lead: Lead, agora: Date = new Date()): string {
  if (lead.ativacaoBloqueio || ativacaoCompleta(lead)) return '';
  const p = produtosVendidos(lead);
  if (p.conta && !contaAtiva(lead)) return somarDiasLocal(ATIVACAO_CFG.lembreteContaDias, agora);
  if (p.maquina && !maquinaAtiva(lead)) return somarDiasLocal(ATIVACAO_CFG.lembreteMaquinaDias, agora);
  return '';
}

export function lembreteAtivacaoVencido(lead: Lead, agora: Date = new Date()): boolean {
  const l = lead.ativacaoProximoLembrete?.slice(0, 10);
  return !!l && l <= dataLocalISO(agora) && !lead.ativacaoBloqueio && !ativacaoCompleta(lead);
}

// Transformações puras: nunca mutam, sempre spread (preserva campos desconhecidos).
export function iniciarAtivacao(lead: Lead, agora: Date = new Date()): Lead {
  const base: Lead = {
    ...lead,
    dataFechamento: lead.dataFechamento ?? agora.toISOString(),
    pixCount: lead.pixCount ?? 0,
    maquinaVendas: lead.maquinaVendas ?? 0,
    ativacaoTentativas: lead.ativacaoTentativas ?? 0,
  };
  return { ...base, ativacaoProximoLembrete: calcularProximoLembreteAtivacao(base, agora) };
}

export function definirPix(lead: Lead, pix: number, agora: Date = new Date()): Lead {
  const n = clampPix(pix);
  const { contaAtivaEm: _ignorar, ...resto } = lead;
  const atingiu = n >= ATIVACAO_CFG.pixMeta;
  const base: Lead = {
    ...resto,
    pixCount: n,
    ...(atingiu
      ? { contaAtivaEm: lead.contaAtivaEm ?? dataLocalISO(agora) }
      : {}),
  };
  return { ...base, ativacaoProximoLembrete: calcularProximoLembreteAtivacao(base, agora) };
}

export function definirMaquinaVendas(lead: Lead, total: number, agora: Date = new Date()): Lead {
  const v = valor(total);
  const { maquinaAtivaEm: _ignorar, ...resto } = lead;
  const atingiu = v >= ATIVACAO_CFG.maquinaMeta;
  const base: Lead = {
    ...resto,
    maquinaVendas: v,
    ...(atingiu
      ? { maquinaAtivaEm: lead.maquinaAtivaEm ?? dataLocalISO(agora) }
      : {}),
  };
  return { ...base, ativacaoProximoLembrete: calcularProximoLembreteAtivacao(base, agora) };
}

export const registrarVendaMaquina = (lead: Lead, adicional: number, agora: Date = new Date()): Lead =>
  definirMaquinaVendas(lead, valor(lead.maquinaVendas) + valor(adicional), agora);

/** Retorna lista de falhas ([] = ok). */
export function selfTestAtivacao(): string[] {
  const falhas: string[] = [];
  const t = (nome: string, ok: boolean) => { if (!ok) falhas.push(nome); };
  const b = { id: 't', status: 'fechado' } as unknown as Lead;
  const agora = new Date(2026, 9, 15, 10, 0, 0); // 15 de Outubro de 2026

  // 1. Fases do ciclo Santander (Outubro = M0)
  t('fase M0 mesmo mes', faseAtivacao({ ...b, dataAbertura: '2026-10-01' }, agora) === 'M0');
  t('fase M1 mes anterior', faseAtivacao({ ...b, dataAbertura: '2026-09-10' }, agora) === 'M1');
  t('fase M2 dois meses antes', faseAtivacao({ ...b, dataAbertura: '2026-08-15' }, agora) === 'M2');
  t('fase expirado 3+ meses', faseAtivacao({ ...b, dataAbertura: '2026-07-20' }, agora) === 'expirado');
  t('fase sem data', faseAtivacao(b, agora) === 'sem_data_abertura');

  // 2. Cascata de fallback para data de abertura
  t('fallback dataFechamento', faseAtivacao({ ...b, dataFechamento: '2026-10-05T12:00:00Z' }, agora) === 'M0');
  t('fallback dataUltimoContato', faseAtivacao({ ...b, dataUltimoContato: '2026-09-01' }, agora) === 'M1');

  // 3. Fatores de pontos Santander
  t('fator M0 = 1.0', fatorPontos('M0') === 1.0);
  t('fator M1 = 1.0', fatorPontos('M1') === 1.0);
  t('fator M2 = 0.5', fatorPontos('M2') === 0.5);
  t('fator expirado = 0', fatorPontos('expirado') === 0);
  t('fator sem_data = 0', fatorPontos('sem_data_abertura') === 0);

  // 4. Janela cheia e cálculo de fim M1 / fim M2
  const jSet = janelaCheia({ ...b, dataAbertura: '2026-09-15' }, agora);
  t('janela dataAbertura', jSet?.dataAbertura === '2026-09-15');
  t('janela fimM1 setembro = 31 out', jSet?.fimM1 === '2026-10-31');
  t('janela fimM2 setembro = 30 nov', jSet?.fimM2 === '2026-11-30');
  t('janela diasRestantesM1 correto', jSet?.diasRestantesM1 === 16); // 31 - 15 = 16 dias

  // 5. Status de Ativação
  // 5.1 Bloqueada
  t('bloqueada conta_negada', calcularAtivacaoStatus({ ...b, ativacaoBloqueio: 'conta_negada' }, agora) === 'bloqueada');

  // 5.2 Ativa completa (conta + máquina)
  t('ativa conta+maquina meta atingida', calcularAtivacaoStatus({ ...b, dataAbertura: '2026-10-01', pixCount: 3, maquinaVendas: 500 }, agora) === 'ativa');
  t('ativa por timestamp contaAtivaEm e maquinaAtivaEm', calcularAtivacaoStatus({ ...b, dataAbertura: '2026-10-01', contaAtivaEm: '2026-10-05', maquinaAtivaEm: '2026-10-08' }, agora) === 'ativa');

  // 5.3 Só conta vendida
  t('so conta vendida e ativa', calcularAtivacaoStatus({ ...b, vendeuMaquina: false, dataAbertura: '2026-10-01', pixCount: 3 }, agora) === 'ativa');
  t('so conta vendida em andamento', calcularAtivacaoStatus({ ...b, vendeuMaquina: false, dataAbertura: '2026-10-01', pixCount: 1 }, agora) === 'em_andamento');

  // 5.4 Aguardando vs Em Andamento no M0 com prazo folgado
  t('aguardando M0 sem progresso', calcularAtivacaoStatus({ ...b, dataAbertura: '2026-10-01', pixCount: 0, maquinaVendas: 0 }, agora) === 'aguardando');
  t('em_andamento M0 com pix parcial', calcularAtivacaoStatus({ ...b, dataAbertura: '2026-10-01', pixCount: 1 }, agora) === 'em_andamento');

  // 5.5 Risco por proximidade do fim de M1 (<= 10 dias)
  const agoraFimM1 = new Date(2026, 9, 25, 10, 0, 0); // 25 de Outubro (fimM1 de setembro é 31/10 -> 6 dias restantes <= 10)
  t('risco fim M1 proximo', calcularAtivacaoStatus({ ...b, dataAbertura: '2026-09-10' }, agoraFimM1) === 'risco');

  // 5.6 Risco quando expirado e ainda pendente
  t('risco expirado com pendencia', calcularAtivacaoStatus({ ...b, dataAbertura: '2026-06-01' }, agora) === 'risco');

  // 5.7 Em andamento no M2 se pendente
  t('em_andamento M2 pendente', calcularAtivacaoStatus({ ...b, dataAbertura: '2026-08-10' }, agora) === 'em_andamento');

  // 6. Lembretes e helpers
  t('lembrete conta +2d', calcularProximoLembreteAtivacao(b, agora) === '2026-10-17');
  t('lembrete maquina +3d', calcularProximoLembreteAtivacao({ ...b, pixCount: 3 }, agora) === '2026-10-18');
  t('lembrete completo vazio', calcularProximoLembreteAtivacao({ ...b, pixCount: 3, maquinaVendas: 500 }, agora) === '');

  // 7. Imutabilidade e clamps
  t('pix limitado a 3', definirPix(b, 9, agora).pixCount === 3);
  t('imutavel definirPix', definirPix(b, 1, agora) !== b && b.pixCount === undefined);
  t('virada de mes somarDiasLocal', somarDiasLocal(7, new Date(2026, 9, 28)) === '2026-11-04');

  return falhas;
}
