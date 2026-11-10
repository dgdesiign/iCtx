# CONTEXTO-MESTRE — iCtx CRM

> Este documento é o contrato operacional do projeto iCtx.
> Toda IA que for consultada deve ler integralmente ANTES de propor qualquer código, sprint ou refatoração.
> Em caso de conflito entre este documento e uma sugestão de IA, ESTE DOCUMENTO PREVALECE.
> Última atualização: 2026-11-03.

---

## 0. COMO USAR ESTE DOCUMENTO

1. Antes de qualquer prompt, cole este arquivo no contexto da IA.
2. Se a IA propuser algo que contradiz uma seção "CONGELADO" ou "LINHA VERMELHA", rejeite imediatamente.
3. Se a IA propuser refatoração em massa sem atrito real registrado, rejeite.
4. Este documento é vivo: atualize quando uma regra mudar (e registre a data).

---

## 1. IDENTIDADE DO PROJETO

| Campo | Valor |
|---|---|
| Nome | **iCtx** (grafia oficial, sempre "iCtx") |
| Tipo | CRM de prospecção B2B focado em adquirência (GetNet) e abertura de Conta PJ (Santander) |
| Stack | React 18 + TypeScript + Vite + Tailwind + lucide-react |
| Ambiente de build | Google AI Studio |
| Deploy | Cloud Run via Publish (Starter Tier) |
| Formato | PWA instalável |
| Backend | Google Sheets + Apps Script (NÃO migrar) |
| Usuário principal | Douglas (operador único na construção; time de 10-15 executivos em operação) |
| Produto vendido | Maquininha **Fit Energia** via parceria **Santander** (com GetNet) |
| Portal de produção | **Almeida Krüger** |
| Metas | 12 contas/mês; 200-400 leads/dia; 100-130 pontos; time de 10-15 executivos |
| Orçamento | R$ 0 (apenas ferramentas gratuitas) |
| Idioma | Português do Brasil |

---

## 2. FLUXO OPERACIONAL REAL (8 passos)

O iCtx existe para executar este fluxo. Qualquer feature que não sirva a ele é secundária.

| # | Passo | Onde acontece hoje | Oportunidade de automação |
|---|---|---|---|
| 1 | **Receber leads** | Líder ou portal AK (lista manual) | Nenhuma gratuita (sem API) |
| 2 | **Cadastrar no iCtx** | Importação de lista | Enriquecimento CNPJ (BrasilAPI + fallback) — já existe |
| 3 | **Consultar Parceiro Santander** | Manual, no site do parceiro | Nenhuma (sem API) — ficha de cópia ajuda |
| 4 | **Copiar nome + CNPJ** | Manual | Botões de cópia na Ficha Cadastral — já existe |
| 5 | **Contatar via WhatsApp** | `wa.me` semi-manual | Gatilhos Sniper de 1 clique — já existe |
| 6 | **Se avançar, coletar documentos** | Contrato social + assinatura JUCEB | Campo de anexo (não implementado) |
| 7 | **Digitar produção no Portal AK** | Manual, dupla digitação | "Copiar Tudo (Bloco)" da Ficha Cadastral — já existe |
| 8 | **Ativar cliente** | 3 Pix + máquina com R$500 em vendas | Aba Pós-Venda do LeadDetailDrawer — já existe |

**Regra de ouro:** se a feature não acelera um desses 8 passos, ela é secundária. Se a feature prejudica um desses 8 passos, ela é rejeitada.

---

## 3. O QUE ESTÁ CONGELADO (não remover sem aprovação explícita)

Estes itens foram construídos, validados e são o motor do sistema. **Nenhuma IA pode removê-los, substituí-los ou reescrevê-los sem aprovação explícita do Douglas.**

### 3.1 Componentes de UI

