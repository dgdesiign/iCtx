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

  const fantasiaValida =
    fantasia.length > 2 &&
    !['-', '.', 'null', 'undefined', 'nenhum', 'nao informado'].includes(fantasia.toLowerCase()) &&
    !/^(\d{2}\.?\d{3}\.?\d{3}|\d{8}|\d{11}|\d{14})/.test(fantasia);

  const regexPrefixoNumerico = /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{0,4}-?\d{0,2}|\d{8,14})\s+(.+)$/i;
  const matchPrefixo = razao.match(regexPrefixoNumerico);

  const regexSufixoNumerico = /^([A-Za-zÀ-ÿ\s.'-]+?)\s+(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{8,14})$/i;
  const matchSufixo = razao.match(regexSufixoNumerico);

  const isNaturezaIndividual =
    (naturezaJuridica || '').includes('213-5') ||
    (naturezaJuridica || '').toLowerCase().includes('empresário (individual)') ||
    (naturezaJuridica || '').toLowerCase().includes('empresario individual');

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

  return {
    isMeiOuDesenquadrado,
    nomeTitularExtraido: nomeTitularFormatado,
    primeiroNomeTitular: primeiroNome,
    empresaExibicao,
    empresaParaMensagem,
    nomeFantasiaValido: fantasiaValida,
    tipoIdentificado,
  };
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
    return {
      texto: `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`,
      anos,
    };
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
  ddd_telefone_2?: string;
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
  qsa?: Array<{
    nome_socio?: string;
    qualificacao_socio?: string;
    nome_rep_legal?: string;
  }>;
}

export async function consultarCnpj(cnpjInput: string): Promise<CnpjApiResponse | null> {
  const cnpjLimpo = limparCnpj(cnpjInput);
  if (cnpjLimpo.length !== 14) {
    throw new Error('CNPJ inválido (deve conter 14 dígitos).');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn(`BrasilAPI falhou para CNPJ ${cnpjLimpo}, tentando fallback...`, err);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`https://minhareceita.org/${cnpjLimpo}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return {
        cnpj: cnpjLimpo,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        data_inicio_atividade: data.data_inicio_atividade,
        ddd_telefone_1: data.ddd_telefone_1 || data.telefone,
        ddd_telefone_2: data.ddd_telefone_2,
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
        qsa: (data.qsa || []).map((s: any) => ({
          nome_socio: s.nome_socio || s.nome,
          qualificacao_socio: s.qualificacao_socio || s.qualificacao,
        })),
      };
    }
  } catch (err) {
    console.warn(`Minha Receita falhou para CNPJ ${cnpjLimpo}`, err);
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

  if (telefonesValidos.length === 0) {
    return { telefonePrincipal: '', telefonePrincipalFormatado: '' };
  }

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

export function extrairTokensInteligente(linhaBruta: string): {
  cnpjBruto: string;
  cnpjLimpo: string;
  telefoneBruto: string;
  telefoneLimpo: string;
  telefoneSecundarioBruto?: string;
  telefoneSecundarioLimpo?: string;
  nomeBruto: string;
  nomeContatoLimpo: string;
  isMeiDetectado: boolean;
  valido: boolean;
} {
  const trimmed = linhaBruta.trim();
  if (!trimmed) {
    return {
      cnpjBruto: '', cnpjLimpo: '', telefoneBruto: '', telefoneLimpo: '',
      nomeBruto: '', nomeContatoLimpo: '', isMeiDetectado: false, valido: false,
    };
  }

  let partes: string[] = [];
  if (trimmed.includes('\t')) {
    partes = trimmed.split('\t').map((p) => p.trim()).filter(Boolean);
  } else if (trimmed.includes(';') || trimmed.includes(',')) {
    partes = trimmed.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
  } else {
    partes = trimmed.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (partes.length < 2) partes = trimmed.split(/\s+/).map((p) => p.trim()).filter(Boolean);
  }

  let cnpjEncontrado = '';
  let cnpjLimpoEncontrado = '';
  const telefonesCandidatos: string[] = [];
  const nomesCandidatos: string[] = [];

  const regexMascaraCnpj = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;

  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    const digitos = limparDigitos(parte);
    if (regexMascaraCnpj.test(parte) || digitos.length === 14 || (digitos.length === 13 && !['7', '8', '9'].includes(parte.charAt(0)))) {
      if (!cnpjEncontrado) {
        cnpjEncontrado = parte;
        cnpjLimpoEncontrado = limparCnpj(digitos);
        continue;
      }
    }
  }

  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    if (parte === cnpjEncontrado) continue;
    if (/[\d\s().+-]+[,;\/|]+[\d\s().+-]+/.test(parte)) { telefonesCandidatos.push(parte); continue; }
    const digitos = limparDigitos(parte);
    const ddd = digitos.slice(0, 2);
    const dddValido = Number(ddd) >= 11 && Number(ddd) <= 99;
    const isTelefone = (digitos.length === 10 || digitos.length === 11) && dddValido && !parte.includes('/');
    if (isTelefone) { telefonesCandidatos.push(parte); continue; }
    if (/[A-Za-zÀ-ÿ]/.test(parte)) { nomesCandidatos.push(parte); continue; }
    if (digitos.length === 10 || digitos.length === 11) telefonesCandidatos.push(parte);
  }

  const telefonesProcessados = classificarESanitizarTelefones(telefonesCandidatos);

  let nomeCompleto = nomesCandidatos.join(' ').trim();
  let nomeContatoLimpo = nomeCompleto;
  let isMeiDetectado = false;

  const matchPrefixo = nomeCompleto.match(/^(\d{2}\.?\d{3}\.?\d{3}\/?\d{0,4}-?\d{0,2}|\d{8,14})\s+(.+)$/i);
  if (matchPrefixo) { isMeiDetectado = true; nomeContatoLimpo = matchPrefixo[2].trim(); }

  const matchSufixo = nomeContatoLimpo.match(/^([A-Za-zÀ-ÿ\s.'-]+?)\s+(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})$/i);
  if (matchSufixo) { isMeiDetectado = true; nomeContatoLimpo = matchSufixo[1].trim(); }

  return {
    cnpjBruto: cnpjEncontrado,
    cnpjLimpo: cnpjLimpoEncontrado,
    telefoneBruto: telefonesProcessados.telefonePrincipal,
    telefoneLimpo: telefonesProcessados.telefonePrincipal,
    telefoneSecundarioBruto: telefonesProcessados.telefoneSecundario,
    telefoneSecundarioLimpo: telefonesProcessados.telefoneSecundario,
    nomeBruto: nomeCompleto,
    nomeContatoLimpo: formatarNome(nomeContatoLimpo),
    isMeiDetectado,
    valido: cnpjLimpoEncontrado.length === 14 && telefonesProcessados.telefonePrincipal.length >= 10,
  };
}

export function recomendarAbordagemComercial(
  dados: CnpjApiResponse | null,
  idadeAnos: number
): { produto: string; templateId: string } {
  if (!dados) {
    return { produto: 'Pronampe / Capital de Giro', templateId: 'pronampe_capital' };
  }

  const cnaeDesc = (dados.cnae_fiscal_descricao || '').toLowerCase();
  const isVarejo = /comércio|varejista|varejo|loja|vestuário|mercado|alimento|restaurante|bar|padaria|drogaria|farmácia|beleza|ótica/i.test(cnaeDesc);

  if (idadeAnos <= 2 && idadeAnos >= 0) {
    return { produto: 'Conta PJ Isenta & Cartão', templateId: 'isencao_novas_empresas' };
  }

  if (isVarejo) {
    return { produto: 'Link de Pagamento Gratuito', templateId: 'link_pagamento_varejo' };
  }

  return { produto: 'Pronampe / Capital de Giro', templateId: 'pronampe_capital' };
}

export function construirLead(
  telefoneBruto: string,
  nomeContatoBruto: string,
  cnpjBruto: string,
  dadosApi: CnpjApiResponse | null,
  telefoneSecundarioBruto?: string
): Lead {
  const cnpjLimpo = limparCnpj(cnpjBruto);

  const telefonesTratados = classificarESanitizarTelefones([
    telefoneBruto,
    telefoneSecundarioBruto || '',
    dadosApi?.ddd_telefone_1 || '',
    dadosApi?.ddd_telefone_2 || '',
  ]);

  const telPrincipal = telefonesTratados.telefonePrincipal || limparDigitos(telefoneBruto);
  const telSecundario = telefonesTratados.telefoneSecundario;

  const analiseMei = analisarMeiRazaoSocial(
    dadosApi?.razao_social,
    dadosApi?.nome_fantasia,
    dadosApi?.natureza_juridica
  );

  let nomeTratado = (nomeContatoBruto || '').trim();
  const matchPrefixo = nomeTratado.match(/^(\d{2}\.?\d{3}\.?\d{3}\/?\d{0,4}-?\d{0,2}|\d{8,14})\s+(.+)$/i);
  if (matchPrefixo) nomeTratado = matchPrefixo[2].trim();
  const matchSufixo = nomeTratado.match(/^([A-Za-zÀ-ÿ\s.'-]+?)\s+(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})$/i);
  if (matchSufixo) nomeTratado = matchSufixo[1].trim();

  let nomeFormatado = formatarNome(nomeTratado);
  const nomeEUmNumero = !nomeFormatado || /^[\d\s().+-]+$/.test(nomeFormatado);

  if (nomeEUmNumero) {
    if (analiseMei.nomeTitularExtraido) {
      nomeFormatado = analiseMei.nomeTitularExtraido;
    } else if (dadosApi?.qsa && dadosApi.qsa.length > 0 && dadosApi.qsa[0].nome_socio) {
      nomeFormatado = formatarNome(dadosApi.qsa[0].nome_socio);
    } else {
      nomeFormatado = 'Cliente';
    }
  }

  const idadeInfo = calcularIdadeEmpresa(dadosApi?.data_inicio_atividade);
  const recomendacao = recomendarAbordagemComercial(dadosApi, idadeInfo.anos);

  const socios: Socio[] = (dadosApi?.qsa || []).map((s) => ({
    nome: formatarNome(s.nome_socio || s.nome_rep_legal || 'Sócio'),
    qualificacao: s.qualificacao_socio || 'Sócio-Administrador',
  }));

  if (socios.length === 0 && analiseMei.nomeTitularExtraido) {
    socios.push({ nome: analiseMei.nomeTitularExtraido, qualificacao: 'Titular / Empresário Individual' });
  }

  const isMeiFinal = Boolean(dadosApi?.opcao_pelo_simei || analiseMei.isMeiOuDesenquadrado || Boolean(matchPrefixo || matchSufixo));
  const empresaMsg = isMeiFinal && !analiseMei.nomeFantasiaValido ? 'sua empresa' : analiseMei.empresaParaMensagem;
  const agora = new Date().toISOString();

  return {
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    cnpj: cnpjLimpo,
    cnpjFormatado: formatarCnpj(cnpjLimpo),
    nomeContato: nomeFormatado,
    telefonePrincipal: telPrincipal,
    telefonePrincipalFormatado: formatarTelefone(telPrincipal),
    telefoneSecundario: telSecundario,
    telefoneSecundarioFormatado: telSecundario ? formatarTelefone(telSecundario) : undefined,
    razaoSocial: formatarNome(dadosApi?.razao_social || ''),
    nomeFantasia: formatarNome(dadosApi?.nome_fantasia || ''),
    empresaExibicao: analiseMei.empresaExibicao,
    empresaParaMensagem: empresaMsg,
    isMeiDesenquadrado: isMeiFinal,
    nomeTitular: analiseMei.nomeTitularExtraido || nomeFormatado,
    dataCompletaReceita: dadosApi || undefined,
    cnpjInicio: dadosApi?.data_inicio_atividade,
    dataAbertura: undefined,
    idadeEmpresa: idadeInfo.texto,
    idadeAnos: idadeInfo.anos,
    cnaeCodigo: String(dadosApi?.cnae_fiscal || ''),
    cnaeDescricao: dadosApi?.cnae_fiscal_descricao || '',
    naturezaJuridica: dadosApi?.natureza_juridica || '',
    isMei: dadosApi?.opcao_pelo_simei ?? isMeiFinal,
    capitalSocial: dadosApi?.capital_social,
    email: dadosApi?.email,
    logradouro: dadosApi?.logradouro,
    numero: dadosApi?.numero,
    complemento: dadosApi?.complemento,
    bairro: dadosApi?.bairro,
    municipio: dadosApi?.municipio,
    uf: dadosApi?.uf,
    cep: dadosApi?.cep,
    socios,
    status: 'novo',
    produtoSugerido: recomendacao.produto,
    templateId: recomendacao.templateId,
    criadoEm: agora,
    atualizadoEm: agora,
    historicoContatos: [],
  };
}

export function autocorrigeLead(lead: Lead): Lead {
  let modificado = false;
  let novoTel = lead.telefonePrincipal || '';
  let novoTelSec = lead.telefoneSecundario || '';
  let novoNome = lead.nomeContato || '';
  let sociosAtualizados = [...(lead.socios || [])];
  let novoCnpjInicio = lead.cnpjInicio;

  if (lead.dataAbertura && !lead.cnpjInicio && lead.status !== 'fechado') {
    novoCnpjInicio = lead.dataAbertura;
    modificado = true;
  }

  const telefonesReorganizados = classificarESanitizarTelefones([novoTel, novoTelSec]);
  if (telefonesReorganizados.telefonePrincipal && telefonesReorganizados.telefonePrincipal !== novoTel) {
    novoTel = telefonesReorganizados.telefonePrincipal;
    modificado = true;
  }
  if (telefonesReorganizados.telefoneSecundario !== novoTelSec) {
    novoTelSec = telefonesReorganizados.telefoneSecundario || '';
    modificado = true;
  }

  const digitosNome = limparDigitos(novoNome);
  const nomeEUmTelefone = digitosNome.length >= 10 && digitosNome.length <= 11;
  const telInvalido = isTelefoneFalsoOuInvalido(novoTel);

  if (nomeEUmTelefone) {
    if (telInvalido) {
      novoTel = digitosNome;
      novoNome = '';
      modificado = true;
    } else if (novoTel !== digitosNome && !novoTelSec) {
      novoTelSec = digitosNome;
      novoNome = '';
      modificado = true;
    }
  }

  const matchPrefixo = novoNome.match(/^(\d{2}\.?\d{3}\.?\d{3}\/?\d{0,4}-?\d{0,2}|\d{8,14})\s+(.+)$/i);
  if (matchPrefixo) { novoNome = matchPrefixo[2].trim(); modificado = true; }
  const matchSufixo = novoNome.match(/^([A-Za-zÀ-ÿ\s.'-]+?)\s+(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})$/i);
  if (matchSufixo) { novoNome = matchSufixo[1].trim(); modificado = true; }

  const analise = analisarMeiRazaoSocial(lead.razaoSocial, lead.nomeFantasia, lead.naturezaJuridica);

  const nomePrecisaAjuste =
    !novoNome ||
    /^[\d\s().+-]+$/.test(novoNome) ||
    novoNome.toLowerCase().includes('consultar') ||
    novoNome.toLowerCase() === 'cliente' ||
    novoNome.toLowerCase() === lead.razaoSocial.toLowerCase();

  if (nomePrecisaAjuste) {
    if (analise.nomeTitularExtraido) {
      novoNome = analise.nomeTitularExtraido;
      modificado = true;
    } else if (sociosAtualizados.length > 0 && sociosAtualizados[0].nome) {
      novoNome = sociosAtualizados[0].nome;
      modificado = true;
    } else {
      novoNome = 'Responsável';
    }
  }

  if (sociosAtualizados.length === 0 && analise.nomeTitularExtraido) {
    sociosAtualizados = [{ nome: analise.nomeTitularExtraido, qualificacao: 'Titular / Sócio-Administrador' }];
    modificado = true;
  }

  const isMeiFinal = Boolean(lead.isMeiDesenquadrado || analise.isMeiOuDesenquadrado || matchPrefixo || matchSufixo);
  const empresaMsg = isMeiFinal && !analise.nomeFantasiaValido ? 'sua empresa' : (analise.empresaParaMensagem || lead.empresaParaMensagem || 'sua empresa');

  if (empresaMsg !== lead.empresaParaMensagem) modificado = true;

  if (!modificado && novoTel === lead.telefonePrincipal && novoNome === lead.nomeContato && novoTelSec === (lead.telefoneSecundario || '')) {
    return lead;
  }

  return {
    ...lead,
    telefonePrincipal: novoTel,
    telefonePrincipalFormatado: formatarTelefone(novoTel),
    telefoneSecundario: novoTelSec || undefined,
    telefoneSecundarioFormatado: novoTelSec ? formatarTelefone(novoTelSec) : undefined,
    nomeContato: formatarNome(novoNome),
    empresaExibicao: analise.empresaExibicao || lead.empresaExibicao,
    empresaParaMensagem: empresaMsg,
    isMeiDesenquadrado: isMeiFinal,
    nomeTitular: analise.nomeTitularExtraido || novoNome,
    socios: sociosAtualizados,
    cnpjInicio: novoCnpjInicio,
  };
}
