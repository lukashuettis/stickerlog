import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { ToastProvider } from './components/ui/Toast'
import { I18nProvider } from './i18n/I18nProvider'
import { applyPersistedTheme } from './lib/theme'
// Self-hosted Inter (no third-party font requests; full DSGVO compliance).
// Service worker caches these on first visit, so subsequent loads are offline.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

applyPersistedTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </HashRouter>
  </React.StrictMode>,
)
