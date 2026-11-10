# CONTEXTO-MESTRE — iCtx CRM

> Este documento é o contrato operacional do projeto iCtx.
> Toda IA que for consultada deve ler integralmente ANTES de propor qualquer código, sprint ou refatoração.
> Em caso de conflito entre este documento e uma sugestão de IA, ESTE DOCUMENTO PREVALECE.
> Última atualização: 2026-11-10 (v3 — Score reformulado + Aderência D1 + abas do Sheets).

---

## 0. COMO USAR ESTE DOCUMENTO

1. Antes de qualquer prompt, cole este arquivo no contexto da IA.
2. Se a IA propuser algo que contradiz uma seção "CONGELADO" ou "LINHA VERMELHA", rejeite imediatamente.
3. Se a IA propuser refatoração em massa sem atrito real registrado, rejeite.
4. Este documento é vivo: atualize quando uma regra mudar (e registre a data).
5. Registro de mudanças v2 → v3 (2026-11-10):
   - Score 0-10 → Score de Aderência Santander 0-100 (baseado em CNAEs D1)
   - §14 nova: Aderência D1 (fonte: planilha oficial Santander)
   - §15 nova: Abas do Google Sheets
   - §10: Zod+Zustand marcado como HISTÓRICO MORTO
   - §11: frase truncada removida (descartada)

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
| Backend | Google Sheets API v4 + Apps Script (NÃO migrar) |
| Usuário principal | Douglas (operador único na construção; time de 10-15 executivos em operação) |
| Produto vendido | Maquininha **Fit Energia** via parceria **Santander** (com GetNet) |
| Portal de produção | **Almeida Krüger (AK)** |
| Metas | 12 contas/mês; 200-400 leads/dia; 100-130 pontos; time de 10-15 executivos |
| Operação real (fase atual) | 30-50 leads/dia (validação antes de escalar) |
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

**Nota:** existiu no passado uma menção a um "9º passo — frequência de resposta", originada de uma mensagem truncada no chat antigo. **Descartada em 2026-11-10** por falta de contexto. Se voltar a aparecer como requisito real durante uso em campo, reabrir.

---

## 3. O QUE ESTÁ CONGELADO (não remover sem aprovação explícita)

Estes itens foram construídos, validados e são o motor do sistema. **Nenhuma IA pode removê-los, substituí-los ou reescrevê-los sem aprovação explícita do Douglas.**

### 3.1 Componentes de UI

| Componente | O que faz | Por que está congelado |
|---|---|---|
| **`LeadDetailDrawer.tsx`** | Abre ao clicar no card. Tem 4 abas: WhatsApp (Sniper), Roteiro (Teleprompter), Dossiê (Ficha Cadastral, Cadência, Parceiro Santander, Gestão de Cadência, Score, Coach), Pós-Venda (só em lead fechado) | É o motor de vendas. Já foi removido uma vez (Sprint 8.1) e virou regressão grave |
| **`PipelineKanban.tsx`** | Kanban de 5 colunas: Novo, Em Prospecção, Negociação, Fechado, Descartado | Estrutura do funil. Reduzir para 5 colunas foi decisão de UX |
| **`LeadCard.tsx`** | Card compacto (280px). Mostra empresa, contexto, telefone, cadência (X/3), badge de score (HOT/Alvo/Médio/Baixo/Muito Baixo/Descarte/Compliance), borda de risco | Post-it de alta densidade. Já foi "engordado" e revertido |
| **`MetasDashboard.tsx`** | Slider de simulação de pontos, bônus por faixa, bônus equipe | Ferramenta de motivação financeira |
| **`SupervisorDashboard.tsx`** | Funil, taxa por CNAE, taxa por template, ranking, mapa de calor geográfico | Painel de gestão |
| **`MiningDashboard.tsx`** | Central de mineração (abas Minerar, Cobertura, Retorno AK, Histórico) | Motor de aquisição de leads |
| **`App.tsx`** | Estado global, orquestração de modais, sync 3-way, migrações idempotentes | Coração de persistência |

### 3.2 Lógica de negócio

