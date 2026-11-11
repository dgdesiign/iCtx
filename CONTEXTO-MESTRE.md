# CONTEXTO-MESTRE — iCtx CRM (v4)

> Este documento é o contrato operacional e a fonte única da verdade do projeto iCtx.
> Toda IA consultada deve ler integralmente antes de propor código, arquitetura ou sprints.
> Em caso de conflito entre este documento e uma sugestão da IA, ESTE DOCUMENTO PREVALECE.
> Última atualização: 2026-11-11 (A Grande Migração: Vercel, GitHub Actions, Mobile Premium).

---

## 1. IDENTIDADE DO PROJETO

| Campo | Valor |
|---|---|
| Nome | **iCtx** (grafia oficial) |
| Tipo | CRM de Prospecção B2B focado em Conta PJ (Santander) e Adquirência (GetNet) |
| Stack Frontend | React 18 + TypeScript + Vite + Tailwind + lucide-react + Firebase Auth |
| Hospedagem | **Vercel** (Plano Hobby/Free) — Domínio: `i-ctx.vercel.app` |
| Backend de Dados | Google Sheets API v4 (via Firebase Auth) + LocalStorage (Cache) |
| Automação | **GitHub Actions** (Node.js 20) — Substituiu o Google Apps Script |
| Formato | PWA instalável (Mobile-first) |
| Produto | Maquininha Fit Energia (Santander/GetNet) |
| Metas | 12 contas/mês · 200-400 leads/dia (Operação real inicia com 30-50/dia) |
| Orçamento | R$ 0 (100% gratuito) |

---

## 2. ARQUITETURA E FLUXO DE DADOS (O Novo Motor)

Nós abandonamos o Google Cloud/Apps Script para o processamento pesado. A nova esteira funciona assim:

1. **Minerador 24/7 (GitHub Actions)**:
   - Um robô em Node.js (`bot/minerar.js`) roda todos os dias às 2h da manhã.
   - Ele varre os bairros/CNAEs do arquivo `bot/alvos.json`, consulta a API da Casa dos Dados (chave salva no GitHub Secrets) e gera um arquivo `.xlsx` com **exatamente 300 CNPJs**.
   - O arquivo é salvo automaticamente na pasta `cartuchos/` do repositório.
   - Um robô "Faxineiro" (`limpar-cartuchos.yml`) apaga arquivos `.xlsx` com mais de 30 dias todos os domingos.

2. **Operação no Portal AK**:
   - O usuário baixa o cartucho pelo botão "Cartuchos AK" no app.
   - Sobe no robô do Portal Almeida Krüger (máximo de 300 por vez).
   - O AK devolve uma planilha `.xlsx` no dia seguinte apenas com os leads "Aptos".

3. **Importação no iCtx (Frontend)**:
   - O usuário usa o `BulkImportModal` para subir a planilha do AK (aceita `.xlsx`, `.csv`, `.txt`).
   - O sistema extrai os CNPJs, consulta a BrasilAPI para pegar telefones e CNAE, e insere no Kanban.
   - **Inteligência de Telefone:** O sistema prioriza o celular (WhatsApp, 11 dígitos começando com 9) no `telefonePrincipal`. Se não achar, usa o fixo.

4. **Enriquecimento em Lote (Frontend)**:
   - O botão "Enriquecer Base" busca leads sem WhatsApp ou sem CNAE.
   - Para não bloquear a BrasilAPI, ele usa uma **fila persistente** no `localStorage` e pausa 20 segundos entre cada lead. Se a página for atualizada (F5), ele retoma de onde parou.

---

## 3. UI/UX — O Design Premium e Mobile-First

A era "Frankenstein" acabou. O iCtx agora tem cara de software de elite.

*   **Login Obrigatório:** O app só abre se o usuário estiver logado via Firebase (Google Auth). A tela é o `LoginScreen.tsx`.
*   **Design System:**
    *   Fonte: **Inter** (Anti-aliasing ativado).
    *   Scrollbar invisível / fina (estilo Mac).
    *   Ícones Lucide substituíram 100% dos emojis.
    *   Cards do Kanban: fundo branco, sombras sutis, bordas arredondadas (`rounded-xl`).
    *   Header: Efeito *Glassmorphism* (fundo translúcido e blur).
