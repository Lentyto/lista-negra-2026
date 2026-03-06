import { Routes, Route, Navigate } from 'react-router-dom'
import PinEntry from './pages/PinEntry'
import Gallery from './pages/Gallery'
import SalasPage from './pages/SalasPage'
import MediaPage from './pages/MediaPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import LockdownPage from './pages/LockdownPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<PinEntry />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/salas" element={<SalasPage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route path="/lockdown" element={<LockdownPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
