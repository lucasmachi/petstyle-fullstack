import { useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import { Empty, Loading } from './components/UI'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Booking from './pages/Booking'
import Admin from './pages/Admin'
function Guard({ staff = false, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="section container"><Loading /></div>
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />
  if (staff && user.role !== 'staff') return <Navigate to="/minha-area" replace />
  return children
}
export default function App() {
  const location = useLocation()
  useEffect(() => { if (!location.hash) window.scrollTo(0, 0) }, [location.pathname, location.hash])
  return <Routes><Route element={<Layout />}><Route index element={<Home />} /><Route path="entrar" element={<Login />} /><Route path="minha-area" element={<Guard><Dashboard /></Guard>} /><Route path="agendar" element={<Guard><Booking /></Guard>} /><Route path="equipe" element={<Guard staff><Admin /></Guard>} /><Route path="*" element={<div className="section container"><Empty title="Esse caminho não está na nossa agenda" action={<Link className="btn primary" to="/">Voltar ao início</Link>}>Vamos encontrar um lugar melhor para você e seu pet.</Empty></div>} /></Route></Routes>
}