| Regra | Onde vive | Por que congelado |
|---|---|---|
| **Cadência 0/3** | `cadencia.ts` + `LeadDetailDrawer` | D+3 (contato_1), D+3 (contato_2), D+5 (contato_3), D+2 (negociação) |
| **Score de Aderência (0-100)** | `scoring.ts` + `data/cnaeAderencia.ts` | **Reformulado em 2026-11-10.** 3 camadas: Fit Produto (0-60, baseado em CNAEs D1), Fit Porte (0-30), Fit Engajamento (0-10). CNAE de risco → -1. |
| **Aderência D1** | `data/cnaeAderencia.ts` | 1.303 CNAEs classificados: 521 COM_PAR, 754 SEM_PAR, 28 risco. Fonte: planilha oficial Santander. |
| **Pontos M0/M1/M2** | `ativacao.ts` + `pontos.ts` | M0/M1 pagam cheio, M2 paga 50% (retenção), M3+ = 0 |
| **Fator de pontos** | `fatorPontos(fase)` | M0=1.0, M1=1.0, M2=0.5, expirado=0 |
| **Elegibilidade MEI** | `pontos.ts` → `elegivel()` | Fonte primária: Receita (`opcao_pelo_mei`). MEI comum = 0 pts |
| **Completude de ativação** | `ativacao.ts` | Conta ativa = 3 PIX + comprovante. Máquina ativa = R$500 em vendas |

### 3.3 Decisões arquiteturais

| Decisão | Alternativa rejeitada | Por quê |
|---|---|---|
| Google Sheets API v4 (escrita) + Apps Script (só trigger diário) | Firebase, Cloud SQL, Apps Script como motor de escrita | Já está estável. Migração = reescrita + risco de perda |
| `wa.me` semi-manual | WhatsApp Cloud API, Baileys, WAPI | Pago ou banível. `wa.me` é o único que preserva o número |
| Coach heurístico local (palavras-chave) | LLM (Gemini) | Zero custo, zero latência, zero LGPD |
| Lógica de negócio determinística (cadência, score, pontos) | LLM | Latência 1-3s, cota, não-determinismo |
| PWA em vez de app nativo | APK, iOS app | Zero manutenção de loja |
| **Score baseado em CNAE → Produto** | Score baseado em idade/QSA/tentativas | O score antigo não media aderência ao produto. Reformulado em 2026-11-10. |

### 3.4 Kanban — 5 colunas de UI + 8 status no tipo

**Não é bug, é design.**

| 5 colunas de UI | 8 valores no tipo `LeadStatus` |
|---|---|
| `novo` | `novo` |
| `em_prospeccao` | `em_prospeccao` + `contato_1` + `contato_2` + `contato_3` (legado migrado automaticamente) |
| `negociacao` | `negociacao` |
| `fechado` | `fechado` |
| `descartado` | `descartado` |

Migração automática no `App.tsx` inicial: `contato_1/2/3` → `em_prospeccao` + `cadenciaContatos` = 1/2/3. Cadência rastreada pelo campo `cadenciaContatos: 0 | 1 | 2 | 3`.

---

## 4. O QUE ESTÁ EM ITERAÇÃO (pode mudar com cuidado)

| Item | Estado | Próximo passo |
|---|---|---|
| Aba **Pós-Venda** do LeadDetailDrawer | Recém-criada (S-POSVENDA-ABA) | Validar conteúdo, refinar layout |
| Link da **Conta PJ** | Errado no código atual | Corrigir para `https://www.santander.com.br/conta-empresarial/cnpj?utm_source=email&utm_medium=devolucao&utm_campaign=nucleo` |
| **PIX/Máq** do card | Ainda clicáveis (abrem LeadDetailDrawer) | Fix com `e.stopPropagation()` no wrapper — NÃO usar `pointer-events-none` |
| **SupervisorDashboard funil** | Mostra 7 etapas antigas (contato_1/2/3 zeradas) | Corrigir para 5 etapas; exibir `cadenciaContatos` como sub-métrica |
| **storage.ts → `KANBAN_COLUMNS`** | Código morto (7 colunas legado) | Remover em sprint de faxina |
| **S-FIX-LINK-PIX-v2** | Pendente (link Santander + stopPropagation) | Confirmar se foi aplicado |
| **Design System** (tokens, componentes base) | Não implementado | Sprint 9 (só depois dos 7 dias de uso real) |
| **Safras** (filtro na topbar + ciclo M1/M2) | Não implementado | Sprint 10 ou 11 (depois dos 7 dias) |
| **Sniper como grid 3×2** (botões quadrados) | Ideia anotada | Sprint 10+ (depois dos 7 dias) |
| **Recomendação automática de oferta** (por CNAE + faturamento) | Não implementado | Horizonte 2 (depois de estabilizar) |
| **Alerta de compliance** (CNAE de risco) | Não implementado — atualmente só o Score retorna -1 | Horizonte 2 |
| **Estender `cnaeAderencia.ts`** | 1.303 CNAEs cobertos (BOM) | Se aparecer lead com CNAE fora da base em produção, adicionar |

