/**
 * Utilitários para abreviação padronizada de cidades no Kanban.
 */

/**
 * Normaliza uma string removendo acentos, convertendo para minúsculas e aplicando trim.
 */
export function normalizar(s: string): string {
  if (!s) return '';
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tabela de lookup com abreviações padronizadas das principais cidades.
 */
const CIDADE_LOOKUP: Record<string, string> = {
  'salvador': 'SSA',
  'camacari': 'CA',
  'candeias': 'CAN',
  'dias d avila': 'DD',
  'dias davila': 'DD',
  "dias d'avila": 'DD',
  'mata de sao joao': 'MSJ',
  'lauro de freitas': 'LF',
  'simoes filho': 'SF',
  'feira de santana': 'FSA',
  'sao paulo': 'SP',
  'rio de janeiro': 'RJ',
  'belo horizonte': 'BH',
  'brasilia': 'BSB',
};

/**
 * Retorna a abreviação da cidade para exibição compacta no Kanban.
 * Não inclui a UF no retorno quando a cidade é encontrada/abreviada.
 */
export function abreviarCidade(cidade?: string | null, uf?: string | null): string {
  const cidTrim = (cidade || '').trim();
  const ufFormatada = (uf || '').trim().toUpperCase();

  // Se cidade vazia: retornar apenas UF em maiúsculas (se existir) ou ''
  if (!cidTrim) {
    return ufFormatada || '';
  }

  const cidNorm = normalizar(cidTrim);

  // 1. Consulta na lookup table
  if (CIDADE_LOOKUP[cidNorm]) {
    return CIDADE_LOOKUP[cidNorm];
  }

  // Tenta variações sem apóstrofo/com espaço
  const semApostrofoComEspaco = cidNorm.replace(/['’]/g, ' ').replace(/\s+/g, ' ');
  if (CIDADE_LOOKUP[semApostrofoComEspaco]) {
    return CIDADE_LOOKUP[semApostrofoComEspaco];
  }

  const semApostrofoJunto = cidNorm.replace(/['’]/g, '');
  if (CIDADE_LOOKUP[semApostrofoJunto]) {
    return CIDADE_LOOKUP[semApostrofoJunto];
  }

  // 2. Fallback: primeira letra de cada palavra (após trim), limitado a 3 caracteres, MAIÚSCULAS
  const palavras = cidTrim
    .split(/\s+/)
    .map((p) => p.replace(/^[^a-zA-Z0-9À-ÿ]+/, ''))
    .filter((p) => p.length > 0);

  const fallback = palavras
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

  if (fallback) {
    return fallback;
  }

  // 3. Se fallback não gerar nada, retornar UF em maiúsculas ou ''
  return ufFormatada || '';
}
