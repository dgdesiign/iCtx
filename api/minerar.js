import ExcelJS from 'exceljs';

export default async function handler(req, res) {
  const CASADOSDADOS_API_KEY = process.env.CASADOSDADOS_API_KEY; 
  
  const bairros = ["Pituba", "Barra", "Ondina"];
  const cnaes = ["5611201", "5612100"]; 
  
  const leads = new Map(); 

  try {
    for (const bairro of bairros) {
      for (const cnae of cnaes) {
        const response = await fetch('https://api.casadosdados.com.br/v5/public/cnpj/pesquisa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': CASADOSDADOS_API_KEY
          },
          body: JSON.stringify({
            cnae: cnae,
            municipio: "SALVADOR", 
            bairro: bairro,
            situacao: "ATIVA"
          })
        });

        if (!response.ok) continue;
        const data = await response.json();
        const empresas = data.cnpjs || [];
        
        for (const empresa of empresas) {
          if (empresa.cnpj && !leads.has(empresa.cnpj)) {
            leads.set(empresa.cnpj, { cnpj: empresa.cnpj, razaoSocial: empresa.razao_social });
          }
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads AK');
    worksheet.columns = [{ header: 'CNPJ', key: 'cnpj', width: 20 }];

    for (const lead of leads.values()) {
      worksheet.addRow({ cnpj: lead.cnpj });
    }

    // A MUDANÇA ESTÁ AQUI: Geramos o Buffer em vez de escrever na stream
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cartucho_ak.xlsx"');
    res.send(buffer);

  } catch (error) {
    res.status(500).json({ error: 'Falha', details: error.message });
  }
}