| Componente | O que faz | Por que está congelado |
|---|---|---|
| **`LeadDetailDrawer.tsx`** | Abre ao clicar no card. Tem 4 abas: WhatsApp (Sniper), Roteiro (Teleprompter), Dossiê (Ficha Cadastral, Cadência, Parceiro Santander), Pós-Venda (só em lead fechado) | É o motor de vendas. Já foi removido uma vez (Sprint 8.1) e virou regressão grave |
| **`PipelineKanban.tsx`** | Kanban de 5 colunas: Novo, Em Prospecção, Negociação, Fechado, Descartado | Estrutura do funil. Reduzir para 5 colunas foi decisão de UX |
| **`LeadCard.tsx`** | Card compacto (280px). Mostra empresa, contexto, telefone, pontos (X/10), cadência (X/3), borda de risco, contagem M0/M1/M2 | Post-it de alta densidade. Já foi "engordado" e revertido |
| **`MetasDashboard.tsx`** | Slider de simulação de pontos, bônus por faixa, bônus equipe | Ferramenta de motivação financeira |
| **`SupervisorDashboard.tsx`** | Funil, taxa por CNAE, ranking, mapa de calor | Painel de gestão |

### 3.2 Lógica de negócio

| Regra | Onde vive | Por que congelado |
|---|---|---|
| **Cadência 0/3** | `cadencia.ts` + `LeadDetailDrawer` | D+3, D+3, D+5 entre contatos 1/2/3 |
| **Score 0-10** | `scoring.ts` | Idade CNPJ, CNAE prioritário, porte, QSA, tentativas, follow-up vencido |
| **Pontos M0/M1/M2** | `ativacao.ts` + `pontos.ts` | M0/M1 pagam cheio, M2 paga 50% (retenção), M3+ = 0 |
| **Fator de pontos** | `fatorPontos(fase)` | M0=1.0, M1=1.0, M2=0.5, expirado=0 |
| **Elegibilidade MEI** | `pontos.ts` → `elegivel()` | Fonte primária: Receita (`opcao_pelo_mei`). MEI comum = 0 pts |
| **Completude de ativação** | `ativacao.ts` | Conta ativa = 3 PIX + comprovante. Máquina ativa = R$500 em vendas |

### 3.3 Decisões arquiteturais

| Decisão | Alternativa rejeitada | Por quê |
|---|---|---|
| Google Sheets + Apps Script como backend | Firebase, Cloud SQL | Já está estável. Migração = reescrita + risco de perda |
| `wa.me` semi-manual | WhatsApp Cloud API, Baileys, WAPI | Pago ou banível. `wa.me` é o único que preserva o número |
| Coach heurístico local (palavras-chave) | LLM (Gemini) | Zero custo, zero latência, zero LGPD |
| Lógica de negócio determinística | LLM | Latência 1-3s, cota, não-determinismo |
| PWA em vez de app nativo | APK, iOS app | Zero manutenção de loja |

---

## 4. O QUE ESTÁ EM ITERAÇÃO (pode mudar com cuidado)

| Item | Estado | Próximo passo |
|---|---|---|
| Aba **Pós-Venda** do LeadDetailDrawer | Recém-criada (S-POSVENDA-ABA) | Validar conteúdo, refinar layout |
| Link da **Conta PJ** | Errado no código atual | Corrigir para `https://www.santander.com.br/conta-empresarial/cnpj?utm_source=email&utm_medium=devolucao&utm_campaign=nucleo` |
| **PIX/Máq** do card | Ainda clicáveis (abrem LeadDetailDrawer) | Fix com `e.stopPropagation()` no wrapper — NÃO usar `pointer-events-none` |
| **Design System** (tokens, componentes base) | Não implementado | Sprint 9 (só depois dos 7 dias de uso real) |
| **Safras** (filtro na topbar + ciclo M1/M2) | Não implementado | Sprint 10 ou 11 (depois dos 7 dias) |
| **Sniper como grid 3×2** (botões quadrados) | Ideia anotada | Sprint 10+ (depois dos 7 dias) |
| **Recomendação automática de oferta** (por CNAE + faturamento) | Não implementado | Horizonte 2 (depois de estabilizar) |
| **Alerta de compliance** (CNAE de risco) | Não implementado | Horizonte 2 |

---

## 5. LINHAS VERMELHAS (nunca)

Estas regras não são negociáveis. Qualquer IA que sugerir uma delas deve ser corrigida imediatamente.

