import fs from 'fs';
import ExcelJS from 'exceljs';

async function run() {
  console.log("🤖 Acordando o minerador...");

  const API_KEY = process.env.CASADOSDADOS_API_KEY;
  if (!API_KEY) throw new Error("Chave da API não configurada!");

  const alvos = JSON.parse(fs.readFileSync('./bot/alvos.json', 'utf8'));
  let progresso = JSON.parse(fs.readFileSync('./bot/progresso.json', 'utf8'));

  let leads = new Set();
  let index = progresso.ultimoIndex;

  if (index >= alvos.length) {
    console.log("✅ Todos os alvos já foram minerados!");
    return;
  }

  while (leads.size < 300 && index < alvos.length) {
    const alvo = alvos[index];
    console.log(`Buscando: ${alvo.bairro} - ${alvo.municipio} | CNAE: ${alvo.cnae} (Total atual: ${leads.size})`);

    try {
      const response = await fetch('https://api.casadosdados.com.br/v5/public/cnpj/pesquisa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
        body: JSON.stringify({
          codigo_atividade_principal: [alvo.cnae], // Campo correto
          situacao_cadastral: ["ATIVA"],          // Campo correto
          uf: ["BA"],                             // UF como array
          municipio: [alvo.municipio],            // Município como array
          bairro: [alvo.bairro],                  // Bairro como array
          limite: 20,
          pagina: 1
        })
      });

      const rawText = await response.text();

      if (response.ok) {
        try {
          const data = JSON.parse(rawText);
          // A API pode retornar a lista em 'cnpjs' ou 'empresas'
          const empresas = data.cnpjs || data.empresas || [];
          console.log(`   -> Retorno da API: ${empresas.length} empresas encontradas.`);
          empresas.forEach(emp => {
            if (emp.cnpj) leads.add(emp.cnpj);
          });
        } catch (e) {
          console.log(`   -> A API respondeu, mas não é um JSON válido. Resposta: ${rawText.substring(0, 200)}`);
        }
      } else {
        console.log(`   -> ERRO HTTP ${response.status}. Resposta: ${rawText}`);
      }
    } catch (error) {
      console.error(`   -> Erro na busca de ${alvo.bairro}:`, error.message);
    }

    index++;
    // Pausa de 2 segundos entre bairros
    await new Promise(r => setTimeout(r, 2000));
  }

  progresso.ultimoIndex = index;
  fs.writeFileSync('./bot/progresso.json', JSON.stringify(progresso, null, 2));

  console.log(`📦 Gerando cartucho com ${leads.size} leads...`);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads AK');
  worksheet.columns = [{ header: 'CNPJ', key: 'cnpj', width: 20 }];

  leads.forEach(cnpj => worksheet.addRow({ cnpj }));

  if (leads.size === 0) {
      worksheet.addRow({ cnpj: "NENHUM_LEAD_ENCONTRADO" });
  }

  const dataStr = new Date().toISOString().split('T')[0];
  const nomeArquivo = `cartucho_${dataStr}_${leads.size}leads.xlsx`;

  await workbook.xlsx.writeFile(`./${nomeArquivo}`);
  console.log(`✅ Sucesso! Arquivo ${nomeArquivo} criado.`);
}

run().catch(console.error);
