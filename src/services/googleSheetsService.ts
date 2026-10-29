import { Lead, ContatoLog } from '../types/crm';
import { autocorrigeLead } from './cnpjService';
import { isSampleLeadId } from '../utils/syncMerge';

const SPREADSHEET_TITLE = 'iCtx - Base de Leads PJ';

export interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
  created: boolean;
}

const LEADS_HEADER = [
  'ID do Lead',
  'CNPJ',
  'Razão Social',
  'Nome Fantasia',
  'Contato / Responsável',
  'Telefone Principal',
  'Telefone Secundário',
  'Etapa do Funil',
  'Idade da Empresa',
  'CNAE / Segmento',
  'Município / UF',
  'Sócios e Administradores (QSA)',
  'Produto Sugerido',
  'Último Contato',
  'Anotações e Observações',
  'Porte / MEI',
  'Última Atualização',
  'Dados Completos (JSON)',
];

const HISTORICO_HEADER = [
  'Data e Hora',
  'CNPJ',
  'Empresa',
  'Contato',
  'Canal',
  'Template / Assunto',
  'Mensagem / Observação',
];

/**
 * Localiza ou cria a planilha "iCtx - Base de Leads PJ" no Google Drive do usuário
 */
export async function findOrCreateSpreadsheet(accessToken: string): Promise<SpreadsheetInfo> {
  // 1. Pesquisa se a planilha já existe no Google Drive
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.spreadsheet' and name = '${SPREADSHEET_TITLE}' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    console.error('Erro ao pesquisar planilha no Drive:', errorText);
    throw new Error(`Falha ao acessar o Google Drive: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const file = searchData.files[0];
    return {
      id: file.id,
      name: file.name,
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
      created: false,
    };
  }

  // 2. Se não existir, cria a nova planilha no Google Sheets com as duas abas
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: 'Leads',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'HistoricoContatos',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error('Erro ao criar planilha no Sheets:', errorText);
    throw new Error(`Falha ao criar planilha: ${createRes.statusText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const webViewLink =
    createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 3. Escreve os cabeçalhos profissionais nas abas
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Leads!A1:R1',
            values: [LEADS_HEADER],
          },
          {
            range: 'HistoricoContatos!A1:G1',
            values: [HISTORICO_HEADER],
          },
        ],
      }),
    }
  );

  return {
    id: spreadsheetId,
    name: SPREADSHEET_TITLE,
    url: webViewLink,
    created: true,
  };
}

/**
 * Carrega todos os leads da planilha do Google Sheets
 */
export async function fetchLeadsFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<Lead[]> {
  let res: Response;
  try {
    res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A2:R`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  } catch (err: any) {
    throw err;
  }

  if (res.status === 401) {
    throw new Error('TOKEN_EXPIRADO');
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Erro ao ler Leads da planilha:', errorText);
    throw new Error(`Falha ao ler dados da planilha: ${res.statusText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  const leads: Lead[] = [];

  for (const row of rows) {
    // Coluna 17 (R) guarda o JSON completo serializado
    const rawJson = row[17];
    if (rawJson && typeof rawJson === 'string' && rawJson.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed.cnpj) {
          leads.push(autocorrigeLead(parsed));
          continue;
        }
      } catch (err) {
        // Fallback para mapeamento de colunas caso o json tenha sido corrompido
      }
    }

    // Mapeamento manual das colunas A - Q se não houver JSON
    if (row[1]) {
      const cnpjLimpo = String(row[1]).replace(/\D/g, '');
      const leadParcial: Lead = {
        id: row[0] || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        cnpj: cnpjLimpo,
        cnpjFormatado: row[1],
        razaoSocial: row[2] || '',
        nomeFantasia: row[3] || '',
        empresaExibicao: row[3] || row[2] || 'Empresa',
        nomeContato: row[4] || '',
        telefonePrincipal: String(row[5] || '').replace(/\D/g, ''),
        telefonePrincipalFormatado: row[5] || '',
        telefoneSecundario: row[6] ? String(row[6]).replace(/\D/g, '') : undefined,
        telefoneSecundarioFormatado: row[6] || undefined,
        status: (row[7] as any) || 'novo',
        idadeEmpresa: row[8] || '',
        cnaeDescricao: row[9] || '',
        municipio: row[10] ? row[10].split('/')[0] : '',
        uf: row[10] && row[10].includes('/') ? row[10].split('/')[1] : '',
        socios: [],
        produtoSugerido: row[12] || '💰 Pronampe / Capital de Giro',
        ultimoContatoEm: row[13] || undefined,
        notas: row[14] || '',
        criadoEm: new Date().toISOString(),
        atualizadoEm: row[16] || new Date().toISOString(),
        historicoContatos: [],
      };
      leads.push(autocorrigeLead(leadParcial));
    }
  }

  return leads.filter((l) => !isSampleLeadId(l.id));
}

