# Enterprise Architecture Phase 1 — Zod Runtime Validation & Zustand Store

Implementação da fundação de engenharia corporativa no iCtx CRM, integrando validação de dados em runtime via Zod (`LeadSchema`) e gerenciamento de estado global imutável com persistência via Zustand (`useCrmStore`).

> [!IMPORTANT]
> **Decisão Confirmada com o Usuário:**
> - **Frente Prioritária**: Criação do Schema Zod e da Store Zustand para os Leads, estabelecendo a camada de tipagem segura em tempo de execução e a store desacoplada de `useEffect` locais antes de refatorar os componentes de apresentação.
> - **Compatibilidade Rigorosa**: O schema Zod utilizará `.passthrough()` para respeitar a **Regra 2 de REGRAS.md** (preservar campos desconhecidos de integrações existentes, Google Sheets v4 e histórico de campanhas).

---

### 1. Visão Geral e Benefícios Arquiteturais

Atualmente, o iCtx CRM opera com interfaces estáticas de TypeScript, suscetíveis a divergências quando dados externos são lidos do LocalStorage, Google Sheets ou arquivos importados. A introdução de **Zod + Zustand** entrega:

1. **Zero-Crash Data Ingestion**: Validação determinística de contratos de dados em runtime (`LeadSchema.safeParse`), blindando o pipeline de renderização contra objetos malformados ou nulos.
2. **Eliminação de Re-renders Cascata**: Seletores atômicos no Zustand (`useCrmStore(state => state.leads)`) evitam que a atualização de um único card de lead renderize colunas inteiras do Kanban.
3. **Mutações Otimistas Puras**: Atualizações de status e notas ocorrem de forma síncrona na store com timestamp ISO automático, persistindo no LocalStorage de forma reativa e previsível.

---

### 2. Estrutura e Contratos de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW & PERSISTENCE                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌────────────────────────┐                        ┌──────────────────────┐
│  src/schemas/lead.ts   │                        │ src/store/crmStore.ts│
├────────────────────────┤                        ├──────────────────────┤
│ • LeadSchema (Zod)     │◄───────────────────────│ • Zustand + persist  │
│ • SocioSchema          │   valida e tipa        │ • leads: Lead[]      │
│ • ContatoLogSchema     │   automaticamente      │ • updateLeadStatus() │
│ • parseLeadsArray()    │                        │ • addLead() / remove │
└──────────┬─────────────┘                        └──────────┬───────────┘
           │                                                 │
           └────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │     Consumidores iCtx        │
                     │  (App.tsx / Kanban / Sync)   │
                     └──────────────────────────────┘
```

#### 2.1. `src/schemas/leadSchema.ts`
- **Schema Zod Completo**:
  - `id`: string (UUID ou fallback gerado).
  - `cnpj`: string (sanitizado com 14 dígitos).
  - `razaoSocial`, `nomeFantasia`, `empresaExibicao`: strings com fallbacks defensivos.
  - `telefonePrincipal`, `telefonePrincipalFormatado`: validação de formato numérico.
  - `status`: enum estrito `['novo', 'em_prospeccao', 'negociacao', 'fechado', 'descartado', 'contato_1', 'contato_2', 'contato_3']`.
  - `socios`: array com schema `{ nome: string, qualificacao: string }`.
  - `historicoContatos`: array validado de logs.
  - `faturamentoMensal`, `cnae`, `statusContaPJ`, `modeloEquipamento`, `statusPedidoPOS`, `completudeCadastral`: campos da esteira Santander/Getnet.
  - `.passthrough()`: preserva atributos adicionais e legados da planilha.
- **Funções Utilitárias**:
  - `safeParseLead(raw: unknown): Lead | null`
  - `parseLeadsArray(rawList: unknown[]): Lead[]`

#### 2.2. `src/store/crmStore.ts`
- Store tipada criada via `create<CrmStore>()(persist(...))`
- Estado e ações:
  - `leads: Lead[]`
  - `selectedLeadId: string | null`
  - `setLeads: (leads: Lead[]) => void`
  - `updateLeadStatus: (id: string, status: LeadStatus, extra?: Partial<Lead>) => void`
  - `updateLead: (id: string, data: Partial<Lead>) => void`
  - `addLead: (lead: Lead) => void`
  - `deleteLead: (id: string) => void`
  - `setSelectedLeadId: (id: string | null) => void`
- Middleware `persist` configurado na chave `'ictx-storage'`.

---

### 3. Plano de Execução Técnica

1. **Instalação de Dependências**:
   - `install_applet_package`: `zod` e `zustand`.
2. **Criação do Schema Zod (`src/schemas/leadSchema.ts`)**:
   - Implementar o schema formal, exportar o tipo inferido `Lead` compatível com a interface atual e expor helpers de sanitização.
3. **Criação da Store Zustand (`src/store/crmStore.ts`)**:
   - Implementar store com `persist`, validação na entrada através do schema Zod e mutações puras imutáveis.
4. **Validação & Compilação**:
   - Executar `lint_applet` (`tsc --noEmit`) e `compile_applet`.
   - Garantir 0 erros de tipagem e integridade total com o código existente.
