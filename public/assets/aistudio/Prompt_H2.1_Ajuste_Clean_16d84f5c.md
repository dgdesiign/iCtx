Contexto: iCtx CRM (React 18 + TS + Vite), produção real.

Tarefa: Ajustar o design do LeadCard para remover emojis e adotar um visual minimalista e profissional.

ESCOPO — altere SOMENTE:
1) src/components/LeadCard.tsx

═══════════════════════════════════════════════════════════
PASSO 1 — src/components/LeadCard.tsx (Limpeza Visual)
═══════════════════════════════════════════════════════════
1. REMOVER EMOJIS: 
   - Localize o indicador de pontos que utiliza o emoji de saco de dinheiro (ex: `💰 {pontos}`).
   - Remova o emoji completamente.

2. FORMATO DE TEXTO MINIMALISTA:
   - Substitua a exibição dos pontos para o formato exato de chaves/colchetes: `[{pontosAtuais}/{pontosTotais}]` (Ex: `[0/10]`, `[4/10]`, `[10/10]`).
   - Adicione ao lado a exibição da cadência de mensagens no formato exato: `[{cadenciaContatos}/3]` (Ex: `[0/3]`, `[1/3]`). Se `cadenciaContatos` for undefined, assuma 0.
   - Utilize cores de texto neutras (ex: `text-gray-500` ou `text-slate-600`), sem aplicar NENHUM fundo colorido (bg-color).

3. ÍCONES EXISTENTES INTOCADOS:
   - Mantenha os ícones que já existem no componente (WhatsApp, Telefone, Pix, Maquininha).
   - NÃO adicione emojis novos (como 💧 ou 💳) se o projeto já usa ícones do Lucide-react. 
   - A linha final do card deve parecer algo como: `[0/10] [0/3]` seguido dos ícones originais do sistema.

CRITÉRIOS DE ACEITE:
- O card não possui mais emojis.
- A formatação está estritamente em texto como `[X/Y]`.
- Zero erros de compilação no TypeScript.