/**
 * Salva a lista completa de leads na planilha de forma não-destrutiva.
 * Escreve diretamente a faixa A2:R(n+1) e limpa apenas as linhas excedentes abaixo de n+1.
 * Nunca deixa a planilha vazia em momento intermediário.
 */
export async function saveAllLeadsToSheet(
  spreadsheetId: string,
  leads: Lead[],
  accessToken: string
): Promise<void> {
  const leadsValidos = leads.filter((l) => l && l.id && !isSampleLeadId(l.id));

  // Caso não haja leads válidos, limpa o corpo de dados
  if (leadsValidos.length === 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A2:R:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return;
  }

  // 1. Prepara as linhas para inserção
  const rows = leadsValidos.map((lead) => {
    const sociosFormatados = (lead.socios || [])
      .map((s) => `${s.nome} (${s.qualificacao})`)
      .join(' | ');

    const porte = lead.isMeiDesenquadrado
      ? 'MEI Desenquadrado'
      : lead.isMei
      ? 'MEI'
      : 'Geral / Não MEI';

    return [
      lead.id,
      lead.cnpjFormatado || lead.cnpj,
      lead.razaoSocial || '',
      lead.nomeFantasia || '',
      lead.nomeContato || '',
      lead.telefonePrincipalFormatado || lead.telefonePrincipal,
      lead.telefoneSecundarioFormatado || lead.telefoneSecundario || '',
      lead.status,
      lead.idadeEmpresa || '',
      lead.cnaeCodigo ? `${lead.cnaeCodigo} - ${lead.cnaeDescricao || ''}` : lead.cnaeDescricao || '',
      lead.municipio ? `${lead.municipio}${lead.uf ? `/${lead.uf}` : ''}` : '',
      sociosFormatados,
      lead.produtoSugerido || '',
      lead.ultimoContatoEm || '',
      lead.notas || '',
      porte,
      lead.atualizadoEm || new Date().toISOString(),
      JSON.stringify(lead),
    ];
  });

  const rowFinal = rows.length + 1; // Linha 1 é cabeçalho; dados vão de A2 até R(rowFinal)

  // 2. Escreve diretamente no intervalo A2:R(rowFinal) sem apagar a planilha antes
  let updateRes: Response;
  try {
    updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A2:R${rowFinal}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );
  } catch (err: any) {
    throw err;
  }

  if (updateRes.status === 401) {
    throw new Error('TOKEN_EXPIRADO');
  }

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    console.error('Erro ao salvar Leads na planilha:', errorText);
    throw new Error(`Falha ao sincronizar leads na planilha: ${updateRes.statusText}`);
  }

  // 3. Limpa APENAS as linhas excedentes abaixo de rowFinal (caso o lote anterior tivesse mais linhas)
  try {
    const linhaExcedenteInicio = rowFinal + 1;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A${linhaExcedenteInicio}:R:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (err) {
    console.warn('Aviso ao limpar linhas excedentes na planilha:', err);
  }
}

/**
 * Adiciona um registro na aba HistoricoContatos da planilha
 */