---

## 5. LINHAS VERMELHAS (nunca)

Estas regras não são negociáveis. Qualquer IA que sugerir uma delas deve ser corrigida imediatamente.

| # | Linha vermelha | Motivo |
|---|---|---|
| 1 | **WhatsApp não oficial** (Baileys, WAPI, wppconnect, whatsapp-ai-framework) | Violação de ToS da Meta → banimento permanente do número |
| 2 | **WhatsApp Cloud API oficial para 200+/dia** | Pago por conversa. Inviável na premissa "gratuito" |
| 3 | **Migração para Firebase / Cloud SQL** | Reescrita completa. Risco de perda. Backend atual está estável |
| 4 | **LLM para lógica de negócio** (cadência, score, SLA, pontos) | Latência 1-3s, cota, não-determinismo |
| 5 | **Refatoração em massa** ("vamos reescrever o componente X") | É o que gerou o Frankenstein. Migração sempre incremental, guiada por atrito real |
| 6 | **Substituir componentes que funcionam** (LeadDetailDrawer, Sniper, Teleprompter, Ficha Cadastral) | Já tentamos no Sprint 8.1. Virou regressão grave |
| 7 | **Prometer limite de crédito pré-aprovado ao cliente** | Violação de compliance do Santander. Frase correta: "vamos verificar o que é possível habilitar" |
| 8 | **Forçar venda casada** (conta + máquina) | Violação de compliance |
| 9 | **Rodar 2 prompts seguidos sem validar** | O AI Studio pode quebrar o anterior |
| 10 | **Aceitar "Build executado com sucesso" como validação** | "Compila sem erros" ≠ "funciona no fluxo real" |
| 11 | **Score baseado em idade de empresa, QSA ou tentativas (modelo antigo 0-10)** | Não mede aderência ao produto. Substituído por Score de Aderência Santander |
| 12 | **Perseguir CNAE de risco** (câmbio, lotérica, joalheria, metais preciosos, fogos, blindados) | Compliance. Score retorna -1 automaticamente |

---

## 6. ESTADO ATUAL (2026-11-10)

### 6.1 O que está funcionando

- ✅ Card click → `LeadDetailDrawer` (WhatsApp/Roteiro/Dossiê/Pós-Venda)
- ✅ Aba Pós-Venda condicional (só aparece em lead fechado)
- ✅ Sniper (6 gatilhos de 1 clique)
- ✅ Teleprompter de ligação (4 roteiros)
- ✅ Ficha Cadastral (5 campos + Copiar Tudo)
- ✅ Cadência 0/3 com botão "+ Registrar Tentativa"
- ✅ Verificação Parceiro Santander (Apto/Bloqueado)
- ✅ Kanban de 5 colunas com drag & drop
- ✅ **Score de Aderência Santander (0-100)** baseado em CNAEs D1 — validado em 2026-11-10
- ✅ Cadência visual, borda de risco
- ✅ Metas Dashboard (slider, bônus)
- ✅ Supervisor Dashboard (funil, CNAE, template, ranking, mapa de calor)
- ✅ Google Sheets API v4 (Firebase Auth + OAuth) — sync 3-way, debounce 3s
- ✅ Central de Mineração (abas Mineração_Fila / Mineração_Config / Mineração_Cartuchos / Mineração_AK)
- ✅ AI Coach Local (heurístico por palavras-chave)
- ✅ Notificações Web Push 9h (via Service Worker)

### 6.2 Bugs conhecidos (pendentes)

