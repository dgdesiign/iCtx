import { Lead, LeadStatus } from '../types/crm';

/**
 * Calcula a data do próximo follow-up com base na etapa do lead no funil:
 * - contato_1: +3 dias
 * - contato_2: +3 dias
 * - contato_3: +5 dias
 * - negociacao: +2 dias
 * - outras etapas (novo, fechado, descartado): vazio ""
 */
export function calcularProximoFollowUp(status: LeadStatus, dataBase: Date = new Date()): string {
  const d = new Date(dataBase.getTime());

  switch (status) {
    case 'contato_1':
      d.setDate(d.getDate() + 3);
      return d.toISOString();
    case 'contato_2':
      d.setDate(d.getDate() + 3);
      return d.toISOString();
    case 'contato_3':
      d.setDate(d.getDate() + 5);
      return d.toISOString();
    case 'negociacao':
      d.setDate(d.getDate() + 2);
      return d.toISOString();
    default:
      return '';
  }
}

/**
 * Retorna true se o lead possui um follow-up agendado e o prazo já venceu
 * (ou seja, proximoFollowUp <= final do dia de hoje).
 */
export function ehFollowUpVencido(lead: Lead): boolean {
  if (!lead.proximoFollowUp || lead.proximoFollowUp.trim() === '') {
    return false;
  }

  // Não considera vencido se já foi fechado ou descartado
  if (lead.status === 'fechado' || lead.status === 'descartado') {
    return false;
  }

  const dataFollowUp = new Date(lead.proximoFollowUp);
  if (isNaN(dataFollowUp.getTime())) {
    return false;
  }

  const hojeFimDoDia = new Date();
  hojeFimDoDia.setHours(23, 59, 59, 999);

  return dataFollowUp <= hojeFimDoDia;
}

/**
 * Calcula quantos dias se passaram desde o último contato registrado com o lead.
 */
export function diasDesdeUltimoContato(lead: Lead): number {
  const dataReferencia = lead.dataUltimoContato || lead.ultimoContatoEm || lead.atualizadoEm;
  if (!dataReferencia) return 0;

  const data = new Date(dataReferencia);
  if (isNaN(data.getTime())) return 0;

  const agora = new Date();
  const diffMs = agora.getTime() - data.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDias > 0 ? diffDias : 0;
}

/**
 * Retorna o status detalhado do follow-up para exibição de selos visuais:
 * - 'vencido': venceu antes de hoje (mostra ⏰ Vencido há Xd)
 * - 'hoje': vence hoje ou amanhã cedo (mostra ⏳ Hoje)
 * - 'futuro': agendado para dias à frente
 * - 'nenhum': sem follow-up ativo
 */
export function obterInfoFollowUp(lead: Lead): {
  status: 'vencido' | 'hoje' | 'futuro' | 'nenhum';
  texto: string;
  diasAtraso: number;
} {
  if (!lead.proximoFollowUp || lead.proximoFollowUp.trim() === '') {
    return { status: 'nenhum', texto: '', diasAtraso: 0 };
  }

  if (lead.status === 'fechado' || lead.status === 'descartado') {
    return { status: 'nenhum', texto: '', diasAtraso: 0 };
  }

  const dataFollowUp = new Date(lead.proximoFollowUp);
  if (isNaN(dataFollowUp.getTime())) {
    return { status: 'nenhum', texto: '', diasAtraso: 0 };
  }

  const agora = new Date();
  const hojeInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0);
  const hojeFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);

  if (dataFollowUp < hojeInicio) {
    // Vencido há mais de 1 dia
    const diffMs = hojeInicio.getTime() - dataFollowUp.getTime();
    const dias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return { status: 'vencido', texto: `⏰ Vencido há ${dias}d`, diasAtraso: dias };
  } else if (dataFollowUp <= hojeFim) {
    // Vence exatamente hoje
    return { status: 'hoje', texto: '⏳ Hoje', diasAtraso: 0 };
  } else {
    // Futuro
    return { status: 'futuro', texto: 'Em dia', diasAtraso: 0 };
  }
}

/**
 * Centraliza a regra de transição de etapa e cadência automática do lead.
 * Atualiza dataUltimoContato, calcula proximoFollowUp e incrementa tentativasContato.
 */
export function atualizarStatusComCadencia(lead: Lead, novoStatus: LeadStatus): Lead {
  const agoraIso = new Date().toISOString();
  const proximo = calcularProximoFollowUp(novoStatus);

  let tentativas = lead.tentativasContato || 0;
  if (novoStatus === 'contato_1' || novoStatus === 'contato_2' || novoStatus === 'contato_3') {
    tentativas += 1;
  }

  return {
    ...lead,
    status: novoStatus,
    dataUltimoContato: agoraIso,
    ultimoContatoEm: agoraIso,
    proximoFollowUp: proximo,
    tentativasContato: tentativas,
    atualizadoEm: agoraIso,
  };
}
