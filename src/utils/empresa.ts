/**
 * Utilitário para abreviação de nome de empresa para MEI+ no iCtx CRM.
 */

const PREPOSICOES_CORTE = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Quando o lead for MEI+ (porte 'MEI Desenq.' ou 'MEI+'), abrevia o nome da empresa:
 * mantém apenas as 2 primeiras palavras, cortando preposições (de/da/do/das/dos/e).
 *
 * @param empresa Nome da empresa / razão social / nome fantasia
 * @param porte Porte da empresa (ex: 'MEI Desenq.', 'MEI+', 'MEI', 'PJ')
 * @returns Nome abreviado conforme regras, ou empresa original
 */
export function abreviarEmpresaMEI(empresa?: string | null, porte?: string | null): string {
  if (!empresa) {
    return '';
  }

  // Regra a: Se porte não for 'MEI Desenq.' nem 'MEI+', retornar empresa como está
  if (porte !== 'MEI Desenq.' && porte !== 'MEI+') {
    return empresa;
  }

  const trimmed = empresa.trim();
  if (!trimmed) {
    return '';
  }

  // Regra d: Separar em palavras por whitespace
  const palavras = trimmed.split(/\s+/).filter(Boolean);

  // Regra c: Se empresa tiver 1 palavra: retornar como está
  if (palavras.length <= 1) {
    return empresa;
  }

  const segundaPalavraLower = palavras[1].toLowerCase();

  // Regra f: Se a SEGUNDA palavra for preposição, retornar apenas a primeira
  // Ex: "Maria dos Santos" → "Maria"
  if (PREPOSICOES_CORTE.has(segundaPalavraLower)) {
    return palavras[0];
  }

  // Regra g: Caso contrário, retornar as 2 primeiras palavras unidas por espaço
  // Ex: "Ana Claudia de Freitas" → "Ana Claudia"
  return `${palavras[0]} ${palavras[1]}`;
}