| # | Linha vermelha | Motivo |
|---|---|---|
| 1 | **WhatsApp não oficial** (Baileys, WAPI, wppconnect, whatsapp-ai-framework) | Violação de ToS da Meta → banimento permanente do número. Custo infinitamente maior que qualquer ganho |
| 2 | **WhatsApp Cloud API oficial para 200+/dia** | Pago por conversa. Inviável na premissa "gratuito" |
| 3 | **Migração para Firebase / Cloud SQL** | Reescrita completa da persistência. Risco de perda de dados. Backend atual está estável |
| 4 | **LLM para lógica de negócio** (cadência, score, SLA, pontos) | Latência 1-3s, cota, não-determinismo. Lógica deve ser determinística |
| 5 | **Refatoração em massa** ("vamos reescrever o componente X") | É o que gerou o Frankenstein. Migração sempre incremental, guiada por atrito real |
| 6 | **Substituir componentes que funcionam** (LeadDetailDrawer, Sniper, Teleprompter, Ficha Cadastral) | Já tentamos no Sprint 8.1. Virou regressão grave |
| 7 | **Prometer limite de crédito pré-aprovado ao cliente** | Violação de compliance do Santander. Frase correta: "vamos verificar o que é possível habilitar" |
| 8 | **Forçar venda casada** (conta + máquina) | Violação de compliance |
| 9 | **Rodar 2 prompts seguidos sem validar** | O AI Studio pode quebrar o anterior. Sempre validar antes do próximo |
| 10 | **Aceitar "Build executado com sucesso" como validação** | "Compila sem erros" ≠ "funciona no fluxo real". Sempre testar manualmente |

---

## 6. ESTADO ATUAL (2026-11-03)

### 6.1 O que está funcionando

- ✅ Card click → `LeadDetailDrawer` (WhatsApp/Roteiro/Dossiê)
- ✅ Aba Pós-Venda condicional (só aparece em lead fechado)
- ✅ Sniper (6 gatilhos de 1 clique)
- ✅ Teleprompter de ligação (4 roteiros)
- ✅ Ficha Cadastral (5 campos + Copiar Tudo)
- ✅ Cadência 0/3 com botão "+ Registrar Tentativa"
- ✅ Verificação Parceiro Santander (Apto/Bloqueado)
- ✅ Kanban de 5 colunas com drag & drop
- ✅ Score 0-10, cadência visual, borda de risco
- ✅ Metas Dashboard (slider, bônus)
- ✅ Supervisor Dashboard (funil, CNAE, ranking)

### 6.2 Bugs conhecidos (pendentes)

| Bug | Causa | Fix planejado |
|---|---|---|
| PIX/Máq do card abrem LeadDetailDrawer ao clicar | Clique borbulha até o card (o span não tem `onClick` próprio, mas o clique sobe) | `e.stopPropagation()` no wrapper dos ícones — **NÃO usar `pointer-events-none`** |
| Link da Conta PJ errado | Link genérico no código | Substituir pelo oficial: `https://www.santander.com.br/conta-empresarial/cnpj?utm_source=email&utm_medium=devolucao&utm_campaign=nucleo` |

### 6.3 O que NÃO está sendo usado

- `ClientDossier.tsx` — arquivo existe, mas não é renderizado no `PipelineKanban` (conteúdo foi migrado para a aba Pós-Venda do `LeadDetailDrawer`)

---

## 7. REGRAS DE TRABALHO COM IA

### 7.1 Regras obrigatórias para qualquer prompt

| Regra | Por quê |
|---|---|
| **Um prompt por vez** | Validar antes do próximo. Nunca colar dois seguidos |
| **Checkpoint + ZIP + JSON antes de cada sprint** | O AI Studio pode quebrar. Checkpoint é o rollback |
| **Diagnóstico antes de aplicar** (PASSO 0 no prompt) | Forçar a IA a reportar o que encontrou antes de alterar |
| **"Não altere X" sempre no prompt** | Listar explicitamente arquivos proibidos |
| **"PROIBIDO REMOVER" no prompt de refatoração** | Listar features que devem sobreviver |
| **Validar no app em produção** (não só "build ok") | "Compila" ≠ "funciona". Testar o fluxo real |

### 7.2 Formato de prompt que funciona

