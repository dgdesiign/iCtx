import { Lead, Socio } from '../types/crm';

export function limparDigitos(valor: string | number | undefined | null): string {
  if (!valor) return '';
  return String(valor).replace(/\D/g, '');
}

export function limparCnpj(cnpjBruto: string | number | undefined | null): string {
  const digitos = limparDigitos(cnpjBruto);
  if (!digitos) return '';
  if (digitos.length === 13) return digitos.padStart(14, '0');
  if (digitos.length >= 14) return digitos.slice(0, 14);
  return digitos;
}

export function formatarCnpj(cnpj: string): string {
  const limpo = limparCnpj(cnpj);
  if (limpo.length !== 14) return cnpj;
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatarTelefone(telefone: string): string {
  const limpo = limparDigitos(telefone);
  if (limpo.length === 11) {
    return limpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (limpo.length === 10) {
    return limpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return telefone;
}

export function formatarNome(nome: string | undefined | null): string {
  if (!nome) return '';
  const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em']);
  const palavras = String(nome).trim().toLowerCase().split(/\s+/);
  const resultado = palavras.map((palavra, index) => {
    if (index > 0 && preposicoes.has(palavra)) return palavra;
    if (['ltda', 'me', 'epp', 's/a', 'sa', 'eireli', 'ss', 'pj', 'cpf', 'cnpj'].includes(palavra)) return palavra.toUpperCase();
    return palavra.charAt(0).toUpperCase() + palavra.slice(1);
  });
  return resultado.join(' ');
}

export interface AnaliseMeiResultado {
  isMeiOuDesenquadrado: boolean;
  nomeTitularExtraido: string;
  primeiroNomeTitular: string;
  empresaExibicao: string;
  empresaParaMensagem: string;
  nomeFantasiaValido: boolean;
  tipoIdentificado?: 'mei_pos_lgpd' | 'mei_pre_lgpd' | 'empresario_individual' | 'empresa_padrao';
}

export function analisarMeiRazaoSocial(
  razaoSocialBruta?: string,
  nomeFantasiaBruto?: string,
  naturezaJuridica?: string
): AnaliseMeiResultado {
  const razao = (razaoSocialBruta || '').trim();
  const fantasia = (nomeFantasiaBruto || '').trim();

  const fantasiaValida = fantasia.length > 2 && !['-', '.', 'null', 'undefined', 'nenhum', 'nao informado'].includes(fantasia.toLowerCase()) && !/^(\d{2}\.?\d{3}\.?\d{3}|\d{8}|\d{11}|\d{14})/.test(fantasia);

  const regexPrefixoNumerico = /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{0,4}-?\d{0,2}|\d{8,14})\s+(.+)$/i;
  const matchPrefixo = razao.match(regexPrefixoNumerico);

  const regexSufixoNumerico = /^([A-Za-zÀ-ÿ\s.'-]+?)\s+(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{8,14})$/i;
  const matchSufixo = razao.match(regexSufixoNumerico);

  const isNaturezaIndividual = (naturezaJuridica || '').includes('213-5') || (naturezaJuridica || '').toLowerCase().includes('empresário (individual)') || (naturezaJuridica || '').toLowerCase().includes('empresario individual');

  let isMeiOuDesenquadrado = false;
  let nomePessoa = '';
  let tipoIdentificado: AnaliseMeiResultado['tipoIdentificado'] = 'empresa_padrao';

  if (matchPrefixo) {
    isMeiOuDesenquadrado = true;
    nomePessoa = matchPrefixo[2].trim();
    tipoIdentificado = 'mei_pos_lgpd';
  } else if (matchSufixo) {
    isMeiOuDesenquadrado = true;
    nomePessoa = matchSufixo[1].trim();
    tipoIdentificado = 'mei_pre_lgpd';
  } else if (isNaturezaIndividual && razao.length > 0) {
    isMeiOuDesenquadrado = true;
    tipoIdentificado = 'empresario_individual';
    nomePessoa = razao.replace(/\s+(me|epp|ltda|eireli)$/i, '').trim();
  }

  if (nomePessoa) {
    nomePessoa = nomePessoa.replace(/\s+(me|epp|ltda|eireli|individual)$/i, '').trim();
  }

  const nomeTitularFormatado = formatarNome(nomePessoa);
  const primeiroNome = nomeTitularFormatado.split(' ')[0] || '';

  let empresaExibicao = '';
  let empresaParaMensagem = '';

  if (fantasiaValida) {
    empresaExibicao = formatarNome(fantasia);
    empresaParaMensagem = formatarNome(fantasia);
  } else if (isMeiOuDesenquadrado) {
    empresaExibicao = nomeTitularFormatado ? `${nomeTitularFormatado}` : formatarNome(razao);
    empresaParaMensagem = 'sua empresa';
  } else {
    empresaExibicao = formatarNome(razao) || 'Empresa';
    empresaParaMensagem = formatarNome(razao) || 'sua empresa';
  }

  return { isMeiOuDesenquadrado, nomeTitularExtraido: nomeTitularFormatado, primeiroNomeTitular: primeiroNome, empresaExibicao, empresaParaMensagem, nomeFantasiaValido: fantasiaValida, tipoIdentificado };
}

export function calcularIdadeEmpresa(dataAbertura?: string): { texto: string; anos: number } {
  if (!dataAbertura) return { texto: 'Data não informada', anos: 0 };
  try {
    const abertura = new Date(dataAbertura);
    if (isNaN(abertura.getTime())) return { texto: 'Não identificada', anos: 0 };
    const hoje = new Date();
    let anos = hoje.getFullYear() - abertura.getFullYear();
    let meses = hoje.getMonth() - abertura.getMonth();
    if (meses < 0) { anos--; meses += 12; }
    if (anos === 0) return { texto: `${meses} ${meses === 1 ? 'mês' : 'meses'}`, anos: 0 };
    if (meses === 0) return { texto: `${anos} ${anos === 1 ? 'ano' : 'anos'}`, anos };
    return { texto: `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`, anos };
  } catch {
    return { texto: 'Não identificada', anos: 0 };
  }
}

export interface CnpjApiResponse {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  data_inicio_atividade?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string; // Adicionado aqui
  email?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  capital_social?: number;
  natureza_juridica?: string;
  opcao_pelo_simei?: boolean;
  cnae_fiscal?: string | number;
  cnae_fiscal_descricao?: string;
  qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string; nome_rep_legal?: string; }>;
}

export async function consultarCnpj(cnpjInput: string): Promise<CnpjApiResponse | null> {
  const cnpjLimpo = limparCnpj(cnpjInput);
  if (cnpjLimpo.length !== 14) throw new Error('CNPJ inválido (deve conter 14 dígitos).');

  // Provedor 1: BrasilAPI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) return await response.json();
  } catch (err) {
    console.warn(`BrasilAPI falhou para CNPJ ${cnpjLimpo}, tentando fallback...`);
  }

  // Provedor 2: Minha Receita (Fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`https://minhareceita.org/${cnpjLimpo}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return {
        cnpj: cnpjLimpo,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        data_inicio_atividade: data.data_inicio_atividade,
        ddd_telefone_1: data.ddd_telefone_1 || data.telefone,
        ddd_telefone_2: data.ddd_telefone_2, // CORREÇÃO: Mapeando o segundo telefone
        email: data.email,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        capital_social: data.capital_social,
        natureza_juridica: data.natureza_juridica,
        opcao_pelo_simei: data.opcao_pelo_simei,
        cnae_fiscal: data.cnae_fiscal,
        cnae_fiscal_descricao: data.cnae_fiscal_descricao,
        qsa: (data.qsa || []).map((s: any) => ({ nome_socio: s.nome_socio || s.nome, qualificacao_socio: s.qualificacao_socio || s.qualificacao })),
      };
    }
  } catch (err) {
    console.warn(`Minha Receita falhou para CNPJ ${cnpjLimpo}`);
  }

  return null;
}

