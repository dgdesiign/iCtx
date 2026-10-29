# S-ATIVAÇÃO-A — Fix Crítico do Erro 401 & Indicador de Pendências de Sync

Resolução do problema de perda silenciosa de alterações no Google Sheets quando o token OAuth expira durante a sessão do usuário, implementando reautenticação com silent retry, propagação explícita de `TOKEN_EXPIRADO` e indicador visual no Header com contagem de pendências.

> [!IMPORTANT]
> **Escopo Restrito (Exatamente 5 arquivos):**
> 1. `src/services/googleAuthService.ts` (`tentarReautenticar`, `garantirTokenValido`)
> 2. `src/services/googleSheetsService.ts` (interceptar `401` com `throw new Error('TOKEN_EXPIRADO')`)
> 3. `src/App.tsx` (estado `pendingSyncCount`, helper `executarComRetry`, `calcularPendenciasLocais`, disparo com retry em saves/status)
> 4. `src/components/Header.tsx` (prop `pendingSyncCount`, ponto vermelho + badge com contagem e tooltip de pendências)
> 5. `REGRAS.md` (§3 atualizado)
>
> Proibido alterar: tipos de Lead, `ativacao.ts`, `pontos.ts`, `campanha.ts`, `LeadCard`, `LeadDetailDrawer`, `SupervisorDashboard`, outros componentes ou dependências.

---

### 1. Visão Geral da Arquitetura de Retry & Sync

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE RETRY & 401 INTERCEPT                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼────────────────────────┐
          ▼                         ▼                        ▼
 ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 │  googleSheets    │     │  App.tsx         │     │  googleAuth      │
 │  Service         │     │  executarComRetry│     │  Service         │
 ├──────────────────┤     ├──────────────────┤     ├──────────────────┤
 │ • Fetch status   │────►│ • Captura erro   │────►│ • tentarReauten- │
 │   401 detectado  │     │   'TOKEN_EXPIRADO'│    │   ticar()        │
 │ • Lança erro     │     │ • Tenta retry 1x │     │ • Atualiza       │
 │   'TOKEN_EXPIRADO'│    │ • Se falha:      │     │   sessionStorage │
 └──────────────────┘     │   pendingSync++  │     └──────────────────┘
                          └─────────┬────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  Header.tsx      │
                          ├──────────────────┤
                          │ • pendingSync > 0│
                          │   -> Ponto       │
                          │   VERMELHO com   │
                          │   badge numérico │
                          └──────────────────┘
```

---

### 2. Detalhamento Técnico das Modificações

#### 2.1. `src/services/googleAuthService.ts`
- **`tentarReautenticar(): Promise<boolean>`**:
  - Verifica se há sessão ativa (`auth.currentUser`).
  - Executa `signInWithPopup(auth, provider)` para obter credencial renovada sem perder contexto.
  - Grava o novo token e timestamp de expiração (`Date.now() + 55 * 60 * 1000`) em `sessionStorage` (`ictx_google_token`).
  - Atualiza a variável `cachedAccessToken`.
  - Retorna `true` se bem-sucedido; em caso de bloqueio de popup ou recusa, captura e retorna `false`.
- **`garantirTokenValido(): Promise<string | null>`**:
  - Inspeciona o token gravado em `sessionStorage`.
  - Se faltar menos de 60 segundos para expirar (ou já expirado), invoca `tentarReautenticar()`.
  - Retorna o token válido ou `null` caso não consiga renovar.

#### 2.2. `src/services/googleSheetsService.ts`
- Em `saveAllLeadsToSheet`, `fetchLeadsFromSheet` e `appendContactLogToSheet`:
  - Verificar se a resposta HTTP retornou status `401`.
  - Caso `status === 401`, lançar explicitamente `new Error('TOKEN_EXPIRADO')`.
  - Não tentar tratar ou renovar o token internamente no serviço; delega o retry para a camada de orquestração (`App.tsx`).

#### 2.3. `src/App.tsx`
- **Novo Estado**:
  - `const [pendingSyncCount, setPendingSyncCount] = useState(0);`
- **Função de Cálculo de Pendências Locais**:
  - `calcularPendenciasLocais(): number`: compara os leads atuais com `ictx_sync_base` usando `hashLead(l)`.
  - Atualiza `pendingSyncCount` quando há alterações ou quando o estado do sync muda.
- **Orquestrador `executarComRetry(fn: () => Promise<void>)`**:
  - Executa a operação assíncrona.
  - Se capturar `TOKEN_EXPIRADO`, chama `tentarReautenticar()`. Se retornar `true`, tenta executar `fn()` mais uma vez.
  - Se a renovação falhar ou o retry falhar, incrementa `pendingSyncCount` e registra warning no console.
- **Integração**:
  - Envolver os fluxos de save debounced e salvamento pós-atualização de status (`handleUpdateLeadStatus`).
  - Passar `pendingSyncCount={pendingSyncCount}` para `<Header />`.

#### 2.4. `src/components/Header.tsx`
- Adicionar prop `pendingSyncCount?: number` na interface `HeaderProps`.
- No botão do Google Sheets:
  - Se `pendingSyncCount > 0` e conectado: exibe ponto **VERMELHO** com badge numérico (ex: "3"), animação e tooltip `"${pendingSyncCount} lead(s) pendente(s) de sync"`.
  - Se `pendingSyncCount === 0` e conectado: ponto verde padrão de conectado.
  - Se `isGoogleSyncing`: ponto âmbar pulsante.
  - Se desconectado: mantém estado padrão.

#### 2.5. `REGRAS.md` (§3)
- Registrar na seção §3 as regras de tratamento de token expirado (401), silent refresh com `signInWithPopup`, contagem de pendências contra `ictx_sync_base` e feedback visual no Header.

---

### 3. Validação e Critérios de Aceite
1. Compilação TypeScript com 0 erros (`npm run build` / `compile_applet`).
2. Exatamente os 5 arquivos de escopo tocados.
3. `selfTestAtivacao()`, `selfTestPontos()` e `selfTestMerge()` passando com `[]`.
4. Validação do `TOKEN_EXPIRADO` em `googleSheetsService.ts`.
5. Validação de `tentarReautenticar` em `googleAuthService.ts`.
6. Validação de `pendingSyncCount` em `App.tsx` e `Header.tsx`.
