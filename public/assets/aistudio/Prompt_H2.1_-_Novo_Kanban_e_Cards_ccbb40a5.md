Contexto: iCtx CRM (React 18 + TS + Vite), produção real. Siga REGRAS.md.

🛑 PASSO 0 — SEGURANÇA MÁXIMA
Crie um checkpoint de restauração antes de editar.
Exportar Backup JSON via UI do app.

Tarefa: H2.1 — Refatorar Kanban (5 colunas) e implementar High-Density Cards (Régua visual).

ESCOPO — altere SOMENTE:
1) src/types/crm.ts
2) src/components/PipelineKanban.tsx
3) src/components/LeadCard.tsx
4) src/components/LeadDetailDrawer.tsx
5) src/App.tsx (Somente para migração de status legado)

═══════════════════════════════════════════════════════════
PASSO 1 — src/types/crm.ts
═══════════════════════════════════════════════════════════
- Atualizar o union type de `status`: 
  `'novo' | 'em_prospeccao' | 'negociacao' | 'fechado' | 'descartado'`
- Adicionar novos campos opcionais em `Lead`:
  - `cadenciaContatos?: 0 | 1 | 2 | 3;` (Default 0)
  - `produtosAtivos?: { conta?: boolean; maquina?: boolean; };`

═══════════════════════════════════════════════════════════
PASSO 2 — src/App.tsx (MIGRAÇÃO DE DADOS LEGADOS)
═══════════════════════════════════════════════════════════
- Ao carregar os `leads` do localStorage/estado inicial, faça um `.map()` varrendo todos os leads.
- Se `lead.status` for `'contato_1'`, `'contato_2'` ou `'contato_3'`, mude para `'em_prospeccao'`.
- Se o lead não tiver `cadenciaContatos`, defina baseado no status antigo (ex: contato_1 = 1, contato_2 = 2).

═══════════════════════════════════════════════════════════
PASSO 3 — src/components/PipelineKanban.tsx
═══════════════════════════════════════════════════════════
- Reduzir as colunas fixas para apenas 5:
  1. Novo (novo)
  2. Em Prospecção (em_prospeccao)
  3. Negociação (negociacao)
  4. Fechado (fechado)
  5. Descartado (descartado)

═══════════════════════════════════════════════════════════
PASSO 4 — src/components/LeadCard.tsx (HIGH-DENSITY CARD)
═══════════════════════════════════════════════════════════
- Remover os emojis avulsos (como 💰 10) do corpo principal.
- Adicionar uma "Régua Visual" (footer do card, `flex gap-2 text-xs`):
  - **Pílula de Contatos:** `💬 ${lead.cadenciaContatos || 0}/3`. Fundo cinza se 0, azul se 1 ou 2, vermelho se 3.
  - **Pílula de Produtos (só se fechado ou negociacao):** 
    - Ícone 💧 (Opaco/grayscale se false, colorido se `produtosAtivos?.conta`)
    - Ícone 💳 (Opaco se false, colorido se `produtosAtivos?.maquina`)
  - **Canal de Entrada (Score Visual):** Adicionar no topo do card (ao lado do nome) um selo baseado em CNAE. Se `lead.cnae` incluir 'restaurante', 'bar', ou 'lanchonete', colocar uma estrela ⭐️. Se incluir 'joalheria', 'bijuteria', colocar caveira 💀.

═══════════════════════════════════════════════════════════
PASSO 5 — src/components/LeadDetailDrawer.tsx
═══════════════════════════════════════════════════════════
- No topo (abaixo do Header), adicionar Bloco "Gestão de Cadência":
  - Mostra a cadência atual (ex: 1/3).
  - Botão: "+ Registrar Tentativa" (incrementa `cadenciaContatos` até o máximo de 3).
  - Se bater 3/3, exibir botão de alerta vermelho rápido: "Esgotado: Descartar Lead?" (muda status para descartado).
- No bloco de ativação já existente (Pix/Máquina), garantir que os botões atualizem o novo objeto `produtosAtivos`.

CRITÉRIOS DE ACEITE:
- Compila sem erros.
- Kanban deve abrir com as novas colunas e os leads antigos devem aparecer na coluna 'Em Prospecção'.
- Card mostra as badges coloridas no rodapé.