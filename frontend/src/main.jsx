import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationsProvider } from './contexts/NotificationsContext'
import { SearchProvider } from './contexts/SearchContext'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <NotificationsProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </NotificationsProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
