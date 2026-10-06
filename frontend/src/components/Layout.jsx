import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarDays,
  Heart,
  LogOut,
  Menu,
  PawPrint,
  X,
} from 'lucide-react'
import { useAuth } from '../auth'

export default function Layout() {
  const { user, logout, config } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function exit() {
    try {
      await logout()
      setOpen(false)
      navigate('/')
    } catch (e) {
      setError(e.message)
    }
  }

  return <>
    <a className="skip-link" href="#main">
      Pular para o conteúdo
    </a>

    <div className="topbar">
      <span>
        <Heart size={13} /> Cuidado de verdade, do focinho à pontinha do rabo.
      </span>
      <span>Seg–sáb · 9h às 17h</span>
    </div>

    <header className="site-header">
      <div className="container nav-wrap">
        <Link
          className="brand"
          to="/"
          onClick={() => setOpen(false)}
          aria-label="Pet Style, início"
        >
          <span className="brand-mark">
            <PawPrint size={27} fill="currentColor" />
          </span>
          <span>
            pet<span className="brand-light">style</span>
            <small>CARINHO EM CADA CUIDADO</small>
          </span>
        </Link>

        <button
          className="menu-toggle"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>

        <nav
          className={`main-nav ${open ? 'is-open' : ''}`}
          aria-label="Principal"
        >
          <NavLink to="/" end onClick={() => setOpen(false)}>
            Início
          </NavLink>

          <Link to="/#servicos" onClick={() => setOpen(false)}>
            Nossos cuidados
          </Link>

          {user && (
            <NavLink to="/minha-area" onClick={() => setOpen(false)}>
              Minha área
            </NavLink>
          )}

          {user?.role === 'staff' && (
            <NavLink to="/equipe" onClick={() => setOpen(false)}>
              Painel da equipe
            </NavLink>
          )}

          {!user && (
            <NavLink to="/entrar" onClick={() => setOpen(false)}>
              Entrar
            </NavLink>
          )}

          <Link
            className="btn primary small"
            to="/agendar"
            onClick={() => setOpen(false)}
          >
            <CalendarDays size={17} /> Agendar cuidado
          </Link>

          {user && (
            <button
              className="icon-btn"
              aria-label="Sair da conta"
              title="Sair"
              onClick={exit}
            >
              <LogOut size={18} />
            </button>
          )}
        </nav>
      </div>
    </header>

    {error && (
      <div className="container notice" role="alert">
        {error}
      </div>
    )}

    <main id="main">
      <Outlet />
    </main>

    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand" to="/">
            <PawPrint size={28} />
            <span>pet<span className="brand-light">style</span></span>
          </Link>
          <p>
            Um encontro com o bem-estar.<br />
            Um cuidado com quem você ama.
          </p>
        </div>

        <div>
          <h3>Explore</h3>
          <Link to="/#servicos">Nossos cuidados</Link>
          <Link to="/agendar">Agendar um horário</Link>
          <Link to="/minha-area">Meus pets e agendamentos</Link>
        </div>

        <div>
          <h3>Feito para demonstrar</h3>
          <p>
            Projeto de portfólio de Lucas Machi.<br />
            Negócio e atendimentos demonstrativos.
          </p>
          <a
            href="https://github.com/lucasmachi/petstyle-fullstack"
            target="_blank"
            rel="noopener noreferrer"
          >
            Conheça o projeto <ArrowUpRight size={15} />
          </a>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Pet Style</span>
        <span>
          {config.demo_mode
            ? 'Ambiente de demonstração · use dados fictícios'
            : 'Seu pet, sempre em primeiro lugar.'}
        </span>
      </div>
    </footer>
  </>
}