export async function appendContactLogToSheet(
  spreadsheetId: string,
  log: ContatoLog,
  lead: Lead,
  accessToken: string
): Promise<void> {
  const row = [
    new Date(log.dataHora).toLocaleString('pt-BR'),
    lead.cnpjFormatado || lead.cnpj,
    lead.empresaExibicao || lead.razaoSocial,
    lead.nomeContato || 'Titular',
    log.tipo === 'whatsapp' ? 'WhatsApp' : log.tipo === 'ligacao' ? 'Ligação Telefônica' : log.tipo,
    log.templateTitulo || 'Abordagem Comercial',
    log.mensagemEnviada || log.observacao || '',
  ];

  let appendRes: Response;
  try {
    appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/HistoricoContatos!A:G:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );
  } catch (err: any) {
    throw err;
  }

  if (appendRes.status === 401) {
    throw new Error('TOKEN_EXPIRADO');
  }

  if (!appendRes.ok) {
    const errorText = await appendRes.text();
    console.error('Erro ao registrar histórico no Sheets:', errorText);
    throw new Error(`Falha ao adicionar log de contato: ${appendRes.statusText}`);
  }
}

export const APPS_SCRIPT_SNIPPET = `function enviarResumoDiario() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaLeads = ss.getSheetByName("Leads");
  if (!abaLeads) return;

  var rows = abaLeads.getDataRange().getValues();
  if (rows.length < 2) return;

  var agora = new Date();
  var hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  var amanha = new Date(hoje.getTime() + 86400000);
  var mesAtual = Utilities.formatDate(agora, Session.getScriptTimeZone(), "yyyy-MM");

  var leads = [];
  for (var i = 1; i < rows.length; i++) {
    var jsonStr = rows[i][17];
    if (!jsonStr || typeof jsonStr !== "string") continue;
    try {
      var l = JSON.parse(jsonStr);
      if (l && l.id) leads.push(l);
    } catch(e) {}
  }

  // ============ HELPERS (espelho de pontos.ts/ativacao.ts) ============
  function dataLocalISO(d) {
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var dd = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + dd;
  }
  function mesRef(iso) {
    if (!iso) return "";
    return String(iso).slice(0, 7);
  }
  function maisDeUmAno(l) {
    if (!l.cnpjInicio) return false;
    return String(l.cnpjInicio).slice(0, 4) <= String(agora.getFullYear() - 1);
  }
  function elegivel(l) {
    var p = String(l.porte || "").toUpperCase();
    if (p === "MEI") return false;
    if (l.isMei === true && l.isMeiDesenquadrado !== true) return false;
    return true;
  }
  function pontosProduto(l, produto, mesAlvo) {
    if (!elegivel(l)) return 0;
    var p = { conta: l.vendeuConta !== false, maquina: l.vendeuMaquina !== false };
    if (produto === "conta" && !p.conta) return 0;
    if (produto === "getnet" && !p.maquina) return 0;
    var dataAtiv = produto === "conta" ? l.contaAtivaEm : l.maquinaAtivaEm;
    if (!dataAtiv) return 0;
    var mesAb = mesRef(l.dataAbertura);
    if (!mesAb) return 0;
    var mesAtiv = mesRef(dataAtiv);
    var mesM0 = mesAb;
    var mesM1 = proximoMes(mesAb, 1);
    var mesM2 = proximoMes(mesAb, 2);
    var mais = maisDeUmAno(l);
    var tab = produto === "conta"
      ? { m01: { menos1ano: 2, mais1ano: 4 }, m2: { menos1ano: 1, mais1ano: 2 } }
      : { m01: { menos1ano: 4, mais1ano: 6 }, m2: { menos1ano: 2, mais1ano: 3 } };
    if (mesAtiv === mesM0 || mesAtiv === mesM1) {
      if (mesAlvo === mesAtiv) return mais ? tab.m01.mais1ano : tab.m01.menos1ano;
      if (mesAlvo === mesM2) {
        var enc = produto === "conta" ? l.contaEncerradaEm : l.maquinaEncerradaEm;
        if (enc && mesRef(enc) <= mesM2) return 0;
        return Math.floor(mais ? tab.m2.mais1ano : tab.m2.menos1ano);
      }
      return 0;
    }
    if (mesAtiv === mesM2 && mesAlvo === mesM2) {
      return Math.floor(mais ? tab.m2.mais1ano : tab.m2.menos1ano);
    }
    return 0;
  }
  function proximoMes(mes, n) {
    var parts = mes.split("-");
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
    var d = new Date(y, m - 1 + n, 1);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
  }
  function pontosFit(l, mesAlvo) {
    if (!elegivel(l) || !l.fitContratadoEm) return 0;
    return mesRef(l.fitContratadoEm) === mesAlvo ? 1 : 0;
  }

  // ============ CÁLCULOS DO DIA ============
  var totalLeads = leads.length;
  var leadsFaladosHoje = 0;
  var templatesUsados = {};
  var fechadosHoje = 0;
  var oportunidadesAmanha = [];
  var oportunidadesHoje = [];
  var travados = [];
  var emNegociacao = [];
  var ativos = [];
  var fechadosNaoAtivos = [];

  leads.forEach(function(l) {
    var contatosHoje = (l.historicoContatos || []).filter(function(c) {
      if (!c.dataHora) return false;
      var d = new Date(c.dataHora);
      return d >= hoje && d < amanha;
    });
    if (contatosHoje.length > 0) {
      leadsFaladosHoje++;
      contatosHoje.forEach(function(c) {
        if (c.templateTitulo) {
          templatesUsados[c.templateTitulo] = (templatesUsados[c.templateTitulo] || 0) + 1;
        }
      });
    }

    if (l.proximoFollowUp) {
      var dFU = new Date(l.proximoFollowUp);
      if (dFU >= hoje && dFU < amanha) oportunidadesHoje.push(l);
      if (dFU >= amanha && dFU < new Date(amanha.getTime() + 86400000)) oportunidadesAmanha.push(l);
    }

    if (l.status === "fechado") {
      var refData = l.dataUltimoContato || l.atualizadoEm;
      if (refData) {
        var dRef = new Date(refData);
        if (dRef >= hoje && dRef < amanha) fechadosHoje++;
      }
      var contaAtiva = l.contaAtivaEm && (l.vendeuConta !== false);
      var maqAtiva = l.maquinaAtivaEm && (l.vendeuMaquina !== false);
      var isAtiva = contaAtiva && maqAtiva;
      if (isAtiva) ativos.push(l);
      else fechadosNaoAtivos.push(l);
    }

    if (l.status === "negociacao") emNegociacao.push(l);
    
    if (l.status === "contato_2" || l.status === "contato_3") {
      var ref = l.dataUltimoContato || l.atualizadoEm;
      if (ref) {
        var d = new Date(ref);
        var dias = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
        if (dias >= 7) travados.push({ lead: l, dias: dias });
      }
    }
  });

  // ============ PONTOS DO MÊS ============
  var ptsConta = 0, ptsGetnet = 0, ptsFit = 0, ptsM01Conta = 0, ptsM01Getnet = 0;
  leads.forEach(function(l) {
    ptsConta += pontosProduto(l, "conta", mesAtual);
    ptsGetnet += pontosProduto(l, "getnet", mesAtual);
    ptsFit += pontosFit(l, mesAtual);
    // M0/M1 (para gatilho/equipe)
    var mesAb = mesRef(l.dataAbertura);
    if (mesAb) {
      var mesM0 = mesAb;
      var mesM1 = proximoMes(mesAb, 1);
      if (mesAtual === mesM0 || mesAtual === mesM1) {
        ptsM01Conta += pontosProduto(l, "conta", mesAtual);
        ptsM01Getnet += pontosProduto(l, "getnet", mesAtual);
      }
    }
  });
  var ptsTotal = ptsConta + ptsGetnet + ptsFit;
  var ptsM01 = ptsM01Conta + ptsM01Getnet;

  // Bônus por faixa
  function bonusFaixa(pts, faixas) {
    var valor = 0;
    for (var i = 0; i < faixas.length; i++) {
      if (pts >= faixas[i][0]) valor = faixas[i][1];
      else break;
    }
    return valor;
  }
  var faixasConta = [[60,1000],[80,2000],[100,3000],[130,4000]];
  var faixasGetnet = [[25,1000],[40,2000],[55,3000],[85,5000]];
  var bonusConta = bonusFaixa(ptsTotal, faixasConta);
  var bonusGetnet = bonusFaixa(ptsGetnet, faixasGetnet);
  var valorBase = ptsTotal * 30;
  var totalMes = valorBase + bonusConta + bonusGetnet;

  // Próxima faixa
  function proximaFaixa(pts, faixas) {
    for (var i = 0; i < faixas.length; i++) {
      if (pts < faixas[i][0]) return { faltam: faixas[i][0] - pts, valor: faixas[i][1], alvo: faixas[i][0] };
    }
    return null;
  }
  var proxConta = proximaFaixa(ptsTotal, faixasConta);
  var proxGetnet = proximaFaixa(ptsGetnet, faixasGetnet);

  // ============ HTML DO E-MAIL ============
  var html = '<div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">';
  
  html += '<div style="background: #EC0000; color: #fff; padding: 16px; border-radius: 12px 12px 0 0;">';
  html += '<h1 style="margin: 0; font-size: 18px;">iCtx · Resumo ' + Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM/yyyy") + '</h1>';
  html += '<p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Seu dia em 30 segundos</p>';
  html += '</div>';

  // BLOCO 1 — KPIs do dia
  html += '<div style="background: #f8fafc; padding: 16px;">';
  html += '<table style="width: 100%; border-collapse: collapse;"><tr>';
  html += '<td style="padding: 8px; text-align: center; border-right: 1px solid #e2e8f0;"><div style="font-size: 22px; font-weight: 800; color: #0f172a;">' + totalLeads + '</div><div style="font-size: 11px; color: #64748b;">Leads na base</div></td>';
  html += '<td style="padding: 8px; text-align: center; border-right: 1px solid #e2e8f0;"><div style="font-size: 22px; font-weight: 800; color: #2563eb;">' + leadsFaladosHoje + '</div><div style="font-size: 11px; color: #64748b;">Falados hoje</div></td>';
  html += '<td style="padding: 8px; text-align: center; border-right: 1px solid #e2e8f0;"><div style="font-size: 22px; font-weight: 800; color: #059669;">' + fechadosHoje + '</div><div style="font-size: 11px; color: #64748b;">Fechados hoje</div></td>';
  html += '<td style="padding: 8px; text-align: center;"><div style="font-size: 22px; font-weight: 800; color: #d97706;">' + emNegociacao.length + '</div><div style="font-size: 11px; color: #64748b;">Em negociação</div></td>';
  html += '</tr></table>';
  html += '</div>';

  // BLOCO 2 — Ações
  html += '<div style="background: #fff; padding: 16px; border-top: 1px solid #e2e8f0;">';
  html += '<h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px;">Ações prioritárias</h2>';

  if (oportunidadesHoje.length > 0) {
    html += '<div style="margin-bottom: 12px;"><div style="font-size: 12px; font-weight: 700; color: #dc2626;">🔔 Follow-ups de hoje (' + oportunidadesHoje.length + ')</div>';
    oportunidadesHoje.slice(0, 5).forEach(function(l) {
      html += '<div style="padding: 6px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9;">' + (l.empresaExibicao || l.razaoSocial) + (l.nomeContato ? ' · ' + l.nomeContato : '') + '</div>';
    });
    html += '</div>';
  }

  if (travados.length > 0) {
    html += '<div style="margin-bottom: 12px;"><div style="font-size: 12px; font-weight: 700; color: #d97706;">⚠️ Conversas travadas há 7+ dias (' + travados.length + ')</div>';
    travados.slice(0, 5).forEach(function(t) {
      html += '<div style="padding: 6px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9;">' + (t.lead.empresaExibicao || t.lead.razaoSocial) + ' · ' + t.dias + 'd</div>';
    });
    html += '</div>';
  }

  if (fechadosNaoAtivos.length > 0) {
    html += '<div style="margin-bottom: 12px;"><div style="font-size: 12px; font-weight: 700; color: #059669;">💰 Fechados aguardando ativação (' + fechadosNaoAtivos.length + ')</div>';
    fechadosNaoAtivos.slice(0, 5).forEach(function(l) {
      html += '<div style="padding: 6px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9;">' + (l.empresaExibicao || l.razaoSocial) + '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // BLOCO 3 — Pontos do mês
  html += '<div style="background: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">';
  html += '<h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px;">Seus pontos em ' + mesAtual + '</h2>';
  html += '<table style="width: 100%; font-size: 12px; margin-bottom: 8px;">';
  html += '<tr><td style="color: #64748b;">Pontos totais:</td><td style="text-align: right; font-weight: 800; font-size: 18px; color: #0f172a;">' + ptsTotal + ' pts</td></tr>';
  html += '<tr><td style="color: #64748b;">Conta:</td><td style="text-align: right; font-weight: 700; color: #2563eb;">' + ptsConta + ' pts</td></tr>';
  html += '<tr><td style="color: #64748b;">GetNet:</td><td style="text-align: right; font-weight: 700; color: #7c3aed;">' + ptsGetnet + ' pts</td></tr>';
  if (ptsFit > 0) html += '<tr><td style="color: #64748b;">Fit:</td><td style="text-align: right; font-weight: 700; color: #059669;">' + ptsFit + ' pts</td></tr>';
  html += '</table>';
  html += '<div style="border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 12px;">';
  html += '<div style="display: flex; justify-content: space-between; padding: 3px 0;"><span style="color: #64748b;">Valor base (pts × R$30):</span><strong>R$ ' + valorBase.toFixed(2).replace('.', ',') + '</strong></div>';
  if (bonusConta > 0) html += '<div style="display: flex; justify-content: space-between; padding: 3px 0;"><span style="color: #64748b;">Bônus conta:</span><strong style="color: #059669;">R$ ' + bonusConta.toLocaleString('pt-BR') + '</strong></div>';
  if (bonusGetnet > 0) html += '<div style="display: flex; justify-content: space-between; padding: 3px 0;"><span style="color: #64748b;">Bônus GetNet:</span><strong style="color: #059669;">R$ ' + bonusGetnet.toLocaleString('pt-BR') + '</strong></div>';
  html += '<div style="display: flex; justify-content: space-between; padding: 6px 0 0; border-top: 1px solid #e2e8f0; margin-top: 6px; font-size: 14px;"><span style="font-weight: 700;">Total projetado:</span><strong style="color: #059669;">R$ ' + totalMes.toFixed(2).replace('.', ',') + '</strong></div>';
  html += '</div>';

  if (proxConta) {
    html += '<div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 6px; font-size: 11px; color: #92400e;"><strong>Faltam ' + proxConta.faltam + ' pts</strong> para o próximo bônus de conta (R$ ' + proxConta.valor.toLocaleString('pt-BR') + ').</div>';
  }
  if (proxGetnet) {
    html += '<div style="margin-top: 6px; padding: 8px; background: #ede9fe; border-radius: 6px; font-size: 11px; color: #5b21b6;"><strong>Faltam ' + proxGetnet.faltam + ' pts</strong> para o próximo bônus GetNet (R$ ' + proxGetnet.valor.toLocaleString('pt-BR') + ').</div>';
  }
  html += '</div>';

  html += '<div style="text-align: center; padding: 16px; font-size: 10px; color: #94a3b8;">iCtx · Resumo gerado automaticamente às 8h</div>';
  html += '</div>';

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: 'iCtx · Resumo ' + Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM"),
    htmlBody: html,
  });
}`;

