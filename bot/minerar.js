import fs from 'fs';
import ExcelJS from 'exceljs';

async function run() {
  console.log("🤖 Acordando o minerador...");

  const API_KEY = process.env.CASADOSDADOS_API_KEY;
  if (!API_KEY) throw new Error("Chave da API não configurada!");
  
  // Mostra os primeiros caracteres da chave para confirmar que ela chegou
  console.log(`🔑 Chave recebida: ${API_KEY.substring(0, 5)}... (Tamanho: ${API_KEY.length})`);

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
          cnae: alvo.cnae,
          municipio: alvo.municipio,
          bairro: alvo.bairro,
          uf: "BA", // Adicionamos a UF, que algumas APIs exigem
          situacao: "ATIVA"
        })
      });

      const rawText = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(rawText);
          const empresas = data.cnpjs || [];
          console.log(`   -> Retorno da API: ${empresas.length} empresas encontradas.`);
          empresas.forEach(emp => {
            if (emp.cnpj) leads.add(emp.cnpj);
          });
        } catch (e) {
           console.log(`   -> A API respondeu, mas não é um JSON válido. Resposta: ${rawText.substring(0, 100)}`);
        }
      } else {
        console.log(`   -> ERRO HTTP ${response.status}. Resposta da API: ${rawText}`);
      }
    } catch (error) {
      console.error(`   -> Erro na busca de ${alvo.bairro}:`, error.message);
    }

    index++;
    await new Promise(r => setTimeout(r, 2000));
  }

  progresso.ultimoIndex = index;
  fs.writeFileSync('./bot/progresso.json', JSON.stringify(progresso, null, 2));

  // Gera o Excel mesmo se estiver vazio, para não quebrar o Git
  console.log(`📦 Gerando cartucho com ${leads.size} leads...`);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads AK');
  worksheet.columns = [{ header: 'CNPJ', key: 'cnpj', width: 20 }];

  leads.forEach(cnpj => worksheet.addRow({ cnpj }));
  
  // Se estiver vazio, adiciona uma linha em branco só para o arquivo existir
  if (leads.size === 0) {
      worksheet.addRow({ cnpj: "NENHUM_LEAD_ENCONTRADO" });
  }

  const dataStr = new Date().toISOString().split('T')[0];
  const nomeArquivo = `cartucho_${dataStr}_${leads.size}leads.xlsx`;
  
  await workbook.xlsx.writeFile(`./${nomeArquivo}`);
  console.log(`✅ Sucesso! Arquivo ${nomeArquivo} criado.`);
}

run().catch(console.error);
