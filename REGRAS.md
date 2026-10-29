# REGRAS iCtx CRM (produção real; quebra = custo financeiro)

## 1. Execução
- Alterar só os arquivos listados no prompt. Se precisar de outro, PARAR e reportar.
- Todo prompt futuro vale "conforme REGRAS.md e DESIGN.md".
- Resposta final: listar arquivos tocados + "nenhum outro arquivo alterado".

## 2. Modelo de dados
- `Lead`: só campos OPCIONAIS novos; nunca renomear/remover; atualizar sempre via spread imutável, preservando campos desconhecidos.
- Datas de calendário: 'YYYY-MM-DD' no fuso local. Timestamps: ISO ou epoch ms.

## 3. Backend & Sincronização
- Persistência de leads: **Google Sheets API v4** (não Apps Script). 
  Firebase Auth para OAuth Google. Planilha "iCtx - Base de Leads PJ" 
  no Google Drive do usuário.
  - Aba `Leads`: colunas A–R. Coluna R guarda JSON completo do lead.
  - Aba `HistoricoContatos`: log de disparos/ligações.
- Autenticação e Sessão:
  - Token de acesso armazenado em `sessionStorage` (`{ accessToken, expiresAt = agora + 55 min }`), nunca em `localStorage`.
  - `initAuth` restaura sessão ativa se `expiresAt > agora + 60 s`.
- Sincronização 3-Way Merge (`src/utils/syncMerge.ts`):
  - Base de sincronização mantida em `localStorage['ictx_sync_base']` (`{ [leadId]: hash32 }`).
  - Hashing determinístico via `stableStringify` (chaves ordenadas recursivamente) e FNV-1a de 32 bits.
  - Resolução por ID na união: ambos presentes com hash igual -> local; remoto igual à base -> local; local igual à base -> remoto; divergentes -> local (conflitos++); só local -> local; só remoto -> remoto apenas se não constar na base (se constava, honra exclusão local).
  - Leads de exemplo (`/^lead_[1-9]\d?$/`) são descartados incondicionalmente em todas as fontes.
- Escrita Segura no Google Sheets:
  - `saveAllLeadsToSheet`: escreve diretamente a faixa `A2:R(n+1)` e limpa apenas linhas excedentes abaixo de `n+1`. Nunca deixa a planilha vazia em momento intermediário.
- Auto-save:
  - Habilitado APENAS após o 1º merge da sessão completar (`firstMergeDoneRef`).
  - Debounce de 3s.
  - Em eventos `visibilitychange -> hidden` e `pagehide`, descarrega imediatamente saves pendentes se a sessão for válida.
  - Token expirado durante sessão: tentativa automática de silent refresh (`signInWithPopup`). Se bloqueado pelo navegador ou recusado, incrementa `pendingSyncCount` e exibe ponto vermelho com badge no Header.
  - Pendências locais: leads com hash ≠ `ictx_sync_base`. Visíveis no Header via ponto vermelho + tooltip com contagem ("N leads pendentes de sync").
- Apps Script: existe APENAS para o trigger diário `enviarResumoDiario` 
  (8h). Não processa dados — só lê a aba Leads e envia e-mail resumo.
- Não usar chunking 45k, insertColumnsAfter, LockService (arquitetura 
  anterior, obsoleta).
- Sem migração de stack.

## 4. WhatsApp
- Somente wa.me com texto pré-preenchido. Nunca automação não oficial.
- W (WhatsApp) só renderiza se o telefone for celular (11 dígitos, 3º = '9'). Fixo: só T.

## 5. Copywriting
- "Represento o Banco Santander…" ou "Especialista em abertura de contas PJ para o Santander".
- Nunca "sou do banco" nem "sou parceiro".
- Nunca prometer aprovação/limite. Sempre "vamos verificar o que é possível habilitar".
- 1 pergunta por mensagem. Sem link na 1ª mensagem.
- MEI+ com razão social = nome do titular → usar "sua empresa" em vez do nome.
- Proibido: "pré-aprovad|aprovad|liberad|garantid" em qualquer mensagem.

## 6. Checklist base (toda validação)
- Compila sem erros TypeScript.
- App abre; Kanban idêntico ao esperado.
- Abrir lead; mover card; F5 persiste.
- wa.me / tel: disparam corretamente.
- Sheets recebe; contagem de leads antes = depois.

## 7. Estrutura de PONTOS (campanha Santander)
Referência para qualquer cálculo de remuneração, ativação ou meta.

### Valor
- 1 ponto = R$ 30,00 (valor bruto por ponto credenciado).
- Bônus são somados por cima do valor bruto (cumulativos por mês).

