import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import studioLogo from '../assets/studio-power-fit-logo.png'
import StudentAppointments from './StudentAppointments'
import './StudentApp.css'
import './StudentDesktopRefinements.css'

const pages = {
  HOME: 'Início',
  APPOINTMENTS: 'Agendamentos',
  PAYMENTS: 'Pagamentos',
  EVOLUTION: 'Minha Evolução',
  PROFILE: 'Meu Perfil',
}

const menuItems = [
  { page: pages.HOME, icon: '⌂' },
  { page: pages.APPOINTMENTS, icon: '▣' },
  { page: pages.PAYMENTS, icon: '▤' },
  { page: pages.EVOLUTION, icon: '↗' },
  { page: pages.PROFILE, icon: '◎' },
]

function StudentApp({ profile, onLogout }) {
  useEffect(() => {
    const root = document.getElementById('root')
    const previous = {
      htmlOverflow: document.documentElement.style.overflow,
      htmlHeight: document.documentElement.style.height,
      bodyOverflow: document.body.style.overflow,
      bodyHeight: document.body.style.height,
      rootOverflow: root?.style.overflow || '',
      rootHeight: root?.style.height || '',
      rootMinHeight: root?.style.minHeight || '',
    }

    document.documentElement.style.overflowX = 'hidden'
    document.documentElement.style.overflowY = 'auto'
    document.documentElement.style.height = 'auto'

    document.body.style.overflowX = 'hidden'
    document.body.style.overflowY = 'auto'
    document.body.style.height = 'auto'

    if (root) {
      root.style.overflow = 'visible'
      root.style.height = 'auto'
      root.style.minHeight = '100%'
    }

    return () => {
      document.documentElement.style.overflow = previous.htmlOverflow
      document.documentElement.style.height = previous.htmlHeight
      document.body.style.overflow = previous.bodyOverflow
      document.body.style.height = previous.bodyHeight

      if (root) {
        root.style.overflow = previous.rootOverflow
        root.style.height = previous.rootHeight
        root.style.minHeight = previous.rootMinHeight
      }
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')

    html.classList.add('student-scroll-page')
    body.classList.add('student-scroll-page')
    root?.classList.add('student-scroll-root')

    return () => {
      html.classList.remove('student-scroll-page')
      body.classList.remove('student-scroll-page')
      root?.classList.remove('student-scroll-root')
    }
  }, [])

  const [page, setPage] = useState(pages.HOME)
  const [student, setStudent] = useState(null)
  const [nextWorkout, setNextWorkout] = useState(null)
  const [latestPayment, setLatestPayment] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [assessments, setAssessments] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [darkMode, setDarkMode] = useState(false)
  const [greeting, setGreeting] = useState(() => getGreeting())

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting())
    const timer = window.setInterval(updateGreeting, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const firstName = useMemo(() => {
    return String(profile?.full_name || 'Aluno').trim().split(/\s+/)[0]
  }, [profile?.full_name])

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date())
  }, [])

  useEffect(() => {
    let active = true

    async function loadStudentData() {
      if (!profile?.id) return
      setLoadingData(true)
      setDataError('')

      try {
        const { data: studentRow, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle()

        if (studentError) throw studentError
        if (!active) return

        setStudent(studentRow || null)

        if (!studentRow?.id) {
          setNextWorkout(null)
          setLatestPayment(null)
          setPaymentHistory([])
          setAttendanceCount(0)
          setAssessments([])
          setDataError('Alguns dados do seu perfil ainda não estão disponíveis.')
          return
        }

        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const monthStart = `${today.slice(0, 7)}-01`
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const nextMonthStart = nextMonth.toISOString().slice(0, 10)

        const [appointmentResult, paymentsResult, attendanceResult, assessmentsResult] = await Promise.all([
          supabase.from('appointments').select('*').eq('student_id', studentRow.id).eq('status', 'CONFIRMADO').gte('appointment_date', today).order('appointment_date', { ascending: true }).order('start_time', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('payments').select('*').eq('student_id', studentRow.id).order('due_date', { ascending: false }).limit(12),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('student_id', studentRow.id).gte('attendance_date', monthStart).lt('attendance_date', nextMonthStart).eq('status', 'PRESENTE'),
          supabase.from('physical_assessments').select('*').eq('student_id', studentRow.id).order('assessment_date', { ascending: true }).limit(24),
        ])

        if (!active) return

        setNextWorkout(appointmentResult.data || null)
        const paymentRows = paymentsResult.data || []
        setPaymentHistory(paymentRows)
        setLatestPayment(paymentRows[0] || null)
        setAttendanceCount(attendanceResult.count || 0)
        setAssessments(assessmentsResult.data || [])
      } catch (error) {
        if (!active) return
        console.error(error)
        setDataError('Não foi possível atualizar todos os dados agora.')
      } finally {
        if (active) setLoadingData(false)
      }
    }

    loadStudentData()
    return () => { active = false }
  }, [profile?.id, refreshKey])

  const frequencyGoal = 12
  const frequencyPercent = Math.min(100, Math.round((attendanceCount / frequencyGoal) * 100))
  const challengeGoal = 30
  const challengeDays = Math.min(challengeGoal, attendanceCount)
  const challengePercent = Math.min(100, Math.round((challengeDays / challengeGoal) * 100))
  const challengeRemaining = Math.max(0, challengeGoal - challengeDays)
  const paymentConfirmed = latestPayment?.status === 'IDENTIFICADO'

  const initialWeight = useMemo(() => {
    const values = assessments.map((item) => Number(item.weight_kg)).filter(Number.isFinite)
    return values.length ? values[0] : numberOrNull(student?.initial_weight_kg)
  }, [assessments, student?.initial_weight_kg])

  const currentWeight = useMemo(() => {
    const values = assessments.map((item) => Number(item.weight_kg)).filter(Number.isFinite)
    return values.length ? values[values.length - 1] : numberOrNull(student?.current_weight_kg)
  }, [assessments, student?.current_weight_kg])

  const weightDifference = initialWeight != null && currentWeight != null ? currentWeight - initialWeight : null

  const formattedWorkoutDate = useMemo(() => {
    if (!nextWorkout?.appointment_date) return ''
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(`${nextWorkout.appointment_date}T12:00:00`))
  }, [nextWorkout?.appointment_date])

  const profileAddress = useMemo(() => {
    return [profile?.address, profile?.neighborhood, profile?.city, profile?.state].filter(Boolean).join(', ')
  }, [profile?.address, profile?.neighborhood, profile?.city, profile?.state])

  const evolutionPoints = useMemo(() => {
    const values = assessments.map((item) => Number(item.weight_kg)).filter(Number.isFinite)
    if (values.length < 2) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(max - min, 1)
    return values.map((value, index) => {
      const x = 20 + (index / Math.max(values.length - 1, 1)) * 560
      const y = 150 - ((value - min) / range) * 110
      return `${x},${y}`
    }).join(' ')
  }, [assessments])

  function goHome() {
    setPage(pages.HOME)
  }

  return (
    <main className={`student-app ${darkMode ? 'student-dark' : ''}`}>
      <aside className="student-sidebar">
        <button className="student-sidebar-brand" type="button" onClick={goHome} aria-label="Voltar para o início"><img src={studioLogo} alt="Studio Power Fit" /></button>
        <nav className="student-sidebar-nav" aria-label="Navegação do aluno">
          {menuItems.map((item) => <button key={item.page} className={page === item.page ? 'active' : ''} type="button" onClick={() => setPage(item.page)}><span>{item.icon}</span><strong>{item.page}</strong></button>)}
        </nav>
        <button className="student-help" type="button" onClick={() => window.open('https://wa.me/', '_blank')}><span>?</span><span><strong>Precisa de ajuda?</strong><small>Fale com a recepção</small></span><b>→</b></button>
      </aside>

      <div className="student-main">
        <header className="student-header">
          <button className="student-mobile-brand" type="button" onClick={goHome} aria-label="Voltar para o início"><img src={studioLogo} alt="Studio Power Fit" /></button>
          <div className="student-header-actions">
            <button className="student-icon-button student-theme-toggle" type="button" onClick={() => setDarkMode((value) => !value)} aria-label="Alternar tema">{darkMode ? '☀' : '☾'}</button>
            <button className="student-icon-button student-notification-indicator" type="button" aria-label="Notificações">♧<i /></button>
            <button className="student-profile-button" type="button" onClick={() => setPage(pages.PROFILE)}><span className="student-avatar">{firstName.slice(0, 1).toUpperCase()}</span><span className="student-user-copy"><strong>{firstName}</strong><small>Aluno(a)</small></span><span className="student-chevron">⌄</span></button>
          </div>
        </header>

        <section className="student-content">
          {page === pages.HOME && (<>
            <section className="student-welcome">
              <div><span className="student-kicker">SEU ESPAÇO POWER FIT</span><h1>{greeting}, <strong>{firstName}!</strong></h1><p>Seu treino começa aqui. Já agendou seu horário?</p></div>
              <div className="student-welcome-meta"><span>{todayLabel}</span><em>Disciplina hoje, resultados amanhã.</em></div>
            </section>
            {dataError && <div className="student-data-alert">{dataError}<button type="button" onClick={() => setRefreshKey((value) => value + 1)}>Tentar novamente</button></div>}
            <section className="student-home-grid">
              <article className="student-card student-next-workout">
                <div className="student-card-heading"><div className="student-title-with-icon"><span className="student-card-icon">▣</span><div><span className="student-kicker">PRÓXIMO TREINO</span><h2>{nextWorkout ? formattedWorkoutDate : 'Seu próximo treino começa aqui.'}</h2></div></div><span className={`student-status-badge ${nextWorkout ? 'confirmed' : ''}`}>{nextWorkout ? '✓ Confirmado' : 'Sem treino agendado'}</span></div>
                <div className="student-workout-details">{nextWorkout ? <><div className="student-workout-time"><span>◷</span><strong>{String(nextWorkout.start_time || '').slice(0, 5)}</strong></div><div className="student-workout-type"><span>Modalidade</span><strong>Musculação</strong></div></> : <p>Veja as vagas disponíveis para hoje, amanhã e depois de amanhã.</p>}</div>
                <button className="student-primary-button" type="button" onClick={() => setPage(pages.APPOINTMENTS)}>{nextWorkout ? 'Ver detalhes do treino' : 'Agendar treino'}<span>→</span></button>
              </article>
              <article className="student-card student-frequency-card">
                <div className="student-card-heading"><div className="student-title-with-icon"><span className="student-card-icon">▥</span><span className="student-kicker">FREQUÊNCIA DO MÊS</span></div><button className="student-link-button" type="button" onClick={() => setPage(pages.EVOLUTION)}>Ver detalhes</button></div>
                <div className="student-frequency-body"><div className="student-progress-ring" style={{ '--progress': `${frequencyPercent}%` }}><strong>{frequencyPercent}%</strong></div><div><strong>{attendanceCount}/{frequencyGoal}</strong><span>treinos realizados</span></div></div>
                <div className="student-info-strip"><span>▣</span><strong>{attendanceCount >= frequencyGoal ? 'Meta mensal concluída!' : `Faltam ${frequencyGoal - attendanceCount} treinos para sua meta mensal.`}</strong></div>
              </article>
              <article className="student-card student-evolution-card">
                <div className="student-card-heading"><div className="student-title-with-icon"><span className="student-card-icon">↗</span><span className="student-kicker">MINHA EVOLUÇÃO</span></div><button className="student-link-button" type="button" onClick={() => setPage(pages.EVOLUTION)}>Ver histórico</button></div>
                <div className="student-evolution-metrics"><div><span>Peso inicial</span><strong>{formatWeight(initialWeight)}</strong></div><div><span>Peso atual</span><strong>{formatWeight(currentWeight)}</strong></div><div><span>Diferença</span><strong className={weightDifference != null && weightDifference <= 0 ? 'positive' : ''}>{weightDifference == null ? '— kg' : `${weightDifference > 0 ? '+' : ''}${weightDifference.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`}</strong></div></div>
                <div className="student-evolution-message"><span>↗</span><div><strong>{weightDifference != null && weightDifference < 0 ? 'Excelente progresso!' : 'Sua evolução começa aqui.'}</strong><small>{weightDifference != null ? 'Continue acompanhando seus resultados.' : 'Suas avaliações aparecerão neste espaço.'}</small></div></div>
              </article>
              <article className="student-card student-challenge-card">
                <div className="student-card-heading"><div className="student-title-with-icon"><span className="student-card-icon">🏆</span><span className="student-kicker">DESAFIO DO MÊS</span></div><span className="student-card-context">Meta mensal</span></div>
                <div className="student-challenge-count"><strong>{challengeDays} de {challengeGoal} dias</strong><span>{challengePercent}%</span></div><div className="student-progress-track"><span style={{ width: `${challengePercent}%` }} /></div><div className="student-info-strip"><span>◎</span><strong>{challengeRemaining === 0 ? 'Desafio concluído. Excelente!' : `Continue assim! Faltam ${challengeRemaining} dias para sua meta.`}</strong></div>
              </article>
              <article className="student-card student-finance-card">
                <div className="student-title-with-icon"><span className="student-card-icon">▤</span><div><span className="student-kicker">PAGAMENTOS</span><h2>Situação financeira</h2></div></div>
                <p>{student?.payment_plan && <strong className="student-plan-label">{student.payment_plan}</strong>}{latestPayment ? paymentConfirmed ? 'Pagamento identificado com sucesso.' : 'Aguarde confirmação de pagamento da recepção.' : 'Acompanhe vencimento, histórico e comprovantes em um só lugar.'}{latestPayment?.due_date && <span className="student-due-date">Vencimento: {new Intl.DateTimeFormat('pt-BR').format(new Date(`${latestPayment.due_date}T12:00:00`))}</span>}</p>
                <div className="student-finance-actions"><span className={`student-payment-pill ${paymentConfirmed ? 'confirmed' : ''}`}>{loadingData ? 'Carregando' : paymentConfirmed ? 'Confirmado' : 'Pendente'}</span><button className="student-secondary-button" type="button" onClick={() => setPage(pages.PAYMENTS)}>Ver pagamentos <span>→</span></button></div>
              </article>
            </section>
          </>)}

          {page === pages.APPOINTMENTS && <section className="student-section-page"><div className="student-section-page-heading"><button className="student-back-button" type="button" onClick={goHome}>←</button><div><span className="student-kicker">STUDIO POWER FIT</span><h1>{pages.APPOINTMENTS}</h1></div></div><StudentAppointments student={student} latestPayment={latestPayment} onChanged={() => setRefreshKey((value) => value + 1)} /></section>}

          {page === pages.PAYMENTS && <section className="student-section-page"><div className="student-section-page-heading"><button className="student-back-button" type="button" onClick={goHome}>←</button><div><span className="student-kicker">ÁREA DO ALUNO</span><h1>Pagamentos</h1><p>Acompanhe sua situação financeira sem perder tempo.</p></div></div><div className="student-detail-grid student-payments-page"><article className={`student-detail-hero ${paymentConfirmed ? 'success' : ''}`}><div><span className="student-kicker">SITUAÇÃO ATUAL</span><h2>{paymentConfirmed ? 'Pagamento identificado' : latestPayment ? 'Aguardando confirmação' : 'Nenhuma cobrança disponível'}</h2><p>{paymentConfirmed ? 'Seu pagamento foi confirmado pela recepção.' : latestPayment ? 'Assim que a recepção identificar o pagamento, o status será atualizado aqui.' : 'Quando houver uma cobrança, você poderá acompanhar tudo por esta área.'}</p></div><span className="student-detail-status-icon">{paymentConfirmed ? '✓' : '◷'}</span></article><div className="student-detail-metrics"><article><span>Modalidade</span><strong>{student?.payment_plan || '—'}</strong></article><article><span>Vencimento</span><strong>{formatDate(latestPayment?.due_date)}</strong></article><article><span>Valor</span><strong>{formatCurrency(latestPayment?.amount)}</strong></article></div><article className="student-detail-card student-history-card"><div className="student-detail-heading"><div><span className="student-kicker">HISTÓRICO</span><h2>Últimos pagamentos</h2></div><span>{paymentHistory.length} registros</span></div>{paymentHistory.length === 0 ? <div className="student-detail-empty">Nenhum pagamento encontrado.</div> : <div className="student-history-list">{paymentHistory.map((payment) => <div className="student-history-row" key={payment.id}><div><strong>{formatDate(payment.due_date)}</strong><span>{payment.payment_type || 'Mensalidade'}</span></div><strong>{formatCurrency(payment.amount)}</strong><span className={`student-history-status ${payment.status === 'IDENTIFICADO' ? 'success' : ''}`}>{payment.status === 'IDENTIFICADO' ? 'Identificado' : 'Aguardando'}</span></div>)}</div>}</article></div></section>}

          {page === pages.EVOLUTION && <section className="student-section-page"><div className="student-section-page-heading"><button className="student-back-button" type="button" onClick={goHome}>←</button><div><span className="student-kicker">SUA JORNADA</span><h1>Minha Evolução</h1><p>Resultados ganham força quando você consegue enxergar o caminho percorrido.</p></div></div><div className="student-detail-grid student-evolution-page"><div className="student-detail-metrics"><article><span>Peso inicial</span><strong>{formatWeight(initialWeight)}</strong></article><article><span>Peso atual</span><strong>{formatWeight(currentWeight)}</strong></article><article><span>Diferença</span><strong className={weightDifference != null && weightDifference <= 0 ? 'positive' : ''}>{weightDifference == null ? '— kg' : `${weightDifference > 0 ? '+' : ''}${weightDifference.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`}</strong></article><article><span>Frequência no mês</span><strong>{attendanceCount} treinos</strong></article></div><article className="student-detail-card student-evolution-chart-card"><div className="student-detail-heading"><div><span className="student-kicker">EVOLUÇÃO DE PESO</span><h2>Histórico das avaliações</h2></div><span>{assessments.length} avaliações</span></div>{evolutionPoints ? <div className="student-evolution-chart-wrap"><svg viewBox="0 0 600 180" role="img" aria-label="Gráfico da evolução de peso"><defs><linearGradient id="studentEvolutionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff2038" stopOpacity=".18" /><stop offset="100%" stopColor="#ff2038" stopOpacity="0" /></linearGradient></defs><line x1="20" y1="150" x2="580" y2="150" className="student-chart-axis" /><polyline points={evolutionPoints} className="student-chart-stroke" /></svg></div> : <div className="student-detail-empty">Com duas ou mais avaliações, sua curva de evolução aparecerá aqui.</div>}</article><article className="student-detail-card student-history-card"><div className="student-detail-heading"><div><span className="student-kicker">AVALIAÇÕES</span><h2>Histórico recente</h2></div></div>{assessments.length === 0 ? <div className="student-detail-empty">Nenhuma avaliação registrada ainda.</div> : <div className="student-history-list">{[...assessments].reverse().slice(0, 8).map((assessment) => <div className="student-history-row" key={`${assessment.assessment_date}-${assessment.weight_kg}`}><div><strong>{formatDate(assessment.assessment_date)}</strong><span>Avaliação física</span></div><strong>{formatWeight(assessment.weight_kg)}</strong><span className="student-history-status success">Registrada</span></div>)}</div>}</article></div></section>}

          {page === pages.PROFILE && <section className="student-section-page"><div className="student-section-page-heading"><button className="student-back-button" type="button" onClick={goHome}>←</button><div><span className="student-kicker">CONTA DO ALUNO</span><h1>Meu Perfil</h1><p>Seus dados principais e informações de acesso ao Studio Power Fit.</p></div></div><div className="student-profile-page"><article className="student-profile-summary"><span className="student-profile-big-avatar">{firstName.slice(0, 1).toUpperCase()}</span><div><span className="student-kicker">ALUNO</span><h2>{profile?.full_name || firstName}</h2><p>{profile?.email || 'E-mail não informado'}</p></div></article><article className="student-detail-card student-profile-data"><div className="student-detail-heading"><div><span className="student-kicker">DADOS PRINCIPAIS</span><h2>Informações cadastrais</h2></div><span>Gerenciados com segurança</span></div><div className="student-profile-fields"><div><span>Nome completo</span><strong>{profile?.full_name || '—'}</strong></div><div><span>E-mail</span><strong>{profile?.email || '—'}</strong></div><div><span>Telefone</span><strong>{profile?.phone || '—'}</strong></div><div><span>CPF</span><strong>{profile?.cpf || '—'}</strong></div><div className="wide"><span>Endereço</span><strong>{profileAddress || '—'}</strong></div><div><span>Plano</span><strong>{student?.payment_plan || '—'}</strong></div><div><span>Status</span><strong>{student?.status || '—'}</strong></div></div></article><button className="student-signout-button" type="button" onClick={onLogout}>Sair da minha conta</button></div></section>}
        </section>

        <nav className="student-bottom-nav" aria-label="Navegação principal do aluno">
          <button className={page === pages.HOME ? 'active' : ''} type="button" onClick={() => setPage(pages.HOME)}><span>⌂</span><small>Início</small></button>
          <button className={page === pages.APPOINTMENTS ? 'active' : ''} type="button" onClick={() => setPage(pages.APPOINTMENTS)}><span>▣</span><small>Agendamentos</small></button>
          <button className={page === pages.PAYMENTS ? 'active' : ''} type="button" onClick={() => setPage(pages.PAYMENTS)}><span>▤</span><small>Pagamentos</small></button>
        </nav>
      </div>
    </main>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatWeight(value) {
  const number = numberOrNull(value)
  if (number == null) return '— kg'
  return `${number.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`))
}

function formatCurrency(value) {
  const number = numberOrNull(value)
  if (number == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number)
}

export default StudentApp