| Bug | Causa | Fix planejado |
|---|---|---|
| PIX/Máq do card abrem LeadDetailDrawer ao clicar | Clique borbulha até o card | `e.stopPropagation()` no wrapper dos ícones — **NÃO usar `pointer-events-none`** |
| Link da Conta PJ errado | Link genérico no código | Substituir pelo oficial do Santander |
| Funil do Supervisor com 7 etapas antigas | Código não migrado para 5 colunas | Substituir 7 etapas por 5; cadência como sub-métrica |

### 6.3 O que NÃO está sendo usado

- `ClientDossier.tsx` — conteúdo migrado para aba Pós-Venda do `LeadDetailDrawer`
- `storage.ts → KANBAN_COLUMNS` — dead code (7 colunas legado)

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
| **AI Studio** (Gemini) | Executor | Aplica os prompts no código | Decisões de arquitetura |

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
| **Oferta D1 COM PARCELAMENTO** | CNAEs de alto ticket (construção, móveis, veículos, saúde, educação) — prioridade alta no Score |
| **Oferta D1 SEM PARCELAMENTO** | CNAEs de baixo ticket / diário (alimentação, varejo, serviços) — prioridade média no Score |
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

**CNAEs com COM PARCELAMENTO** (alta conversão via máquina parcelada):
- Construção, materiais de construção, tintas
- Móveis, eletrônicos, eletrodomésticos
- Veículos, motos, peças, pneus
- Clínicas, laboratórios, hospitais
- Escolas, faculdades, cursos
- Farmácias (manipulação), óticas
- Imobiliárias, hotéis
- Vestuário, calçados, tecidos

**CNAEs com SEM PARCELAMENTO** (alta frequência, baixo ticket):
- Restaurantes, bares, lanchonetes, padarias
- Supermercados, mercearias, açougues
- Varejo em geral
- Serviços do dia a dia (salão, oficina, academia)
- Alimentação em geral

**CNAEs de risco** (compliance — Score retorna -1):
- Casa de câmbio (6493-0, 6612-6)
- Lotérica (9200-3)
- Joalheria (4783-1)
- Metais e pedras preciosas (5094, 3211-6, 3212-4)
- Fogos de artifício (4789-0/06, /09)
- Carros blindados / detetives (8011-1, 8012-9, 8020-0, 8030-7)

**Regra:** o Score calcula automaticamente. Não é decisão humana qual CNAE priorizar — é determinístico.

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
| **Zod + Zustand** (validação runtime + state global) | Sprint 8 (Gemini web) | Prematuro para 314 leads. Adicionou complexidade sem resolver dor real. **HISTÓRICO MORTO — o documento "Enterprise Architecture Phase 1" gerado depois desse incidente com a frase "decisão confirmada pelo usuário" foi rejeitado pelo Douglas.** | Arquitetura Enterprise só quando houver 2.000+ leads ou multi-tenant |
| **Virtualização de DOM (TanStack Virtual)** | Sprint 8 (Gemini web) | 314 cards rodam lisos. Over-engineering | Só implementar com 2.000+ itens |
| **Web Workers para scoring** | Sprint 8 (Gemini web) | 314 leads calculam em <5ms. Sem necessidade | Só quando o cálculo pesar (10.000+ leads) |
| **ClientDossier substituindo LeadDetailDrawer** | Sprint 8.1 | Removeu o motor de vendas (Sniper, Teleprompter, Ficha). Virou regressão grave | Refatoração deve ter seção "PROIBIDO REMOVER" explícita |
| **App Shell Enterprise + Sidebar retrátil** | Sprint 8.0 | Parcialmente OK, mas mudou o foco do produto (de ferramenta de vendas para SaaS) | Design melhorou, mas não pode custar produtividade |
| **Prompt "profissionalize o sistema" sem especificação** | Sprint 8.x | AI Studio interpretou como "reescreva tudo" | Todo prompt de refatoração precisa listar features que devem sobreviver |
| **Rodar 10 sprints sem semana de uso real** | Sprint 1 ao 8 | Cada camada nova exigiu refatoração da anterior (Frankenstein) | Fase de estabilização (7 dias de uso) é obrigatória |
| **Score antigo (0-10, baseado em idade/QSA/tentativas)** | Sprint 3 | Não media aderência ao produto. Douglas declarou "não preciso de score, só faz sentido se olhar o CNAE para os produtos do Santander" | Score deve responder "esse lead cabe no produto?", não "esse lead parece bom?" |

