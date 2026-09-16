import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import logo from './assets/power-fit-logo.png'
import AppShell from './components/AppShell'
import StudentApp from './student/StudentApp'
import './App.css'

function App() {
  const [darkMode, setDarkMode] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedTheme = localStorage.getItem('power-fit-theme')

    if (savedTheme) {
      setDarkMode(savedTheme === 'dark')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'power-fit-theme',
      darkMode ? 'dark' : 'light'
    )
  }, [darkMode])

  useEffect(() => {
    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      loadProfile(session.user.id)
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [session])

  async function loadSession() {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      setError(error.message)
    }

    setSession(data?.session ?? null)
    setLoading(false)
  }

  async function loadProfile(userId) {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, active')
      .eq('id', userId)
      .single()

    if (error) {
      setError(error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }

    setLoading(false)
  }

  async function handleLogin(event) {
    event.preventDefault()

    setError('')
    setLoggingIn(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setError(error.message)
    }

    setLoggingIn(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setProfile(null)
    setEmail('')
    setPassword('')
  }

  function handleForgotPassword() {
    setError(
      'A recuperação de senha será disponibilizada nesta etapa do projeto.'
    )
  }

  if (loading) {
    return (
      <main className={`app-shell ${darkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="loading-screen">
          <div className="loading-logo">PF</div>
          <span>Carregando Studio Power Fit...</span>
        </div>
      </main>
    )
  }

  if (session && profile) {
    if (profile.active === false) {
      return (
        <main className={`app-shell ${darkMode ? 'theme-dark' : 'theme-light'}`}>
          <div className="loading-screen">
            <div className="loading-logo">PF</div>
            <span>Seu acesso está inativo. Fale com a recepção do Studio Power Fit.</span>
          </div>
        </main>
      )
    }

    if (profile.role === 'ALUNO') {
      return <StudentApp profile={profile} onLogout={handleLogout} />
    }

    return <AppShell profile={profile} onLogout={handleLogout} />
  }

  return (
    <main className={`app-shell ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <div className="gym-background"></div>
  <div className="background-overlay"></div>
	<div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>

      <button
        className="theme-toggle"
        onClick={() => setDarkMode((value) => !value)}
        type="button"
        aria-label="Alternar tema"
      >
        <span>{darkMode ? '☀️' : '🌙'}</span>
        <span>{darkMode ? 'Modo claro' : 'Modo escuro'}</span>
      </button>

      <section className="login-layout">
        <div className="brand-column">
          <div className="brand-hero">
            <div className="main-logo">
  <img
    src={logo}
    alt="Studio Power Fit"
  />
</div>

            <p className="side-phrase">
              MAIS SAÚDE
              <br />
              MAIS DISCIPLINA
              <br />
              MAIS RESULTADOS
            </p>
          </div>

          <div className="motivational-copy">
            <span>STUDIO POWER FIT</span>
            <h2>
              O corpo alcança o <br /> que a mente 
              
              <strong> acredita.</strong>
            </h2>
          </div>
        </div>

        <div className="login-column">
          <div className="login-card">
            
          <div className="login-heading">
  <h2>Bem-vindo(a)!</h2>

  <p>
    Acesse sua conta para continuar no Studio Power Fit
  </p>
</div>

            <form onSubmit={handleLogin} className="login-form">
              <label htmlFor="email">E-mail ou usuário</label>

              <div className="input-wrapper">
                <span className="input-icon">◯</span>

                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <label htmlFor="password">Senha</label>

              <div className="input-wrapper">
                <span className="input-icon lock-icon">♙</span>

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="button"
                  className="visibility-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword
                      ? 'Ocultar senha'
                      : 'Mostrar senha'
                  }
                >
                  {showPassword ? '◉' : '◌'}
                </button>
              </div>

              <div className="login-options">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                  />

                  <span className="custom-checkbox"></span>
                  <span>Lembrar de mim</span>
                </label>

                <button
                  type="button"
                  className="forgot-button"
                  onClick={handleForgotPassword}
                >
                  Esqueci minha senha
                </button>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={loggingIn}
              >
                <span>
                  {loggingIn ? 'Entrando...' : 'Entrar'}
                </span>

                {!loggingIn && <span className="button-arrow">→</span>}
              </button>
            </form>

            <div className="divider">
              <span>ou</span>
            </div>

            <button
              type="button"
              className="reception-button"
              onClick={() =>
                setError(
                  'O cadastro é realizado pela recepção do Studio Power Fit.'
                )
              }
            >
              <span className="reception-icon">＋</span>
              <span>Solicitar acesso à recepção</span>
            </button>

            <p className="access-note">
              Ainda não tem acesso?
              <br />
              <strong>Fale com a recepção do Studio.</strong>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