```
Contexto: iCtx CRM (React 18 + TS + Vite), produção real. Siga REGRAS.md e CONTEXTO-MESTRE.md.

Tarefa: [nome do sprint]

SINTOMA REPORTADO PELO USUÁRIO: [se for fix]

COMPORTAMENTO DESEJADO: [o que deve acontecer]

ESCOPO — altere SOMENTE:
1) [arquivo 1]
2) [arquivo 2]

PROIBIDO: [arquivos que NÃO podem ser tocados]

═══════════════════════════════════════════════════════════
PASSO 0 — DIAGNÓSTICO OBRIGATÓRIO (antes de alterar)
═══════════════════════════════════════════════════════════
[o que a IA deve reportar antes de aplicar]

═══════════════════════════════════════════════════════════
FIX / IMPLEMENTAÇÃO
═══════════════════════════════════════════════════════════
[instruções específicas]

═══════════════════════════════════════════════════════════
CRITÉRIOS DE ACEITE
═══════════════════════════════════════════════════════════
[o que deve compilar, quantos arquivos, buscas esperadas]

═══════════════════════════════════════════════════════════
VALIDAÇÃO MANUAL (após build)
═══════════════════════════════════════════════════════════
[N passos de teste manual]
```

### 7.3 Como dividir contexto entre IAs

| IA | Papel | O que faz | O que NÃO faz |
|---|---|---|---|
| **DeepSeek** (esta conversa) | PM + Arquiteto | Planejamento, sprints, dossiê, análise de risco | Execução de código |
| **Gemini web** | Consultor de design/negócio | Design system, fluxos, análise | Execução de código |
| **AI Studio** (Gemini Flash) | Executor | Aplica os prompts no código | Decisões de arquitetura |

**Regra:** a IA executora (AI Studio) **nunca** decide arquitetura. Ela executa o que o PM definiu. Se ela propuser algo novo, é para o PM avaliar antes.

---

## 8. GLOSSÁRIO

| Termo | Significado |
|---|---|
| **iCtx** | Nome do CRM (grafia oficial) |
| **Fit Energia** | Produto vendido (maquininha + benefícios de energia) |
| **Santander Parceiro** | Site onde a indicação é registrada |
| **Almeida Krüger (AK)** | Portal onde a produção é digitada |
| **JUCEB** | Junta Comercial do Estado da Bahia — assinatura digital do contrato social |
| **MEI Desenquadrado (MEI+)** | MEI que excedeu o faturamento e virou ME/EPP; razão social = nome + CPF/CNPJ. Vale pontos como ME |
| **MEI Comum** | Não vale pontos. Só qualifica se desenquadrar durante a campanha |
| **Pronampe** | Programa de crédito para pequenas empresas; benefício oferecido |
| **M0** | Mês do credenciamento (ativação) |
| **M1** | Mês seguinte ao credenciamento |
| **M2** | 2 meses após o credenciamento (retenção — 50% dos pontos) |
| **Expirado** | M3+ — nunca mais pontua |
| **D+1** | Recebimento no dia seguinte (D1 na GetNet) |
| **D+2** | Recebimento 2 dias depois (D2 na GetNet) |
| **Combo D1** | Antecipação total (recebe tudo em D+1) |
| **Combo D2** | Recebimento faseado (recebe parcela a parcela) |
| **Conta PJ ativa** | 3 PIX + comprovante |
| **Máquina ativa** | R$500 em vendas na maquininha |
| **FVE** | Força de Vendas Externa (portal GetNet) |
| **GetVendas** | Plataforma de credenciamento GetNet |
| **Completude Cadastral** | Cliente valida selfie + CNH no app Getnet Brasil |
| **PAT** | Programa de Alimentação do Trabalhador (exige m², checkouts, assentos) |
| **KYC** | Know Your Customer (compliance) |
| **PEP** | Pessoa Politicamente Exposta (compliance) |
| **CNAE** | Código de atividade econômica |
| **MCC** | Merchant Category Code |
| **Split de Pagamento** | Divisão automática de valores entre recebedores |
| **Get Tap** | Smartphone Android 12+ com NFC vira maquininha |
| **Link de Pagamento (GetPay)** | Solução de vendas online |

