Contexto: iCtx CRM (React 18 + TS + Vite + Tailwind), produção real.

Tarefa: Sprint 7.1 — Aplicar Design System "High-Density" (Slim UI, botões finos, Kanban com largura travada).

ESCOPO — altere SOMENTE:
1) src/components/PipelineKanban.tsx
2) src/components/LeadCard.tsx
3) src/components/LeadDetailDrawer.tsx

PROIBIDO: Alterar estado global, lógica ou dados. Foco estrito em classes do Tailwind.

═══════════════════════════════════════════════════════════
PASSO 1 — Travar Largura do Kanban (PipelineKanban.tsx)
═══════════════════════════════════════════════════════════
- Remova todas as classes relativas ou responsivas de largura das colunas (como `w-[85vw]`, `sm:w-[280px]`, `landscape:w-[290px]`, `md:w-[300px]`, `lg:flex-1`).
- Defina a largura da coluna ESTRITAMENTE E FIXA como: `w-[280px] min-w-[280px] shrink-0`.
- O container principal (onde as colunas ficam lado a lado) deve ser apenas: `flex flex-row gap-4 overflow-x-auto h-full p-4 snap-x`. Sem media queries complexas. Isso garante a rolagem horizontal perfeita tanto no PC quanto no celular em pé ou deitado.

═══════════════════════════════════════════════════════════
PASSO 2 — Compactar o LeadCard (LeadCard.tsx)
═══════════════════════════════════════════════════════════
- Reduza os paddings internos do card. Se usa `p-4`, mude para `p-3`.
- Nomes de empresa/lead devem usar `text-sm font-semibold`.
- Metadados e régua de pontuação/cadência devem usar `text-xs`.
- Mantenha a limpeza extrema feita no sprint anterior (zero botões vazando, zero colchetes). Apenas garanta que o card "vista" perfeitamente a largura de 280px sem sobrar espaço morto.

═══════════════════════════════════════════════════════════
PASSO 3 — Slim UI no Dossiê (LeadDetailDrawer.tsx)
═══════════════════════════════════════════════════════════
- ABAS SUPERIORES: Reduza a altura. Em vez de `py-4`, use `py-2.5` ou `py-3` com texto `text-sm font-medium`.
- WHATSAPP E LIGAÇÃO (Menus de Seleção):
  * Remova a visualização em Grid (`grid-cols-2`, `grid-cols-3`).
  * Troque por uma Lista Vertical Compacta: `flex flex-col gap-1.5`.
  * Os botões dos templates/roteiros devem ser finos (Slim): `w-full flex items-center gap-3 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 text-sm transition-colors text-left`.
  * Remova legendas ou subtítulos de dentro dos botões. Deve ficar apenas: [Ícone pequeno] + [Título do Template].
- TELEPROMPTER (Quando um roteiro de ligação é selecionado):
  * Mantenha o texto grande e legível, mas o botão de "Voltar" deve ser pequeno e discreto (`text-xs text-slate-500 py-1`).

CRITÉRIOS DE ACEITE:
- O Kanban desliza horizontalmente de forma idêntica no PC, celular em pé e deitado.
- Todas as colunas têm exatos 280px. O card não estica mais.
- Os menus de WhatsApp e Ligação no Dossiê parecem menus nativos de desktop (linhas finas e limpas), não blocos gigantes infantis.
- Zero erros no compilador (tsc).