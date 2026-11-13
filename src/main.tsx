import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Configuração do Service Worker para auto-atualização
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Uma nova versão do iCtx está disponível. Deseja atualizar agora?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App pronto para uso offline.')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