---

## 9. INTELIGÊNCIA COMERCIAL

### 9.1 Tabela de CNAEs (referência para priorização)

**CNAEs prioritários** (alta conversão):
- Restaurante, bar, lanchonete, cafeteria
- Comércio, varejo, mercearia
- Clínica, salão de beleza, oficina, hotel
- Academia, escola

**CNAEs de risco** (compliance — exigem documentação extra):
- Joalheria, bijuteria
- Casa de câmbio
- Revenda de veículos
- Qualquer CNAE com risco de lavagem de dinheiro

**Regra:** no import, o sistema deve marcar visualmente o CNAE (⭐ prioritário / 💀 risco) para que o executivo saiba antes do primeiro contato.

### 9.2 Combos D1/D2 (referência rápida)

**Combo D1** (antecipação):
- Débito: D+1
- Crédito à vista: D+1
- Parcelado: D+1 (antecipação total)
- Taxas: variam por faixa de faturamento (1k a 2M)

**Combo D2** (recebimento faseado):
- Débito: D+1
- Crédito à vista: D+2
- Parcelado: parcela a parcela (30 dias entre cada)
- Taxas: mais baixas que D1 (trade-off pelo recebimento demorado)

**Isenção de máquinas** (ambos os combos):
- R$1.000 → 1 máquina Get Lite isenta
- R$60.000 → até 6 máquinas isentas (desconto total R$479,40)

**Bandeiras** (acréscimo em ambos):
- Elo / Hipercard: +0,80%
- American Express: +1,50%

**Validade da campanha:** 31/10/2026

### 9.3 Regras de compliance (nunca violar)

- Nunca prometer limite de crédito pré-aprovado. Sempre "vamos verificar o que é possível habilitar"
- Nunca forçar venda casada (conta + máquina)
- Sempre usar "Represento o Banco Santander" ou "Especialista em abertura de contas PJ para o Santander"
- Nunca "sou do banco" nem "sou parceiro"
- 1 pergunta por mensagem. Sem link na 1ª mensagem
- MEI+ com razão social = nome do titular → usar "sua empresa" em vez do nome

---

## 10. O QUE JÁ FOI TENTADO E FALHOU (não repetir)

| Tentativa | Onde aconteceu | Por que falhou | Lição |
|---|---|---|---|
| **Zod + Zustand** (validação runtime + state global) | Sprint 8 (Gemini web) | Prematuro para 314 leads. Adicionou complexidade sem resolver dor real | Arquitetura Enterprise só quando houver 2.000+ leads ou multi-tenant |
| **Virtualização de DOM (TanStack Virtual)** | Sprint 8 (Gemini web) | 314 cards rodam lisos. Over-engineering | Só implementar com 2.000+ itens |
| **Web Workers para scoring** | Sprint 8 (Gemini web) | 314 leads calculam em <5ms. Sem necessidade | Só quando o cálculo pesar (10.000+ leads) |
| **ClientDossier substituindo LeadDetailDrawer** | Sprint 8.1 | Removeu o motor de vendas (Sniper, Teleprompter, Ficha). Virou regressão grave | Refatoração deve ter seção "PROIBIDO REMOVER" explícita |
| **App Shell Enterprise + Sidebar retrátil** | Sprint 8.0 | Parcialmente OK, mas mudou o foco do produto (de ferramenta de vendas para SaaS) | Design melhorou, mas não pode custar produtividade |
| **Prompt "profissionalize o sistema" sem especificação** | Sprint 8.x | AI Studio interpretou como "reescreva tudo" | Todo prompt de refatoração precisa listar features que devem sobreviver |
| **Rodar 10 sprints sem semana de uso real** | Sprint 1 ao 8 | Cada camada nova exigiu refatoração da anterior (Frankenstein) | Fase de estabilização (7 dias de uso) é obrigatória |

---

## 11. PENDÊNCIAS ABERTAS

