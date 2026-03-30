import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { BillingPage } from './pages/BillingPage'
import { LegacyContent } from './LegacyContent'
import { ClientPage } from './pages/ClientPage'
import { ClientsListPage } from './pages/ClientsListPage'
import { CreateClientPage } from './pages/CreateClientPage'
import { CreateDeliverablePage } from './pages/CreateDeliverablePage'
import { DeliverablesListPage } from './pages/DeliverablesListPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clients" element={<ClientsListPage />} />
        <Route path="clients/create" element={<CreateClientPage />} />
        <Route path="clients/:id" element={<ClientPage />} />
        <Route path="deliverables" element={<DeliverablesListPage />} />
        <Route path="deliverables/create" element={<CreateDeliverablePage />} />
        <Route path="sources" element={<LegacyContent activeTab="sources" />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
