import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, PawPrint } from 'lucide-react'
import { useAuth } from '../auth'
import { Notice, Submit } from '../components/UI'
export default function Login() {
  const { authenticate, config } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  async function submit(event, demoRole) {
    event?.preventDefault(); setError(''); setBusy(true)
    try {
      const data = demoRole ? { email: demoRole === 'staff' ? 'equipe@petstyle.example.com' : 'tutor@petstyle.example.com', password: 'PetStyle123!' } : mode === 'register' ? form : { email: form.email, password: form.password }
      const user = await authenticate(demoRole ? 'login' : mode, data)
      const next = location.state?.from
      navigate(typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : user.role === 'staff' ? '/equipe' : '/minha-area', { replace: true })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <div className="container auth-grid"><div className="auth-story"><PawPrint size={44} /><h1>O cuidado começa<br />com um <span>olá.</span></h1><p>Entre para acompanhar seus agendamentos<br />e guardar um cantinho para seus pets.</p><img src="/mascots.svg" alt="Cachorro e gato, mascotes Pet Style" width="450" height="375" /><span><Heart size={17} /> Um lugar para quem é da família.</span></div><div className="auth-form"><Link to="/" className="text-link"><ArrowLeft size={16} /> Voltar para o início</Link><p className="eyebrow">BEM-VINDO À PET STYLE</p><h2>{mode === 'login' ? 'Que bom ter você aqui.' : 'Vamos nos conhecer?'}</h2><p className="muted">{mode === 'login' ? 'Entre na sua conta para continuar.' : 'Crie sua conta e cadastre seu melhor amigo.'}</p><Notice>{error}</Notice><form onSubmit={submit}>
      {mode === 'register' && <label>Seu nome<input autoComplete="name" required minLength={2} maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}
      <label>E-mail<input type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="voce@exemplo.com" /></label>
      <label>Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Pelo menos 8 caracteres" /></label>
      <Submit busy={busy}>{mode === 'login' ? 'Entrar na minha conta' : 'Criar minha conta'}</Submit>
    </form><p className="auth-switch">{mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Cadastre-se' : 'Entrar'}</button></p>
    {config.demo_mode && <div className="demo-login"><strong>Quer conhecer o projeto?</strong><p>Explore com contas fictícias, sem preencher o cadastro.</p><div><button className="btn ghost small" disabled={busy} onClick={e => submit(e, 'customer')}>Demo: tutor</button><button className="btn ghost small" disabled={busy} onClick={e => submit(e, 'staff')}>Demo: equipe</button></div></div>}
    </div></div>
}