---

## 11. PENDÊNCIAS ABERTAS

| # | Pendência | Impacto | Como resolver |
|---|---|---|---|
| 1 | Fix do PIX/Máq clicável | UX (clique indesejado) | `e.stopPropagation()` no wrapper dos ícones |
| 2 | Link da Conta PJ errado | Operacional (cliente recebe link errado) | Substituir pelo link oficial do Santander |
| 3 | ~~Frase truncada sobre "frequência de resposta"~~ | ~~Requisito não capturado~~ | **Descartada em 2026-11-10** — contexto perdido. Reabrir só se aparecer em uso real |
| 4 | Origem exata dos leads (como chegam?) | Automação de cadastro | Perguntar ao Douglas durante uso real |
| 5 | Lista de atritos da semana de uso real | Direciona próximo sprint | Douglas usar o app por 7 dias e anotar |
| 6 | Design System (tokens + componentes base) | Unificação visual | Sprint 9 (depois dos 7 dias) |
| 7 | Safras (filtro topbar + ciclo M1/M2) | Gestão temporal | Sprint 10 ou 11 |
| 8 | Sniper em grid 3×2 | UX (compactação) | Sprint 10+ |
| 9 | Recomendação automática de oferta (CNAE + faturamento) | Vendas | Horizonte 2 |
| 10 | Alerta de compliance visível (CNAE de risco) | Compliance | Horizonte 2 — atualmente só o Score retorna -1 |
| 11 | Corrigir funil do Supervisor (7 → 5 etapas) | Métricas corretas | Sprint de faxina |
| 12 | Remover `storage.ts → KANBAN_COLUMNS` | Higiene de código | Sprint de faxina |
| 13 | Confirmar se S-FIX-LINK-PIX-v2 foi aplicado | UX + Operacional | Testar no app |
| 14 | Recalibrar thresholds de Score após 7 dias de uso real | Score útil vs. score ruído | Ajustar limites 85/65/45/25/10 se necessário |

---

## 12. INSTRUÇÕES PARA A IA RECEPTORA

Se você é uma IA lendo este documento pela primeira vez:

1. **Leia integralmente.** Não pule seções.
2. **Respeite as seções 3 (Congelado) e 5 (Linhas Vermelhas).** São invioláveis.
3. **Antes de propor qualquer código, pergunte:** *"Isso acelera um dos 8 passos do fluxo operacional (Seção 2)?"* Se não, é secundário.
4. **Antes de propor refatoração, pergunte:** *"Existe atrito real registrado por uso em campo?"* Se não, rejeite.
5. **Antes de sugerir migração de backend, LLM para lógica, WhatsApp não oficial, ou score baseado em idade/QSA:** pare. Está na Seção 5 (Linhas Vermelhas).
6. **Ao gerar prompt para o AI Studio:** use o formato da Seção 7.2. Inclua PASSO 0 (diagnóstico), ESCOPO, PROIBIDO, CRITÉRIOS DE ACEITE, VALIDAÇÃO MANUAL.
7. **Ao reportar resultado:** use o formato "Arquivos tocados: [lista]. Nenhum outro arquivo alterado. [Resultado da validação]".
8. **Idioma:** português do Brasil.
9. **Tom:** direto, prático, sem enrolação. O Douglas já está com 10+ sprints de estrada e não precisa de ensaio.

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
| Sprint 8.1 | ClientDossier (pós-venda) — substituiu LeadDetailDrawer | ⚠️ Revertido |
| Sprint 8.2 | Cockpit de Ataque (simplificar ClientDossier) | ⚠️ Parcial |
| S-WIRING-FIX | Corrigir inversão (card → LeadDetailDrawer, PIX/Máq → ClientDossier) | ✅ |
| S-POSVENDA-ABA | ClientDossier virou aba Pós-Venda do LeadDetailDrawer | ✅ |
| S-FIX-LINK-PIX-v2 | Link correto + PIX/Máq com stopPropagation | ⏸️ Pendente (verificar) |
| Sprint 10 / 11 | Central de Mineração Integrada | ✅ |
| Sprint 11.4 | Widget Flutuante de Mineração em Segundo Plano | ✅ |
| **SCORE-D1** | **Reformulação do Score (0-10 → 0-100) baseado em 1.303 CNAEs da Oferta D1** | ✅ 2026-11-10 |