export function isTelefoneFalsoOuInvalido(numero: string | undefined | null): boolean {
  if (!numero) return true;
  const digitos = String(numero).replace(/\D/g, '');
  if (digitos.length !== 10 && digitos.length !== 11) return true;
  const ddd = digitos.slice(0, 2);
  const dddNum = Number(ddd);
  if (isNaN(dddNum) || dddNum < 11 || dddNum > 99) return true;
  const local = digitos.slice(2);
  if (/^(\d)\1+$/.test(local) || /^(\d)\1+$/.test(digitos)) return true;
  if (local.startsWith('0')) return true;
  if (['12345678', '123456789', '87654321', '987654321', '01234567'].includes(local)) return true;
  if (digitos.length === 11 && local.charAt(0) !== '9') return true;
  return false;
}

export function classificarESanitizarTelefones(candidatos: string[]): {
  telefonePrincipal: string;
  telefonePrincipalFormatado: string;
  telefoneSecundario?: string;
  telefoneSecundarioFormatado?: string;
} {
  const telefonesValidos: { digitos: string; isMovel: boolean }[] = [];
  const jaVistos = new Set<string>();

  for (const item of candidatos) {
    if (!item) continue;
    const subItens = item.split(/[,;\/|]+/);
    for (const sub of subItens) {
      const digitos = limparDigitos(sub);
      if (!digitos || jaVistos.has(digitos)) continue;
      if (isTelefoneFalsoOuInvalido(digitos)) continue;
      jaVistos.add(digitos);
      const isMovel = digitos.length === 11 && digitos.charAt(2) === '9';
      telefonesValidos.push({ digitos, isMovel });
    }
  }

  if (telefonesValidos.length === 0) return { telefonePrincipal: '', telefonePrincipalFormatado: '' };

  const celulares = telefonesValidos.filter((t) => t.isMovel);
  const fixosOuOutros = telefonesValidos.filter((t) => !t.isMovel);

  let principal = '';
  let secundario = '';

  if (celulares.length > 0) {
    principal = celulares[0].digitos;
    if (celulares.length > 1) secundario = celulares[1].digitos;
    else if (fixosOuOutros.length > 0) secundario = fixosOuOutros[0].digitos;
  } else {
    principal = fixosOuOutros[0].digitos;
    if (fixosOuOutros.length > 1) secundario = fixosOuOutros[1].digitos;
  }

  return {
    telefonePrincipal: principal,
    telefonePrincipalFormatado: formatarTelefone(principal),
    telefoneSecundario: secundario || undefined,
    telefoneSecundarioFormatado: secundario ? formatarTelefone(secundario) : undefined,
  };
}

// ... O restante do arquivo (extrairTokensInteligente, recomendarAbordagemComercial, construirLead, autocorrigeLead) continua igual ...
// Para não inflar a mensagem, eu recomendo você trocar APENAS as funções `consultarCnpj` e a interface `CnpjApiResponse` acima.
