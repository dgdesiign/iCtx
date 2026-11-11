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

  // O loop continua até chegar em 300 leads OU acabar os alvos
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
          situacao: "ATIVA"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const empresas = data.cnpjs || [];
        empresas.forEach(emp => {
          if (emp.cnpj) leads.add(emp.cnpj);
        });
      }
    } catch (error) {
      console.error(`Erro na busca de ${alvo.bairro}:`, error.message);
    }

    index++;
    // Pausa de 2 segundos entre bairros para não bloquear a API
    await new Promise(r => setTimeout(r, 2000));
  }

  // Atualiza o progresso
  progresso.ultimoIndex = index;
  fs.writeFileSync('./bot/progresso.json', JSON.stringify(progresso, null, 2));

  if (leads.size === 0) {
    console.log("⚠️ Nenhum lead novo encontrado nesta rodada.");
    return;
  }

  // Gera o Excel para o Robô AK
  console.log(`📦 Gerando cartucho com ${leads.size} leads...`);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads AK');
  worksheet.columns = [{ header: 'CNPJ', key: 'cnpj', width: 20 }];

  leads.forEach(cnpj => worksheet.addRow({ cnpj }));

  const dataStr = new Date().toISOString().split('T')[0];
  const nomeArquivo = `cartucho_${dataStr}_${leads.size}leads.xlsx`;
  
  await workbook.xlsx.writeFile(`./${nomeArquivo}`);
  console.log(`✅ Sucesso! Arquivo ${nomeArquivo} criado.`);
}

run().catch(console.error);
