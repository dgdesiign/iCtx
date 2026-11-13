# CONTEXTO-MESTRE — iCtx CRM (v5)

> Este documento é o contrato operacional do projeto iCtx.
> Toda IA consultada deve ler integralmente ANTES de propor código.
> Em caso de conflito entre este documento e uma sugestão de IA, ESTE DOCUMENTO PREVALECE.
> Última atualização: 2026-11-12 (O Fim do Frankenstein & O Faxineiro de Dados).

---

## 1. IDENTIDADE DO PROJETO

| Campo | Valor |
|---|---|
| Nome | **iCtx** (grafia oficial) |
| Tipo | CRM de Prospecção B2B focado em Conta PJ (Santander) e Adquirência (GetNet) |
| Stack Frontend | React 18 + TypeScript + Vite + Tailwind + lucide-react |
| Hospedagem | **Vercel** (Plano Hobby/Free) — Domínio: `i-ctx.vercel.app` |
| Backend de Dados | Google Sheets API v4 (via Firebase Auth) + LocalStorage (Cache) |
| Automação | **GitHub Actions** (Node.js 20) — Substituiu o Google Apps Script |
| Formato | PWA instalável (Mobile-first) |
| Produto | Maquininha Fit Energia (Santander/GetNet) |
| Orçamento | R$ 0 (100% gratuito) |

---

## 2. ARQUITETURA E FLUXO DE DADOS (O Novo Motor)

1. **Minerador 24/7 (GitHub Actions)**:
   - Roda 3 vezes ao dia (2h, 5h, 8h da manhã).
   - Lê o arquivo `bot/alvos.json` e busca CNPJs na Casa dos Dados.
   - Gera um cartucho de **exatamente 300 CNPJs** (limite do Portal AK).
   - Salva o arquivo `.xlsx` na pasta `cartuchos/`.
   - O robô "Faxineiro" (`limpar-cartuchos.yml`) apaga arquivos com mais de 30 dias todo domingo.

2. **Operação no Portal AK**:
   - O usuário baixa o cartucho pelo app (aba Perfil > Cartuchos AK).
   - Sobe no robô do Portal Almeida Krüger.
   - O AK devolve uma planilha `.xlsx` no dia seguinte apenas com os leads "Aptos".

3. **Importação no iCtx (Frontend)**:
   - O usuário usa o `BulkImportModal` para subir a planilha do AK (aceita `.xlsx`, `.csv`, `.txt`).
   - O sistema extrai os CNPJs, consulta a BrasilAPI (telefone e CNAE) e insere no Kanban.
   - **Inteligência de Telefone:** Prioriza celular (11 dígitos, começando com 9).
   - **Inteligência de Nomes:** Se o AK enviar "Sim Sucesso" ou "Não CNPJ Invalido", o sistema **descarta** como nome e marca o lead como Apto.

4. **O Faxineiro de Dados (Data Janitor)**:
   - Script no `App.tsx` que roda 1 vez no primeiro carregamento.
   - Varre a base limpando nomes corrompidos ("Sim Sucesso" -> "Consultar Receita") e consertando telefones concatenados (ex: `7198756897971987568979` -> `71987568979`).

---

## 3. O FIM DO FRANKENSTEIN (UI/UX Mobile)

*   **Login Obrigatório:** Via Firebase Auth (Google). No mobile usa Redirect, no desktop Popup. Tem timeout de segurança de 5s para não travar a tela.
*   **Design Premium:**
    *   Fonte: **Inter** (Anti-aliasing ativado).
    *   Kanban: Colunas com largura fixa (`175px` no mobile, `280px` no desktop), permitindo ver 2 colunas no Moto G34. Cores suaves nos títulos das colunas.
    *   Cards: Extremamente limpos. Mostram Cadência (0/3), Pontos REAIS (0/10 ou 0/6), Fase (M0/M1/M2) e os 4 botões (PIX, Máquina, WhatsApp, Telefone).
    *   **Dossiê (LeadDetailDrawer):** Virou um **Accordion (Sanfona)**. A Cadência e os Contatos ficam sempre abertos, mas Ficha Cadastral, Sócios, Notas e Histórico só abrem se o usuário clicar. Acabou a rolagem infinita.
    *   **Floating Action Button (FAB):** No mobile, foi substituído por um **Bottom Sheet**. Ao clicar no botão vermelho, um menu sobe de baixo com "Enriquecer", "Importar" e "Templates", sem cobrir os cards.
    *   **Navegação:** Bottom Nav fixa no mobile (Leads, Cartuchos, Metas, Perfil). O Perfil no desktop ganhou um botão no Header.

---

## 4. REGRAS DE NEGÓCIO (CONGELADAS)

*   **Score de Aderência Santander:** Calculado com base no CNAE (D1), Porte e Engajamento. Score 0-100. CNAE de risco = -1.
*   **Pontos Reais:**
    *   MEI+ ou faturamento > R$60k: Máximo **10 pontos**.
    *   Menos de 1 ano ou faturamento < R$60k: Máximo **6 pontos**.
    *   Pontos de Conta (3 PIX): 4 pts (ou 2 se <1 ano).
    *   Pontos de Máquina (R$500 em vendas): 6 pts (ou 4 se <1 ano).
    *   O card só mostra pontos verdes se o lead realmente ativou.
*   **Cadência:** Contato 1 (+3d), Contato 2 (+3d), Contato 3 (+5d), Negociação (+2d).
*   **Sincronização 3-Way:** Base no LocalStorage + Google Sheets. Leads novos sempre vencem os antigos.

---

## 5. PENDÊNCIAS CRÍTICAS PARA O iCtx 4

1. **Corrigir as Abas WhatsApp e Roteiro do `LeadDetailDrawer`:** No último arquivo entregue no iCtx 3, o código dessas duas abas foi omitido (deixamos um placeholder `<p>Interface mantida.</p>`). O iCtx 4 deve recriar essas abas integrando-as ao novo visual sanfona.
2. **Firestore (Tempo Real):** O Google Sheets demora 3s para sincronizar entre dispositivos. A meta é usar Firebase Firestore para sincronização instantânea (com Sheets apenas como backup noturno).
3. **RBAC (Hierarquia):** O app ainda trata todo mundo como "Supervisor". Precisamos ler o e-mail logado (ex: se for do Douglas = Supervisor, se for do João = Executivo) e criar a visão individual.
4. **Limpeza da Pasta `public/`:** A pasta `public/` no GitHub está cheia de arquivos `.zip` e `.json` de checkpoints antigos, expondo o código-fonte. O iCtx 4 deve apagar todos, deixando apenas ícones e o `manifest`.
5. **Ajustar o Layout das Páginas Secundárias:** Templates, Minhas Metas, Importar Lista e Backup ainda têm o visual "quadradão" antigo. Precisam do toque Premium.

---

## 6. INSTRUÇÕES PARA A IA RECEPTORA (iCtx 4)

1. **Leia tudo.** Não assuma nada do passado.
2. **Regra do Código Completo:** Sempre entregue o arquivo inteiro para copiar e colar. NUNCA diga "substitua a linha X".
3. **Regra do Cache:** Sempre que houver atualização bruta, avise o usuário para testar com `?v=5` no celular para furar o cache do Chrome.
4. **Não sugira Firebase Cloud Functions, migrações de banco pagas ou WhatsApp API.** O projeto é R$ 0.
5. **Tom:** Direto, focado em resolver o problema e economizar o tempo do usuário.