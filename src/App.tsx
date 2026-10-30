import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './auth'
import { AnimalPage } from './pages/AnimalPage'
import { AnimalsPage } from './pages/AnimalsPage'
import { AuditPage } from './pages/AuditPage'
import { BreedingPage } from './pages/BreedingPage'
import { CataloguePage } from './pages/CataloguePage'
import { ClinicalPage } from './pages/ClinicalPage'
import { DashboardPage } from './pages/DashboardPage'
import { FarmsPage } from './pages/FarmsPage'
import { LoginPage } from './pages/LoginPage'
import { MedicinePage } from './pages/MedicinePage'
import { MilkPage } from './pages/MilkPage'
import { PeoplePage } from './pages/PeoplePage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { Shell } from './shell'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="animals" element={<AnimalsPage />} />
            <Route path="animals/:id" element={<AnimalPage />} />
            <Route path="milk" element={<MilkPage />} />
            <Route path="clinical" element={<ClinicalPage />} />
            <Route path="medicine" element={<MedicinePage />} />
            <Route path="breeding" element={<BreedingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="farms" element={<FarmsPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="organization" element={<SettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
