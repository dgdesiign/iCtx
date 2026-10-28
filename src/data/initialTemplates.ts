import { MessageTemplate } from '../types/crm';

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  // --- CONTATO 1: ABORDAGENS INICIAIS ---
  {
    id: 'pronampe_capital',
    titulo: '💰 Pronampe / Condições Especiais PJ',
    etapa: 'contato_1',
    canal: 'whatsapp',
    destaque: 'Mais Utilizado',
    descricao: 'Abordagem consultiva, curiosa e profissional para empresas ativas.',
    texto: `Oi {nome}, tudo joia? Vi aqui que você responde pela *{empresa}*, certo?

Sou o Douglas Krüger. Represento o Banco Santander aqui na região em soluções e abertura de contas PJ. Tô te chamando rapidinho porque acompanho empresas com o perfil e tempo de mercado da {empresa} para avaliar a viabilidade de condições diferenciadas, como taxas competitivas e linhas de Pronampe.

Não consigo te prometer aprovação antes de consultar o CNPJ, mas o processo é super simples e em poucos passos verificamos o que é possível habilitar para vocês, sem burocracia. Vale a pena eu dar uma olhada rápida na viabilidade da {empresa}?`,
  },
  {
    id: 'link_pagamento_varejo',
    titulo: '🔗 Link de Pagamento & Redução de Taxas',
    etapa: 'contato_1',
    canal: 'whatsapp',
    destaque: 'Comércio / Varejo',
    descricao: 'Ideal para comércios, lojas, clínicas e serviços que cobram à distância.',
    texto: `Oi {nome}, tudo bem? Sou o Douglas Krüger. Represento o Banco Santander para empresas aqui da nossa região.

Muitos empresários do seu setor aí na região da *{empresa}* estão buscando alternativas para reduzir os custos com taxas de maquininhas e cobranças à distância.

Temos uma solução de Link de Pagamento com possibilidade de custo zero para facilitar suas vendas e agilizar o recebimento. Em poucos passos bem práticos conseguimos checar a viabilidade para a {empresa}. Vale a pena eu te explicar em 1 minutinho como funciona?`,
  },
  {
    id: 'isencao_novas_empresas',
    titulo: '💳 Conta PJ Isenta & Estruturação Financeira',
    etapa: 'contato_1',
    canal: 'whatsapp',
    destaque: 'Empresas Recentes',
    descricao: 'Ideal para negócios que querem evitar cobranças desnecessárias de tarifas.',
    texto: `Olá {nome}, tudo bem? Parabéns pelo trabalho na *{empresa}*, vi que estão operando há {idade}.

Sou o Douglas Krüger, especialista em abertura de contas para o Banco Santander. Eu auxilio empresas com o perfil da {empresa} a estruturarem sua operação financeira com isenção de tarifas e condições diferenciadas.

A análise é simples, sem burocracia e em poucos passos damos início à nossa parceria. Consegue falar 1 minutinho para vermos as possibilidades para vocês?`,
  },
  {
    id: 'proximidade_regional',
    titulo: '📍 Consultor Regional (Proximidade Local)',
    etapa: 'contato_1',
    canal: 'whatsapp',
    destaque: 'Alta Resposta',
    descricao: 'Gera confiança imediata mencionando o município/bairro da empresa.',
    texto: `Oi {nome}, tudo bem? Sou o Douglas Krüger. Represento o Banco Santander no atendimento e credenciamento de contas PJ na região de {cidade}.

Precisava falar rapidamente com o responsável pela *{empresa}* sobre a viabilidade de um pacote especial de isenção e linhas para o CNPJ de vocês.

O processo é bem direto e prático, sem complicação. Você prefere que eu te ligue em um minutinho ou podemos conversar por aqui?`,
  },

  // --- CONTATO 2: FOLLOW-UP (PARA QUEM NÃO RESPONDEU) ---
  {
    id: 'followup_rotina',
    titulo: '🕒 Follow-up Leve (Rotina Corrida)',
    etapa: 'contato_2',
    canal: 'whatsapp',
    destaque: 'Não Invasivo',
    descricao: 'Para enviar 2 a 3 dias após o primeiro contato sem resposta.',
    texto: `Oi {nome}! Imagino que a rotina aí na *{empresa}* deva estar super corrida essa semana.

Passando só para saber se você conseguiu ver minha mensagem sobre as condições que represento para o Banco Santander para o seu CNPJ? Se fizer sentido, em poucos passos rápidos eu já verifico o que é viável para vocês.`,
  },
  {
    id: 'followup_urgencia_credito',
    titulo: '📊 Follow-up Consulta de Viabilidade',
    etapa: 'contato_2',
    canal: 'whatsapp',
    destaque: 'Gatilho Urgência',
    descricao: 'Lembra que o ciclo de consultas do mês está se encerrando.',
    texto: `{nome}, passando rapidinho: como estamos fechando o ciclo de consultas de condições para o Santander deste mês, queria confirmar se faz sentido checarmos a viabilidade da *{empresa}* antes de eu encerrar os atendimentos do seu segmento por aqui.

Leva menos de 2 minutos e é totalmente sem compromisso. O que acha?`,
  },
  {
    id: 'followup_audio_permissao',
    titulo: '🎙️ Pedido para Enviar Áudio Explicativo',
    etapa: 'contato_2',
    canal: 'whatsapp',
    destaque: 'Humanizado',
    descricao: 'Altíssima taxa de resposta por quebrar a barreira do texto.',
    texto: `Oi {nome}, tudo bem? Douglas Krüger por aqui novamente. Represento o Banco Santander para abertura de contas e crédito PJ.

Pra não tomar seu tempo digitando: compensa eu te mandar um áudio de 40 segundinhos resumindo como é simples darmos início a essa parceria para a *{empresa}*?`,
  },

  // --- CONTATO 3: LIGAÇÃO & TENTATIVA FINAL ---
  {
    id: 'script_ligacao_completo',
    titulo: '📞 Roteiro de Ligação (Telefonia / Celular)',
    etapa: 'contato_3',
    canal: 'ligacao',
    destaque: 'Script Falado',
    descricao: 'Roteiro passo a passo para Douglas falar ao telefone com o cliente.',
    texto: `[ABERTURA]:
"Alô, {nome}? Aqui é o Douglas Krüger. Represento o Banco Santander na abertura de contas e soluções corporativas aqui na região. Tudo bem por aí?
Tô te ligando rapidinho porque te mandei uma mensagem no WhatsApp sobre a {empresa} e sei que na correria do dia a dia às vezes passa batido."

[SONDAGEM E VIABILIDADE]:
"Acompanho empresas do seu setor e queria checar com você a possibilidade de ativarmos condições com isenção de tarifas e linhas atrativas de capital de giro e Pronampe para o seu CNPJ.
Hoje você costuma movimentar a {empresa} por qual banco?"

[PRÓXIMO PASSO SEM PROMESSA FALSA]:
"Perfeito. Não posso te prometer limite aprovado sem antes rodar a consulta, mas o processo é extremamente simples, rápido e 100% digital. Em poucos passos eu checo a viabilidade para a {empresa}. Me confirma seu melhor e-mail ou me dá um ok no WhatsApp para eu te enviar a simulação?"`,
  },
  {
    id: 'whatsapp_pos_ligacao',
    titulo: '📱 WhatsApp Logo Após Tentar Ligar',
    etapa: 'contato_3',
    canal: 'whatsapp',
    destaque: 'Pós-Ligação',
    descricao: 'Envie logo após tocar o telefone e o cliente não atender.',
    texto: `Oi {nome}, Douglas Krüger aqui! Represento o Banco Santander e tentei te ligar rapidinho agora pra te dar um alô sobre a *{empresa}*, mas imagino que você estivesse em atendimento ou reunião.

Quando tiver 1 minutinho livre, me dá um toque por aqui! É sobre aquela consulta prática de viabilidade que comentei. Grande abraço!`,
  },

  // --- RESPOSTAS DE OBJEÇÕES (GATILHOS RÁPIDOS) ---
  {
    id: 'objecao_no_momento_curioso',
    titulo: '🛡️ Objeção: "No momento não"',
    etapa: 'objecao',
    canal: 'whatsapp',
    destaque: 'Reversão #1',
    descricao: 'Desarma a cortina de fumaça e reabre a conversa focando em custos.',
    texto: `Compreendo perfeitamente, {nome}! Imagino que a rotina aí na *{empresa}* esteja bem corrida hoje.

Só por curiosidade rápida: vocês já contam com isenção total de tarifas no banco atual de vocês ou o maior gargalo hoje são taxas de maquininhas e cobrança?`,
  },
  {
    id: 'objecao_ja_tem_banco',
    titulo: '🏦 Objeção: "Já tenho conta em outro banco"',
    etapa: 'objecao',
    canal: 'whatsapp',
    destaque: 'Diversificação',
    descricao: 'Para quando o cliente diz que já usa outro banco.',
    texto: `Excelente, {nome}! A ideia não é você cancelar a conta que já tem, mas nunca ficar refém de um banco só.

Grandes empresários sempre mantêm uma conta estratégica de contingência: para ter uma alternativa imediata e comparar taxas.

Como a abertura que represento para o Santander é rápida e com isenção de tarifas, em poucos passos você ativa e ganha poder de escolha sem custo nenhum. Vale a pena vermos a viabilidade para a *{empresa}*?`,
  },
  {
    id: 'objecao_manda_por_email',
    titulo: '📧 Objeção: "Manda por e-mail"',
    etapa: 'objecao',
    canal: 'whatsapp',
    destaque: 'Filtro',
    descricao: 'Evita que a proposta se perca na caixa de entrada.',
    texto: `Com certeza, {nome}! Posso mandar sim.

Qual é o seu melhor e-mail? Vou te enviar o material agora e já deixo um resumo de 3 linhas aqui no WhatsApp pra você bater o olho com facilidade, combinado?`,
  },
  {
    id: 'descarte_porta_aberta',
    titulo: '🚪 Encerramento Elegante (Gatilho do Desapego)',
    etapa: 'fechamento',
    canal: 'whatsapp',
    destaque: 'Última Cartada',
    descricao: 'Gera efeito psicológico de perda. Costuma reativar contatos frios.',
    texto: `Oi {nome}! Como não tive retorno, imagino que otimizar as taxas ou checar viabilidade para a *{empresa}* não seja prioridade neste momento.

Estou encerrando essa pauta por aqui para não tomar seu tempo. Vou deixar meu contato salvo; se futuramente você precisar de suporte em contas ou crédito PJ, é só me chamar.

Desejo muito sucesso com a {empresa} e ótimos negócios!`,
  },
  {
    id: 'documentos_abertura',
    titulo: '📋 Documentos para Início Prático',
    etapa: 'fechamento',
    canal: 'whatsapp',
    destaque: 'Fechamento',
    descricao: 'Para o cliente que disse "Quero ver, como faz?".',
    texto: `Perfeito, {nome}! O processo de abertura que represento para o Santander é 100% prático e sem burocracia.

Para eu iniciar o credenciamento da *{empresa}*, só preciso que você me envie uma foto nítida de:
1. Sua CNH ou RG (frente e verso)
2. Comprovante de endereço recente
3. Ramo de atuação e faturamento médio

Assim que você me enviar, em poucos passos já dou entrada e checamos todas as possibilidades para o seu CNPJ. Consegue me mandar por aqui?`,
  },
];
