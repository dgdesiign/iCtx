import type { Lead } from '../types/crm';
import { autocorrigeLead } from '../services/cnpjService';

/**
 * Regex para identificar leads de exemplo/mock (lead_1 até lead_99).
 * Devem ser descartados incondicionalmente em qualquer operação de sincronização.
 */
export const SAMPLE_LEAD_REGEX = /^lead_[1-9]\d?$/;

export function isSampleLeadId(id: string): boolean {
  return SAMPLE_LEAD_REGEX.test(id);
}

/**
 * Retorna a chave de sincronização do Lead:
 * - CNPJ normalizado (somente dígitos) se existir e não for vazio.
 * - Fallback: 'id:' + l.id quando CNPJ ausente ou vazio.
 */
export function getLeadSyncKey(lead: Lead): string {
  const cnpjLimpo = (lead.cnpj || '').replace(/\D/g, '');
  if (cnpjLimpo.length > 0) {
    return cnpjLimpo;
  }
  return `id:${lead.id || ''}`;
}

/**
 * Higieniza o mapa base de sincronização ictx_sync_base.
 * Se contiver chaves que parecem IDs antigos (ex: começam com "lead_" ou
 * não são somente dígitos nem começam com "id:"), descarta a base legada
 * tratando-a como vazia {}.
 */
export function sanitizarBaseSync(base: Record<string, string>): Record<string, string> {
  if (!base || typeof base !== 'object') {
    return {};
  }
  const keys = Object.keys(base);
  if (keys.length === 0) {
    return {};
  }
  const temLegado = keys.some(
    (k) => k.startsWith('lead_') || (!/^\d+$/.test(k) && !k.startsWith('id:'))
  );
  if (temLegado) {
    return {};
  }
  return base;
}

/**
 * Serialização estável com chaves ordenadas recursivamente.
 * Garante que a ordem de inserção das propriedades não altere o hash.
 */
export function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map((key) => {
    return JSON.stringify(key) + ':' + stableStringify(obj[key]);
  });
  return '{' + parts.join(',') + '}';
}

/**
 * FNV-1a de 32 bits para cálculo de hash determinístico do Lead.
 * Retorna string hexadecimal de 8 caracteres padronizada.
 */