| # | Pendência | Impacto | Como resolver |
|---|---|---|---|
| 1 | Fix do PIX/Máq clicável | UX (clique indesejado) | `e.stopPropagation()` no wrapper dos ícones |
| 2 | Link da Conta PJ errado | Operacional (cliente recebe link errado) | Substituir pelo link oficial do Santander |
| 3 | Frase truncada: "Preciso que tenha uma frequência de resposta..." | Requisito não capturado | Perguntar ao Douglas |
| 4 | Origem exata dos leads (como chegam?) | Automação de cadastro | Perguntar ao Douglas |
| 5 | Lista de atritos da semana de uso real | Direciona próximo sprint | Douglas usar o app por 7 dias e anotar |
| 6 | Design System (tokens + componentes base) | Unificação visual | Sprint 9 (depois dos 7 dias) |
| 7 | Safras (filtro topbar + ciclo M1/M2) | Gestão temporal | Sprint 10 ou 11 |
| 8 | Sniper em grid 3×2 | UX (compactação) | Sprint 10+ |
| 9 | Recomendação automática de oferta (CNAE + faturamento) | Vendas | Horizonte 2 |
| 10 | Alerta de compliance (CNAE de risco) | Compliance | Horizonte 2 |

---

## 12. INSTRUÇÕES PARA A IA RECEPTORA

Se você é uma IA lendo este documento pela primeira vez:

1. **Leia integralmente.** Não pule seções.
2. **Respeite as seções 3 (Congelado) e 5 (Linhas Vermelhas).** São invioláveis.
3. **Antes de propor qualquer código, pergunte:** *"Isso acelera um dos 8 passos do fluxo operacional (Seção 2)?"* Se não, é secundário.
4. **Antes de propor refatoração, pergunte:** *"Existe atrito real registrado por uso em campo?"* Se não, rejeite.
5. **Antes de sugerir migração de backend, LLM para lógica, ou WhatsApp não oficial:** pare. Está na Seção 5 (Linhas Vermelhas).
6. **Ao gerar prompt para o AI Studio:** use o formato da Seção 7.2. Inclua PASSO 0 (diagnóstico), ESCOPO, PROIBIDO, CRITÉRIOS DE ACEITE, VALIDAÇÃO MANUAL.
7. **Ao reportar resultado:** use o formato "Arquivos tocados: [lista]. Nenhum outro arquivo alterado. [Resultado da validação]".
8. **Idioma:** português do Brasil.
9. **Tom:** direto, prático, sem enrolação. O Douglas já está com 10 sprints de estrada e não precisa de ensaio.

---

## 13. HISTÓRICO DE SPRINTS (referência)

| Sprint | O que entregou | Status |
|---|---|---|
| 1-6 | Cadência, Lote, Score, Coach, Supervisor, Trigger diário | ✅ |
| R7 | Painel de Metas (slider, bônus) | ✅ |
| R7.1 | Correção nomenclatura "Bônus por Pontos Totais" | ✅ |
| R8 | Ficha Cadastral + Verificação Parceiro Santander | ✅ |
| H2.1 | Novo Kanban (5 colunas, cards high-density) | ✅ |
| H2.1 Clean | Faxina visual (sem emojis) | ✅ |
| Sprint 7 Pivot | Fluxo Sniper de 1 clique, Teleprompter, responsividade | ✅ |
| Sprint 7.1 | Design System High-Density (largura fixa 280px) | ✅ |
| Sprint 8.0 | App Shell (Sidebar, Topbar, Modo Foco) | ✅ |
| Sprint 8.1 | ClientDossier (pós-venda) — **substituiu LeadDetailDrawer (regressão)** | ⚠️ Revertido |
| Sprint 8.2 | Cockpit de Ataque (simplificar ClientDossier) | ⚠️ Parcial |
| S-WIRING-FIX | Corrigir inversão (card → LeadDetailDrawer, PIX/Máq → ClientDossier) | ✅ |
| S-POSVENDA-ABA | ClientDossier virou aba Pós-Venda do LeadDetailDrawer | ✅ |
| S-FIX-LINK-PIX-v2 | Link correto + PIX/Máq com stopPropagation | ⏸️ Pendente (amanhã) |

---

*Fim do CONTEXTO-MESTRE. Este documento é a fonte da verdade do iCtx. Toda decisão deve ser confrontada com ele.*
