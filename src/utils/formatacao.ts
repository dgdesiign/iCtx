// src/utils/formatacao.ts

// Preposições que ficam minúsculas (de, da, do, das, dos, e)
const PREPOSICOES = ['de', 'da', 'do', 'das', 'dos', 'e'];

/**
 * Formata nomes de PESSOAS: "JAMYNE RIBEIRO DE SOUZA" -> "Jamyne Souza"
 * Mantém apenas o primeiro e o último nome.
 */
export function formatarNomePessoa(nomeCompleto: string): string {
  if (!nomeCompleto) return '';
  
  const limpo = nomeCompleto.trim().replace(/\s+/g, ' ');
  const partes = limpo.split(' ').filter(p => p.length > 0);
  
  if (partes.length === 0) return '';

  const formatarPalavra = (p: string) => {
    const minuscula = p.toLowerCase();
    if (PREPOSICOES.includes(minuscula)) return minuscula;
    return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
  };

  if (partes.length === 1) return formatarPalavra(partes[0]);

  const primeiro = formatarPalavra(partes[0]);
  const ultimo = formatarPalavra(partes[partes.length - 1]);

  return `${primeiro} ${ultimo}`;
}

/**
 * Formata nomes de EMPRESAS: "RESTAURANTE SOBERANA ILHA" -> "Restaurante Soberana..."
 * Capitaliza as palavras e, se for muito longo, corta com reticências.
 */
export function formatarNomeEmpresa(nome: string, maxLength: number = 22): string {
  if (!nome) return '';
  
  const limpo = nome.trim().replace(/\s+/g, ' ');
  
  const formatado = limpo
    .split(' ')
    .map(p => {
      const minuscula = p.toLowerCase();
      if (PREPOSICOES.includes(minuscula)) return minuscula;
      return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
    })
    .join(' ');

  if (formatado.length > maxLength) {
    return formatado.substring(0, maxLength).trim() + '...';
  }

  return formatado;
}