### Janelas do cliente (contadas a partir da data de credenciamento)
- **M0**: mês do credenciamento.
- **M1**: mês seguinte ao credenciamento.
- **M2**: 2 meses após o credenciamento.
- M0 e M1 têm o MESMO peso (100%). M2 tem 50%. Nunca há M3+.
- Cada cliente gera pontos em no máximo 2 momentos: 100% em M0 **ou** M1 (na ativação), e 50% em M2 (se permanecer ativo).

### Pontos na ativação (M0/M1)
Aplicável a MEI+/ME/EIRELI/LTDA (+1 ano ou <1 ano de CNPJ).
- Conta PJ ativa: +1 ano = 4 pts; <1 ano = 2 pts.
- Getnet (credenciamento ativo): +1 ano = 6 pts; <1 ano = 4 pts.
- Combo conta+getnet (+1 ano): 10 pts.
- Combo conta+getnet (<1 ano): 6 pts.
- **MEI comum (não desenquadrado): 0 pts. Não credencia.**

### M2 — regra explícita
Cada cliente tem 3 janelas de pontuação. Depois morre.

- **M0** (mês do credenciamento): ativou em M0 → 100% de pontos.
- **M1** (mês seguinte): não ativou em M0, ativou em M1 → 100% de 
  pontos (só em M1).
- **M2** (2 meses após abertura):
  - Se ativou em M0 ou M1 → **+50% no M2 SE ainda ativo no M2** (retenção).
  - Se ativou em M2 (tardio) → **50% no M2** (único pagamento).
- **M3+**: **0 pontos**, para sempre.

Exemplo:
- Mês 1: 1 cliente ativado em M0 = 10 pts.
- Mês 2: 14 pts M0 + 10 pts M1 (ativação tardia do mês 1) = 24 pts.
- Mês 3: 100 pts M0 + 26 pts M1 + 5 pts M2 retenção = 131 pts.

### Fit Energia
- +1 pt por cliente (pago 1x no mês da contratação), soma para bônus conta.
- No Dossiê: checkbox "Fit" permite marcar/desmarcar a contratação com timestamp de data local.

### Retenção M2 (Operação no Dossiê)
- Se o lead estiver na janela M2, o Dossiê exibe banner de validação: "Fase M2 — este cliente ainda está ativo?".
- "Sim, ativo": limpa datas de encerramento (`contaEncerradaEm` e `maquinaEncerradaEm`), garantindo 50% de pontos de retenção.
- "Não, encerrou": registra data de encerramento no fuso local.

### Correção de Datas de Ativação
- Botão "✎" discreto visível ao lado de PIX e Máquina quando ativos para correção pontual de data via prompt (`YYYY-MM-DD`).

### Bônus mensais (cumulativos escalonados, avaliados todo mês sobre os pontos DO MÊS)
- **Conta**: 60 → R$1.000; 80 → R$2.000; 100 → R$3.000; 130 → R$4.000 (acumulados: até R$10.000).
- **Getnet**: 25 → R$1.000; 40 → R$2.000; 55 → R$3.000; 85 → R$5.000 (acumulados: até R$11.000).
- **Campanha equipe** (só M0/M1 validados): 50 → R$1.500; 60 → R$2.500; 80 → R$4.000; 100 → R$5.000 (acumulados: até R$13.000).
- **Ativação de Bônus de Equipe**: 5º card no Painel do Supervisor com toggle persistido por mês (`ictx_equipe_bateu_[YYYY-MM]`).

### Reativação
- Cliente que parou de usar por 6–12 meses pode ser recredenciado.
- Reativação recomeça o ciclo M0/M1/M2 (novos pontos na ativação).

## 8. Definições críticas
- **Ativação conta**: 3 PIX + comprovante.
- **Ativação Getnet**: R$500 em vendas na maquininha.
- **MEI+**: MEI desenquadrado (virou ME). Vale pontos como ME.
- **MEI comum**: NÃO vale pontos. Só qualifica se desenquadrar durante a campanha.
- **Elegibilidade pela Receita Federal**: O campo `dataCompletaReceita.opcao_pelo_mei` é a fonte primária da verdade (`false` = elegível, `true` = inelegível). Se ausente, usa fallback heurístico.
- **Imutabilidade do dataFechamento**: Gravado definitivamente na transição para o status `fechado` (`new Date().toISOString()`), protegendo os pontos de evaporação. `dataUltimoContato` NUNCA é usado como data de abertura.
- **Fuso Horário Local**: Todas as comparações de data e mês corrente utilizam `dataLocalISO` (fuso local), eliminando erros de virada em UTC.
