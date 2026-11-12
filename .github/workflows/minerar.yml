name: Minerador 24/7
on:
  workflow_dispatch: # Permite rodar manualmente
  schedule:
    - cron: '0 5 * * *' # 2h da manhã (Brasília)
    - cron: '0 8 * * *' # 5h da manhã (Brasília)
    - cron: '0 11 * * *' # 8h da manhã (Brasília)

permissions:
  contents: write

jobs:
  minerar:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Baixar o código
        uses: actions/checkout@v4

      - name: 🟢 Configurar o Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 📦 Instalar bibliotecas
        run: npm install exceljs --legacy-peer-deps

      - name: 🤖 Rodar o Minerador
        env:
          CASADOSDADOS_API_KEY: ${{ secrets.CASADOSDADOS_API_KEY }}
        run: node bot/minerar.js

      - name: 💾 Salvar o Cartucho no GitHub
        run: |
          mkdir -p cartuchos
          touch cartuchos/.gitkeep
          git config --global user.name 'Robo iCtx'
          git config --global user.email 'robo@ictx.com'
          git add .
          git commit -m "🤖 Novo cartucho gerado automaticamente [skip ci]" || echo "Nada para commitar"
          git push