export function hashLead(lead: Lead): string {
  const str = stableStringify(lead);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export interface MergeResult {
  merged: Lead[];
  conflitos: number;
}

/**
 * Agrupa lista de leads por sua chave de sincronização (CNPJ ou id:fallback).
 * Descarta leads de exemplo (lead_1 a lead_99).
 * Se houver duplicatas de chave na mesma lista, preserva o com maior atualizadoEm.
 */
function agruparLeadsPorChave(lista: Lead[]): Map<string, Lead> {
  const mapa = new Map<string, Lead>();
  for (const l of lista) {
    if (!l || !l.id || isSampleLeadId(l.id)) {
      continue;
    }
    const corrigido = autocorrigeLead(l);
    const chave = getLeadSyncKey(corrigido);
    const existente = mapa.get(chave);
    if (!existente) {
      mapa.set(chave, corrigido);
    } else {
      const dtNovo = corrigido.atualizadoEm || '';
      const dtExistente = existente.atualizadoEm || '';
      if (dtNovo > dtExistente) {
        mapa.set(chave, corrigido);
      }
    }
  }
  return mapa;
}

/**
 * Merge 3-way entre leads locais, leads remotos do Google Sheets e base de sincronização.
 * 
 * Regras:
 * - Chave de agrupamento: CNPJ normalizado (ou fallback 'id:' + id).
 * - Descarte de exemplos: ids /^lead_[1-9]\d?$/ são descartados incondicionalmente.
 * - Base sanitizada: chaves legadas ("lead_..." ou não conformes) são descartadas (base vazia {}).
 * - Presente em ambos (mesmo CNPJ / chave):
 *    - Hashes iguais: local (0 conflitos).
 *    - Base === hash(remoto): local editado, remoto inalterado (0 conflitos).
 *    - Base === hash(local): remoto editado, local inalterado (0 conflitos).
 *    - Senão: conflito (conflitos++). Comparação de versão: vence maior atualizadoEm (ISO lexical).
 *      Se empatar -> local vence (estável).
 * - Só local: local incluído.
 * - Só remoto: incluído apenas se chave NÃO constava na base (se constava, foi deletado localmente).
 */
export function mergeLeads3(
  locais: Lead[],
  remotos: Lead[],
  base: Record<string, string> = {}
): MergeResult {
  let conflitos = 0;
  const baseLimpa = sanitizarBaseSync(base);

  const localMap = agruparLeadsPorChave(locais);
  const remotoMap = agruparLeadsPorChave(remotos);

  const todasChaves = new Set<string>([...localMap.keys(), ...remotoMap.keys()]);
  const resultado: Lead[] = [];

  for (const chave of todasChaves) {
    const leadLocal = localMap.get(chave);
    const leadRemoto = remotoMap.get(chave);

    if (leadLocal && leadRemoto) {
      const hLocal = hashLead(leadLocal);
      const hRemoto = hashLead(leadRemoto);
      const hBase = baseLimpa[chave];

      if (hLocal === hRemoto) {
        resultado.push(leadLocal);
      } else if (hBase && hBase === hRemoto) {
        // Remoto não mudou desde a base; local foi alterado
        resultado.push(leadLocal);
      } else if (hBase && hBase === hLocal) {
        // Local não mudou desde a base; remoto foi alterado
        resultado.push(leadRemoto);
      } else {
        // Conflito (ambos alterados em relação à base ou base vazia/descartada)
        conflitos++;
        const dtLocal = leadLocal.atualizadoEm || '';
        const dtRemoto = leadRemoto.atualizadoEm || '';
        if (dtRemoto > dtLocal) {
          resultado.push(leadRemoto);
        } else {
          // dtLocal >= dtRemoto (se empatar, local vence de forma estável)
          resultado.push(leadLocal);
        }
      }
    } else if (leadLocal) {
      // Presente apenas localmente
      resultado.push(leadLocal);
    } else if (leadRemoto) {
      // Presente apenas remotamente: só inclui se NÃO existia na base limpa
      if (baseLimpa[chave] === undefined) {
        resultado.push(leadRemoto);
      }
    }
  }

  return {
    merged: resultado,
    conflitos,
  };
}

/**
 * Compatibilidade legada para chamadas 2-way que ainda utilizem mergeLeads
 */
export function mergeLeads(locais: Lead[], remotos: Lead[]): Lead[] {
  return mergeLeads3(locais, remotos, {}).merged;
}

/**
 * Autoteste com ≥14 cenários cobrindo todos os ramos de decisão do merge por CNPJ/id,
 * 3-way com base sanitizada, descarte de exemplos e integridade de hashing.
 * Retorna lista de erros encontrados (vazia [] se todos passarem).
 */
export function selfTestMerge(): string[] {
  const falhas: string[] = [];

  const mockLead = (
    id: string,
    nome: string,
    status: any = 'novo',
    cnpjCustom?: string
  ): Lead => {
    let cnpjFinal = '';
    if (cnpjCustom !== undefined) {
      cnpjFinal = cnpjCustom.replace(/\D/g, '');
    } else {
      // Gera CNPJ numérico determinístico baseado no id se não informado
      const num = id.replace(/\D/g, '') || '1';
      cnpjFinal = (num.padStart(14, '0')).slice(0, 14);
    }

    return autocorrigeLead({
      id,
      cnpj: cnpjFinal,
      cnpjFormatado: cnpjFinal ? `${cnpjFinal.slice(0, 2)}.${cnpjFinal.slice(2, 5)}...` : '',
      razaoSocial: nome,
      nomeFantasia: nome,
      empresaExibicao: nome,
      empresaParaMensagem: nome,
      nomeContato: 'Contato ' + nome,
      telefonePrincipal: '11999998888',
      telefonePrincipalFormatado: '(11) 99999-8888',
      status,
      idadeEmpresa: '2 anos',
      cnaeDescricao: 'Comércio',
      municipio: 'São Paulo',
      uf: 'SP',
      socios: [],
      produtoSugerido: 'Conta',
      criadoEm: '2026-01-01T00:00:00.000Z',
      atualizadoEm: '2026-01-01T00:00:00.000Z',
      historicoContatos: [],
    });
  };

  // Teste 1: Hashes idênticos entre local e remoto -> escolhe local, conflitos = 0
  {
    const l = mockLead('real_1', 'Empresa 1');
    const r = mockLead('real_1', 'Empresa 1');
    const res = mergeLeads3([l], [r], {});
    if (res.merged.length !== 1 || res.conflitos !== 0 || res.merged[0].empresaExibicao !== 'Empresa 1') {
      falhas.push('Teste 1 falhou: hash idêntico deveria selecionar local com 0 conflitos');
    }
  }

  // Teste 2: Local editado, remoto inalterado em relação à base -> escolhe local
  {
    const original = mockLead('real_2', 'Original');
    const hBase = hashLead(original);
    const key = getLeadSyncKey(original);
    const localEditado = { ...original, nomeContato: 'Carlos Editado', atualizadoEm: '2026-01-02T00:00:00.000Z' };
    const remotoOriginal = { ...original };
    const res = mergeLeads3([localEditado], [remotoOriginal], { [key]: hBase });
    if (res.merged.length !== 1 || res.conflitos !== 0 || res.merged[0].nomeContato !== 'Carlos Editado') {
      falhas.push('Teste 2 falhou: local editado com remoto igual à base deveria manter local');
    }
  }

  // Teste 3: Remoto editado, local inalterado em relação à base -> escolhe remoto
  {
    const original = mockLead('real_3', 'Original');
    const hBase = hashLead(original);
    const key = getLeadSyncKey(original);
    const localOriginal = { ...original };
    const remotoEditado = { ...original, notas: 'Nota nova do Sheets', atualizadoEm: '2026-01-02T00:00:00.000Z' };
    const res = mergeLeads3([localOriginal], [remotoEditado], { [key]: hBase });
    if (res.merged.length !== 1 || res.conflitos !== 0 || res.merged[0].notas !== 'Nota nova do Sheets') {
      falhas.push('Teste 3 falhou: remoto editado com local igual à base deveria aplicar remoto');
    }
  }

  // Teste 4: Conflito (ambos alterados diferentemente com mesmo atualizadoEm) -> escolhe local, conflitos = 1
  {
    const original = mockLead('real_4', 'Original');
    const hBase = hashLead(original);
    const key = getLeadSyncKey(original);
    const local = { ...original, status: 'negociacao' as const };
    const remoto = { ...original, status: 'fechado' as const };
    const res = mergeLeads3([local], [remoto], { [key]: hBase });
    if (res.merged.length !== 1 || res.conflitos !== 1 || res.merged[0].status !== 'negociacao') {
      falhas.push('Teste 4 falhou: conflito deveria escolher local e incrementar conflitos para 1');
    }
  }

  // Teste 5: Só local (novo lead criado localmente) -> incluído
  {
    const local = mockLead('real_5', 'Novo Local');
    const res = mergeLeads3([local], [], {});
    if (res.merged.length !== 1 || res.merged[0].id !== 'real_5') {
      falhas.push('Teste 5 falhou: lead presente apenas localmente deve ser incluído');
    }
  }

  // Teste 6: Só remoto sem base (novo lead criado no Sheets) -> incluído
  {
    const remoto = mockLead('real_6', 'Novo Remoto');
    const res = mergeLeads3([], [remoto], {});
    if (res.merged.length !== 1 || res.merged[0].id !== 'real_6') {
      falhas.push('Teste 6 falhou: lead remoto sem registro na base deve ser incluído');
    }
  }

  // Teste 7: Só remoto com chave presente na base (deletado localmente) -> descartado
  {
    const remoto = mockLead('real_7', 'Remoto Que Foi Deletado');
    const key = getLeadSyncKey(remoto);
    const res = mergeLeads3([], [remoto], { [key]: 'hash_anterior_qualquer' });
    if (res.merged.length !== 0) {
      falhas.push('Teste 7 falhou: lead remoto presente na base indica deleção local e deve ser descartado');
    }
  }

  // Teste 8: Descarte de ID de exemplo lead_1 em local
  {
    const exemplo = mockLead('lead_1', 'Exemplo 1');
    const real = mockLead('real_8', 'Lead Real');
    const res = mergeLeads3([exemplo, real], [], {});
    if (res.merged.some((l) => l.id === 'lead_1') || res.merged.length !== 1) {
      falhas.push('Teste 8 falhou: lead_1 não foi descartado dos locais');
    }
  }

  // Teste 9: Descarte de ID de exemplo lead_99 em remoto
  {
    const exemploRemoto = mockLead('lead_99', 'Exemplo 99');
    const real = mockLead('real_9', 'Lead Real Remoto');
    const res = mergeLeads3([], [exemploRemoto, real], {});
    if (res.merged.some((l) => l.id === 'lead_99') || res.merged.length !== 1) {
      falhas.push('Teste 9 falhou: lead_99 não foi descartado dos remotos');
    }
  }

  // Teste 10: Base vazia com local e remoto divergentes e mesmo atualizadoEm -> conflito com escolha de local
  {
    const local = mockLead('real_10', 'Empresa Local');
    const remoto = mockLead('real_10', 'Empresa Remota Diferente');
    const res = mergeLeads3([local], [remoto], {});
    if (res.merged.length !== 1 || res.conflitos !== 1 || res.merged[0].empresaExibicao !== 'Empresa Local') {
      falhas.push('Teste 10 falhou: base vazia com dados divergentes deve registrar conflito e selecionar local');
    }
  }

  // Teste 11: stableStringify produz o mesmo hash independentemente da ordem das propriedades
  {
    const objA = { a: 1, b: 'teste', c: [1, 2] };
    const objB = { c: [1, 2], b: 'teste', a: 1 };
    if (stableStringify(objA) !== stableStringify(objB)) {
      falhas.push('Teste 11 falhou: stableStringify não produziu resultado determinístico para chaves reordenadas');
    }
  }

  // Teste 12 (Novo 1): Dois leads com mesmo CNPJ mas IDs diferentes -> vira 1 merged
  {
    const l = mockLead('local_101', 'Empresa Alfa', 'novo', '11222333000199');
    const r = mockLead('remoto_202', 'Empresa Alfa', 'novo', '11222333000199');
    const res = mergeLeads3([l], [r], {});
    if (res.merged.length !== 1 || getLeadSyncKey(res.merged[0]) !== '11222333000199') {
      falhas.push('Teste 12 falhou: dois leads com mesmo CNPJ e IDs diferentes devem ser agrupados em 1');
    }
  }

  // Teste 13 (Novo 2): Mais recente vence (remoto com atualizadoEm maior vence local)
  {
    const l = {
      ...mockLead('id_local_13', 'Empresa Versao Local', 'novo', '22333444000188'),
      atualizadoEm: '2026-01-01T10:00:00.000Z',
    };
    const r = {
      ...mockLead('id_remoto_13', 'Empresa Versao Remota Atualizada', 'qualificado', '22333444000188'),
      atualizadoEm: '2026-01-02T15:30:00.000Z',
    };
    const res = mergeLeads3([l], [r], {});
    if (res.merged.length !== 1 || res.merged[0].empresaExibicao !== 'Empresa Versao Remota Atualizada') {
      falhas.push('Teste 13 falhou: remoto com atualizadoEm mais recente deve vencer o local');
    }
  }

  // Teste 14 (Novo 3): CNPJ ausente usa id: (não colapsa leads sem CNPJ diferentes)
  {
    const l1 = mockLead('sem_cnpj_1', 'Lead Sem CNPJ 1', 'novo', '');
    const l2 = mockLead('sem_cnpj_2', 'Lead Sem CNPJ 2', 'novo', '');
    const res = mergeLeads3([l1], [l2], {});
    if (res.merged.length !== 2) {
      falhas.push('Teste 14 falhou: leads sem CNPJ devem usar fallback id: e não colapsar');
    }
  }

  // Teste 15 (Novo 4): Base legada (chaves "lead_...") é descartada / tratada como vazia
  {
    const l = {
      ...mockLead('id_local_15', 'Lead Local Novo', 'novo', '33444555000177'),
      atualizadoEm: '2026-01-02T00:00:00.000Z',
    };
    const r = {
      ...mockLead('id_remoto_15', 'Lead Remoto Antigo', 'novo', '33444555000177'),
      atualizadoEm: '2026-01-01T00:00:00.000Z',
    };
    const baseLegada = { lead_17123456789: 'hash_invalido_legado' };
    const res = mergeLeads3([l], [r], baseLegada);
    // Base legada deve ser tratada como {}, permitindo comparação por atualizadoEm onde l vence
    if (res.merged.length !== 1 || res.merged[0].empresaExibicao !== 'Lead Local Novo') {
      falhas.push('Teste 15 falhou: base legada deve ser tratada como vazia');
    }
  }

  return falhas;
}