---

## 14. ABAS DO GOOGLE SHEETS

Fonte única de verdade sobre a estrutura da planilha "iCtx - Base de Leads PJ".

| Ordem | Aba | Conteúdo |
|---|---|---|
| 1 | **Leads** | Base principal. Colunas A-R. **Coluna R = JSON completo do lead** (fonte de verdade na leitura) |
| 2 | **Mineração_Fila** | Fila de jobs de mineração (status por bairro) |
| 3 | **Mineração_Config** | Parâmetros de mineração (CNAEs, municípios, bairros) |
| 4 | **Mineração_Cartuchos** | Leads acumulados pelo robô de mineração |
| 5 | **HistoricoContatos** | Log de disparos WhatsApp e ligações |
| 6 | **Mineração_AK** | Retorno do Portal Almeida Krüger (processarAK) |
| 7 | **Backup_AAAA-MM-DD** | Backup diário (1 aba por dia, gerada automaticamente) |

**Escrita:** `saveAllLeadsToSheet` grava A2:R(n+1) via API v4, limpa linhas excedentes abaixo. Nunca deixa a planilha vazia em momento intermediário.

**Leitura:** `fetchLeadsFromSheet` lê prioritariamente a coluna R (JSON). As demais colunas são espelho legível.

**Sync:** 3-way merge (`src/utils/syncMerge.ts`) com hash FNV-1a 32-bit em `localStorage['ictx_sync_base']`. Resolução: ambos com hash igual → local; remoto = base → local; local = base → remoto; divergentes → local (conflitos++).

---

## 15. ADERÊNCIA D1 (referência técnica)

Fonte: planilha oficial Santander — "Relação de CNAEs aderentes à Oferta D1 Com ou Sem Parcelamento".

**Arquivo:** `src/data/cnaeAderencia.ts`

**Estrutura:**

```typescript
export const CNAE_COM_PARCELAMENTO: Set<string>;  // ~521 CNAEs
export const CNAE_SEM_PARCELAMENTO: Set<string>;  // ~754 CNAEs
export const CNAE_RISCO: Set<string>;              // 28 CNAEs

export function classificarCnae(cnaeCodigo: string | undefined | null):
  'com_parcelamento' | 'sem_parcelamento' | 'fora' | 'risco';

export const TAMANHOS = { risco: 28, comParcelamento: 521, semParcelamento: 754 };
```

**Regras de classificação:**
1. Verifica **risco primeiro** (bloqueia tudo)
2. Depois **COM PARCELAMENTO** (prioridade alta)
3. Depois **SEM PARCELAMENTO** (prioridade média)
4. Se não bater em nenhum → **fora** (não qualifica para D1)

**Inconsistência da planilha tratada:** a planilha mistura CNAEs de 6 e 7 dígitos. O helper `classificarCnae` tenta match bidirecional (adiciona "0" se 6 dígitos; remove "0" final se 7).

**Uso pelo Score:** ver §3.2. NÃO alterar sem atualizar este documento e o `scoring.ts`.

**Fórmula de cálculo do Score (referência executável):**
```
FIT PRODUTO (0-60): COM_PAR=60, SEM_PAR=45, fora=15, risco=-1
FIT PORTE  (0-30): MEI+ ou fat≥60k=30; fat≥20k=22; fat≥5k=15; ME≥1a=10; ME<1a=8; MEI=3
FIT ENGAJ. (0-10): respondeu=10; 1+ tentativa=5; senão=0
Fechado/descartado = -1

Score = max(0, min(100, soma))
```

**Thresholds de exibição:**
| Score | Badge |
|---|---|
| ≥85 | 🔥 HOT |
| 65-84 | 🟢 Alvo |
| 45-64 | 🟡 Médio |
| 25-44 | ⚪ Baixo |
| 10-24 | 🔵 Muito Baixo |
| <10 | ⚫ Descarte |
| -1 | ⛔ Compliance |

---

*Fim do CONTEXTO-MESTRE v3. Este documento é a fonte da verdade do iCtx. Toda decisão deve ser confrontada com ele.*
