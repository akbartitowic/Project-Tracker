import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { AppBrandingProvider } from './context/AppBrandingContext'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppBrandingProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppBrandingProvider>
    </ErrorBoundary>
  </StrictMode>,
)
