/**
 * Utilitários para validação e formatação de números de telefone celular brasileiros.
 */

/**
 * Retorna true apenas se, após remover não-dígitos, o resultado tiver exatamente 11 dígitos
 * E o 3º dígito (índice 2) for '9'. Qualquer outro caso retorna false.
 */
export function ehCelularBR(tel?: string | null): boolean {
  if (!tel) return false;
  const digitos = tel.replace(/\D/g, '');
  return digitos.length === 11 && digitos[2] === '9';
}

/**
 * Se ehCelularBR(tel) for false, retorna ''.
 * Caso contrário, formata como "(DD) 9XXXX-XXXX" (com espaço após o parêntese de fechamento).
 * Exemplo: "71999999999" → "(71) 99999-9999".
 */
export function formatarCelularBR(tel?: string | null): string {
  if (!ehCelularBR(tel)) return '';
  const d = (tel ?? '').replace(/\D/g, '');
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}
