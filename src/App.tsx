  const handleBatchEnrich = async () => {
    let filaIds: string[] = [];
    const filaSalva = localStorage.getItem('ictx_enrich_fila');
    if (filaSalva) { filaIds = JSON.parse(filaSalva); }
    else {
      const leadsParaEnriquecer = leads.filter(l => {
        if (l.status === 'fechado' || l.status === 'descartado') return false;
        const tel1 = limparDigitos(l.telefonePrincipal || '');
        const tel2 = limparDigitos(l.telefoneSecundario || '');
        const isCelular1 = tel1.length === 11 && tel1[2] === '9';
        const isCelular2 = tel2.length === 11 && tel2[2] === '9';
        const temCelular = isCelular1 || isCelular2;
        return !temCelular || !l.cnaeCodigo || l.razaoSocial === 'Empresa';
      });
      if (leadsParaEnriquecer.length === 0) { alert('Nenhum lead pendente.'); return; }
      filaIds = leadsParaEnriquecer.map(l => l.id);
      localStorage.setItem('ictx_enrich_fila', JSON.stringify(filaIds));
      localStorage.setItem('ictx_enrich_total', filaIds.length.toString());
    }
    if (filaIds.length === 0) { localStorage.removeItem('ictx_enrich_fila'); localStorage.removeItem('ictx_enrich_total'); return; }

    const totalOriginal = parseInt(localStorage.getItem('ictx_enrich_total') || filaIds.length.toString(), 10);
    setIsEnriching(true); setEnrichTotal(totalOriginal); setEnrichProgress(totalOriginal - filaIds.length);

    while (filaIds.length > 0) {
      const leadId = filaIds[0];
      const leadsAtuais = carregarLeads();
      const index = leadsAtuais.findIndex(l => l.id === leadId);
      
      if (index !== -1) {
        const lead = leadsAtuais[index];
        try {
          const dados = await consultarCnpj(lead.cnpj);
          if (dados) {
            // Usa a inteligência de classificação de telefones (o que resolve o problema)
            const telefonesTratados = classificarESanitizarTelefones([
              dados.ddd_telefone_1 || '',
              dados.ddd_telefone_2 || '',
              lead.telefonePrincipal || '',
              lead.telefoneSecundario || ''
            ]);

            const leadAtualizado: Lead = {
              ...lead,
              razaoSocial: dados.razao_social || lead.razaoSocial,
              nomeFantasia: dados.nome_fantasia || lead.nomeFantasia,
              empresaExibicao: dados.nome_fantasia || dados.razao_social || lead.empresaExibicao,
              cnaeCodigo: dados.cnae_fiscal ? String(dados.cnae_fiscal) : lead.cnaeCodigo,
              cnaeDescricao: dados.cnae_fiscal_descricao || lead.cnaeDescricao,
              naturezaJuridica: dados.natureza_juridica || lead.naturezaJuridica,
              logradouro: dados.logradouro || lead.logradouro,
              numero: dados.numero || lead.numero,
              bairro: dados.bairro || lead.bairro,
              municipio: dados.municipio || lead.municipio,
              uf: dados.uf || lead.uf,
              cep: dados.cep || lead.cep,
              dataAbertura: dados.data_inicio_atividade || lead.dataAbertura,
              telefonePrincipal: telefonesTratados.telefonePrincipal || lead.telefonePrincipal,
              telefonePrincipalFormatado: telefonesTratados.telefonePrincipalFormatado || lead.telefonePrincipalFormatado,
              telefoneSecundario: telefonesTratados.telefoneSecundario || lead.telefoneSecundario,
              telefoneSecundarioFormatado: telefonesTratados.telefoneSecundarioFormatado || lead.telefoneSecundarioFormatado,
            };
            
            leadsAtuais[index] = autocorrigeLead(leadAtualizado);
            salvarLeads(leadsAtuais);
            setLeads([...leadsAtuais]);
            if (leadParaDetalhes?.id === leadId) setLeadParaDetalhes(autocorrigeLead(leadAtualizado));
          }
        } catch (error) { console.warn(`Erro: ${lead.cnpj}`, error); }
      }
      filaIds.shift();
      localStorage.setItem('ictx_enrich_fila', JSON.stringify(filaIds));
      setEnrichProgress(totalOriginal - filaIds.length);
      if (filaIds.length > 0) await new Promise(r => setTimeout(r, 20000));
    }
    setIsEnriching(false);
    localStorage.removeItem('ictx_enrich_total');
    alert('Enriquecimento concluído!');
  };
