import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/common/Layout'
import DashboardPage from './pages/DashboardPage'
import DiarioPage from './pages/DiarioPage'
import SincronizarPage from './pages/SincronizarPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"    element={<DashboardPage />} />
        <Route path="/diarios"      element={<DiarioPage />} />
        <Route path="/sincronizar"  element={<SincronizarPage />} />
      </Routes>
    </Layout>
  )
}
