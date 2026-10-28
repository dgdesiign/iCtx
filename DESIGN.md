# DESIGN iCtx CRM (padrão único)

## Fontes
- Inter Variable (UI); JetBrains Mono (telefone, CNPJ, R$, pontos).
- `tabular-nums` em qualquer número.
- Escala: 10/11/12/13/14/16/20/28px. Pesos 400/500/600/700.
- Tracking: -0.01em em textos ≥16px.

## Espaço
- Grid base: 4px.
- Padding de tela: 4px. Gap de colunas do Kanban: 4px.
- Padding de card: 10px.

## Raio
- Cards/inputs: 8px. Ícone-botão: 6px. Chips/dots: pill (9999px).

## Cor
- Texto: slate-900 (primário), slate-600 (secundário), slate-400 (terciário).
- Borda: slate-200/70.
- Fundo: branco / slate-50.
- Vermelho #EC0000: só em CTA e estado ativo.
- Semânticas: emerald = ativo/ok; amber = atenção; rose = risco.
- Pontos: emerald (10), amber (6), slate (5), slate claro (3). Sem chip quando 0.

## Elevação
- Card em repouso: sem sombra. Hover: shadow-sm. Modais: shadow-xl.

## Densidade
- Ícone-botão ≥ 28px. Botão primário ≥ 36px. Card do Kanban ≤ 80px em viewport 380px.

## Componentes
- Telas novas usam src/components/ui/{Card, IconButton, Chip, Dot, Modal, Field} (criar quando necessário).
- Telas antigas migram só quando tocadas.

## Siglas de cidade
- SSA (Salvador), CA (Camaçari), CAN (Candeias), DD (Dias d'Ávila), MSJ (Mata de São João), LF (Lauro de Freitas), SF (Simões Filho), FSA (Feira de Santana), SFC (São Francisco do Conde), MD (Madre de Deus), POJ (Pojuca), SSP (São Sebastião do Passé), CAT (Catu), ITA (Itaparica), VC (Vera Cruz), SAM (Santo Amaro), ALA (Alagoinhas), SDM (Salinas da Margarida), SAJ (Santo Antônio de Jesus).
- Fallback: 1 palavra → 3 primeiras letras; 2+ palavras (sem preposições) → iniciais, máx. 3. Nunca 1 letra. Sem cidade → UF.

## Rótulos
- "MEI Desenquadrado" → exibir como "MEI+".