*   **Mobile First (Adeus Desktop no Celular):**
    *   **Bottom Navigation:** `MobileNav.tsx` fixo na parte inferior (Leads, Cartuchos, Metas, Perfil).
    *   **Kanban no Celular:** As colunas têm *snap scroll* (deslizam como páginas de um livro) e largura de `85vw`.
    *   O topo (Header) foi limpo no celular. As ações migraram para a barra inferior.

---

## 4. O QUE ESTÁ CONGELADO (NÃO MEXER)

1.  **Lógica do Score de Aderência Santander:** `scoring.ts` + `cnaeAderencia.ts`. Pontua CNAE, Porte e Engajamento. Não voltar para o modelo antigo (0-10).
2.  **WhatsApp via `wa.me`:** Proibido usar automação não oficial (Baileys/WPP). A API oficial é paga.
3.  **A Fila de Enriquecimento:** `ictx_enrich_fila` no `localStorage` não pode ser trocada por um loop simples, senão o F5 quebra o processo.
4.  **A Regra dos 300 no Minerador:** O Portal AK não aceita mais que 300 linhas por planilha. O script em Node.js já tem essa trava.
5.  **BulkImportModal:** Aceita `.xlsx` (via SheetJS) e prioriza celulares.
6.  **Nuvem de Custos:** Nada de Firebase Firestore (por enquanto), AWS, ou serviços pagos. Tudo no plano gratuito (Vercel + GitHub).

---

## 5. HISTÓRICO DE SPRINTS RECENTES

| Sprint | O que entregou | Status |
|---|---|---|
| SCORE-D1 | Reformulação do Score (0-100) baseado em 1.303 CNAEs. | ✅ |
| VERCEL-MIGRATION | Saída do Google Cloud/Apps Script para Vercel e GitHub Actions. | ✅ |
| MINERADOR-24/7 | Robô Node.js no GitHub gerando cartuchos na pasta `cartuchos/`. | ✅ |
| AUTH-LOGIN | Login obrigatório via Google, tela `LoginScreen.tsx`. | ✅ |
| MOBILE-PREMIUM | Bottom Nav, Kanban com Snap Scroll, visual Inter/Glassmorphism, fila de enriquecimento resiliente. | ✅ |

---

## 6. PENDÊNCIAS E PRÓXIMOS HORIZONTES (Para o iCtx 4)

Aqui é onde o próximo chat deve focar. Não invente novas features antes de terminar estas:

1.  **Firestore / Tempo Real:** O maior gargalo hoje é a sincronização entre dispositivos (Sheets demora 3s). O plano é usar o **Firebase Firestore** para sincronização instantânea e deixar o Sheets apenas como backup diário (3h da manhã).
2.  **RBAC (Hierarquia de Perfis):** O login já existe, mas o app ainda trata todo mundo como "Supervisor". Precisamos ler o e-mail logado e criar a visão de "Executivo" (só vê os leads dele).
3.  **Safras (M1/M2):** Filtro na topbar para o supervisor ver os clientes que estão no ciclo de retenção (M1/M2) para receber os pontos do Santander.
4.  **Sniper 3x2:** Redesenhar o menu de disparo de WhatsApp para um grid de 6 botões grandes (estilo teclado), facilitando o toque no celular.
5.  **Alerta de Compliance:** Borda vermelha no card se o CNAE for de risco (joalheria, câmbio).

---

## 7. REGRAS DE TRABALHO COM IA (Prompting)

1.  **Um prompt por vez:** Nunca mandar dois prompts no AI Studio sem testar o primeiro.
2.  **Código Completo:** Toda alteração deve ser entregue no formato de arquivo completo (copiar e colar tudo), nunca "substitua a linha X".
3.  **Checkpoint:** Antes de cada sprint pesado, exportar o ZIP do código.
4.  **Testar no Celular:** O layout só é aprovado se funcionar bem em telas de 380px a 430px (iPhone/Android).

---

*Fim do CONTEXTO-MESTRE v4. O iCtx deixou de ser um projeto e se tornou um software pronto para gerar receita.*