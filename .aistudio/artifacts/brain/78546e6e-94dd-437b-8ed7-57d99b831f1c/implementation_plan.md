# S-DINHEIRO-A: Base de Dados, Fechamento Estável, Migração Idempotente e Elegibilidade Receita

Plano técnico para consolidar a integridade financeira do CRM iCtx na esteira de dados (sem alterações de UI), garantindo persistência imutável de `dataFechamento`, datas de ativação configuráveis, cálculo de pontos em fuso local e elegibilidade oficial via dados da Receita Federal.

## User Review & Decisões Críticas

> [!IMPORTANT]
> O escopo é restrito exclusivamente aos 5 arquivos de infraestrutura e regras (`src/utils/ativacao.ts`, `src/utils/pontos.ts`, `src/services/cnpjService.ts`, `src/App.tsx`, `src/types/crm.ts` e anotações em `REGRAS.md`). Nenhuma interface de usuário ou componente visual será modificado nesta etapa.

- **Item 4 (dataFechamento)**: Gravado em `handleUpdateLeadStatus` ao entrar em `fechado` se ausente; remoção de `dataUltimoContato` da cadeia de fallback em `ativacao.ts` para evitar que pontos evaporem com novos contatos.
- **Item 5 (Data de ativação editável)**: 3º parâmetro opcional em `definirPix` e `definirMaquinaVendas`, mais helpers `corrigirDataAtivacaoConta` e `corrigirDataAtivacaoMaquina`.
- **Item 7 (Migração idempotente)**: `useEffect` em `App.tsx` sem flag global de navegador, rodando por lead apenas quando `status !== 'fechado'`, replicado em `autocorrigeLead`.
- **Item 10 (Fuso Local)**: Eliminação de `toISOString().slice(0, 7)` em `pontos.ts` em favor de `dataLocalISO(new Date()).slice(0, 7)`.
- **Elegibilidade Receita**: Prioridade máxima para `dataCompletaReceita.opcao_pelo_mei`, prevenindo falsos negativos de MEI+.
- **Fit Energia**: Helper `definirFitEnergia` e integração no cálculo pontual.

---

## 1. Visão Geral e Conceito

```
┌────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DO S-DINHEIRO-A                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Mudança para Fechado] ──> Grava lead.dataFechamento (se ausente)     │
│                                    │                                   │
│                                    ▼                                   │
│  [Abertura da Janela]   ──> dataAbertura ?? dataFechamento (Local)     │
│                             (sem dataUltimoContato instável)           │
│                                    │                                   │
│                                    ▼                                   │
│  [Elegibilidade]        ──> Receita Federal: opcao_pelo_mei            │
│                             (Fallback: heurística de nome)             │
│                                    │                                   │
│                                    ▼                                   │
│  [Pontuação / Metas]    ──> Mês corrente via dataLocalISO (SP)         │
│                             Ativação com data customizada ou agora     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mudanças por Arquivo

### 1) `src/types/crm.ts`
- Garantir a presença de `dataCompletaReceita?: { opcao_pelo_mei?: boolean; [key: string]: any }` na interface `Lead`.
- Manter todos os campos existentes como opcionais e imutáveis.

### 2) `src/utils/ativacao.ts`
- **Função de Abertura**: Atualizar `obterDataReferenciaAbertura(lead)` (e exportar `abertura(lead)`) para usar apenas `lead.dataAbertura ?? lead.dataFechamento?.slice(0, 10) ?? null`, eliminando completamente `dataUltimoContato`.
- **Parâmetro de Ativação**: Adicionar 3º parâmetro opcional `dataAtivacao?: string` em `definirPix` e `definirMaquinaVendas`. Se ausente, usa `dataLocalISO(agora)`.
- **Helpers de Correção**:
  - `export function corrigirDataAtivacaoConta(lead: Lead, dataISO: string): Lead`
  - `export function corrigirDataAtivacaoMaquina(lead: Lead, dataISO: string): Lead`
  - `export function definirFitEnergia(lead: Lead, dataISO: string | undefined): Lead`
- **Autoteste**: Atualizar `selfTestAtivacao()` para cobrir as novas assinaturas e validar que `dataUltimoContato` não gera mais fase.

### 3) `src/utils/pontos.ts`
- **Fuso Local**: Importar `dataLocalISO` de `./ativacao` e substituir todas as ocorrências de `toISOString().slice(0, 7)` em `potencial()` e helpers de mês.
- **Elegibilidade**: Atualizar `elegivel(lead)` para checar `(lead as any).dataCompletaReceita?.opcao_pelo_mei`.
- **Autoteste**: Expandir `selfTestPontos()` com casos de elegibilidade pela Receita (`opcao_pelo_mei === false` elegível mesmo com `isMei: true`, `opcao_pelo_mei === true` inelegível).

### 4) `src/services/cnpjService.ts`
- Em `autocorrigeLead`: adicionar migração idempotente de `dataAbertura -> cnpjInicio` apenas quando `lead.dataAbertura && !lead.cnpjInicio && lead.status !== 'fechado'`.

### 5) `src/App.tsx`
- Em `handleUpdateLeadStatus`: gravar `dataFechamento: new Date().toISOString()` ao transicionar para `fechado` se ainda não preenchido.
- No `useEffect` de migração: substituir a migração com `MIGRATION_FLAG` pela verificação idempotente por lead, respeitando `lead.status !== 'fechado'`.

### 6) `REGRAS.md`
- Atualizar a seção §7 ("Definições críticas") com as novas diretrizes de `dataFechamento`, elegibilidade pela Receita, fuso horário local e Fit Energia.

---

## 3. Critérios de Aceite e Verificação

1. **Compilação**: `lint_applet` e `compile_applet` sem erros.
2. **Autotestes**: `selfTestAtivacao()` e `selfTestPontos()` retornando `[]`.
3. **Buscas de Validação**:
   - `grep` por `dataUltimoContato` na cadeia de abertura -> 0 resultados.
   - `grep` por `toISOString().slice(0, 7)` em `pontos.ts` -> 0 resultados.
   - `grep` por `opcao_pelo_mei` em `pontos.ts` -> presente em `elegivel()`.
4. **Sem Alterações Fora do Escopo**: Nenhuma tela ou componente de UI modificado.
