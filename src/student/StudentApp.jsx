import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import studioLogo from '../assets/studio-power-fit-logo.png'
import StudentAppointments from './StudentAppointments'
import './StudentApp.css'

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
  const [page, setPage] = useState(pages.HOME)
  const [student, setStudent] = useState(null)
  const [nextWorkout, setNextWorkout] = useState(null)
  const [latestPayment, setLatestPayment] = useState(null)
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [assessments, setAssessments] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadStudentData() {
      if (!profile?.id) return

      setLoadingData(true)
      setDataError('')

      const { data: studentRow, error: studentError } = await supabase
        .from('students')
        .select('id, profile_id, status, payment_plan')
        .eq('profile_id', profile.id)
        .single()

      if (cancelled) return

      if (studentError) {
        setDataError('Alguns dados do seu perfil ainda não estão disponíveis.')
        setLoadingData(false)
        return
      }

      setStudent(studentRow)

      const today = new Date()
      const todayIso = today.toISOString().slice(0, 10)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString()

      const [
        appointmentsResult,
        paymentsResult,
        attendanceResult,
        assessmentsResult,
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, student_id, appointment_date, start_time, status')
          .eq('student_id', studentRow.id)
          .gte('appointment_date', todayIso)
          .eq('status', 'CONFIRMADO')
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(1),
        supabase
          .from('payments')
          .select('id, student_id, amount, due_date, status, payment_type')
          .eq('student_id', studentRow.id)
          .order('due_date', { ascending: false })
          .limit(1),
        supabase
          .from('attendance')
          .select('id, registered_at, status')
          .eq('student_id', studentRow.id)
          .eq('status', 'PRESENTE')
          .gte('registered_at', monthStart)
          .lt('registered_at', monthEnd),
        supabase
          .from('physical_assessments')
          .select('assessment_date, weight_kg')
          .eq('student_id', studentRow.id)
          .not('weight_kg', 'is', null)
          .order('assessment_date', { ascending: true }),
      ])

      if (cancelled) return

      setNextWorkout(appointmentsResult.data?.[0] ?? null)
      setLatestPayment(paymentsResult.data?.[0] ?? null)
      setAttendanceCount(attendanceResult.data?.length ?? 0)
      setAssessments(assessmentsResult.data ?? [])

      if (
        appointmentsResult.error ||
        paymentsResult.error ||
        attendanceResult.error ||
        assessmentsResult.error
      ) {
        setDataError('Algumas informações podem aparecer de forma parcial.')
      }

      setLoadingData(false)
    }

    loadStudentData()

    return () => {
      cancelled = true
    }
  }, [profile?.id, refreshKey])

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

  const formattedWorkoutDate = useMemo(() => {
    if (!nextWorkout?.appointment_date) return ''
    const date = new Date(`${nextWorkout.appointment_date}T12:00:00`)
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(date)
  }, [nextWorkout?.appointment_date])

  const frequencyGoal = 12
  const frequencyPercent = Math.min(
    Math.round((attendanceCount / frequencyGoal) * 100),
    100
  )

  const initialWeight = assessments[0]?.weight_kg
  const currentWeight = assessments[assessments.length - 1]?.weight_kg
  const weightDifference =
    initialWeight != null && currentWeight != null
      ? Number(currentWeight) - Number(initialWeight)
      : null

  const challengeGoal = 30
  const challengeDays = Math.min(attendanceCount, challengeGoal)
  const challengePercent = Math.min(
    Math.round((challengeDays / challengeGoal) * 100),
    100
  )
  const challengeRemaining = Math.max(challengeGoal - challengeDays, 0)

  const paymentConfirmed = latestPayment?.status === 'IDENTIFICADO'

  const formatWeight = (value) => {
    if (value == null) return '— kg'
    return `${Number(value).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} kg`
  }

  const goHome = () => setPage(pages.HOME)

  return (
    <main className="student-app">
      <aside className="student-sidebar" aria-label="Menu do aluno">
        <button className="student-sidebar-brand" type="button" onClick={goHome}>
          <img src={studioLogo} alt="Studio Power Fit" />
        </button>

        <nav className="student-sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.page}
              type="button"
              className={page === item.page ? 'active' : ''}
              onClick={() => setPage(item.page)}
            >
              <span>{item.icon}</span>
              <strong>{item.page}</strong>
            </button>
          ))}
        </nav>

        <button className="student-help" type="button">
          <span>◉</span>
          <span>
            <strong>Precisa de ajuda?</strong>
            <small>Fale com a recepção</small>
          </span>
          <b>›</b>
        </button>
      </aside>

      <div className="student-main">
        <header className="student-header">
          <button className="student-mobile-brand" type="button" onClick={goHome} aria-label="Ir para o início">
            <img src={studioLogo} alt="Studio Power Fit" />
          </button>

          <div className="student-header-actions">
            <button className="student-icon-button" type="button" aria-label="Notificações">⌁</button>
            <button className="student-profile-button" type="button" onClick={() => setPage(pages.PROFILE)}>
              <span className="student-avatar">{firstName.slice(0, 1).toUpperCase()}</span>
              <span className="student-user-copy">
                <strong>{firstName}</strong>
                <small>Aluno</small>
              </span>
              <span className="student-chevron">⌄</span>
            </button>
          </div>
        </header>

        <section className="student-content">
          {page === pages.HOME && (
            <>
              <section className="student-welcome">
                <div>
                  <span className="student-kicker">SEU ESPAÇO POWER FIT</span>
                  <h1>Olá, <strong>{firstName}!</strong></h1>
                  <p>Bora para mais um dia de evolução?</p>
                </div>

                <div className="student-welcome-meta">
                  <span>{todayLabel}</span>
                  <em>Disciplina hoje, resultados amanhã.</em>
                </div>
              </section>

              {dataError && <div className="student-data-alert">{dataError}</div>}

              <section className="student-home-grid">
                <article className="student-card student-next-workout">
                  <div className="student-card-heading">
                    <div className="student-title-with-icon">
                      <span className="student-card-icon">▣</span>
                      <div>
                        <span className="student-kicker">PRÓXIMO TREINO</span>
                        <h2>
                          {nextWorkout
                            ? formattedWorkoutDate
                            : 'Seu próximo passo começa aqui.'}
                        </h2>
                      </div>
                    </div>

                    <span className={`student-status-badge ${nextWorkout ? 'confirmed' : ''}`}>
                      {nextWorkout ? '✓ Confirmado' : 'Sem treino agendado'}
                    </span>
                  </div>

                  <div className="student-workout-details">
                    {nextWorkout ? (
                      <>
                        <div className="student-workout-time">
                          <span>◷</span>
                          <strong>{String(nextWorkout.start_time || '').slice(0, 5)}</strong>
                        </div>
                        <div className="student-workout-type">
                          <span>Modalidade</span>
                          <strong>Musculação</strong>
                        </div>
                      </>
                    ) : (
                      <p>
                        Veja as vagas disponíveis para hoje, amanhã e depois de amanhã.
                      </p>
                    )}
                  </div>

                  <button className="student-primary-button" type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
                    {nextWorkout ? 'Ver detalhes do treino' : 'Agendar treino'}
                    <span>→</span>
                  </button>
                </article>

                <article className="student-card student-frequency-card">
                  <div className="student-card-heading">
                    <div className="student-title-with-icon">
                      <span className="student-card-icon">▥</span>
                      <span className="student-kicker">FREQUÊNCIA DO MÊS</span>
                    </div>
                    <button className="student-link-button" type="button" onClick={() => setPage(pages.EVOLUTION)}>
                      Ver detalhes
                    </button>
                  </div>

                  <div className="student-frequency-body">
                    <div className="student-progress-ring" style={{ '--progress': `${frequencyPercent}%` }}>
                      <strong>{frequencyPercent}%</strong>
                    </div>
                    <div>
                      <strong>{attendanceCount}/{frequencyGoal}</strong>
                      <span>treinos realizados</span>
                    </div>
                  </div>

                  <div className="student-info-strip">
                    <span>▣</span>
                    <strong>
                      {attendanceCount >= frequencyGoal
                        ? 'Meta mensal concluída!'
                        : `Faltam ${frequencyGoal - attendanceCount} treinos para sua meta mensal.`}
                    </strong>
                  </div>
                </article>

                <article className="student-card student-evolution-card">
                  <div className="student-card-heading">
                    <div className="student-title-with-icon">
                      <span className="student-card-icon">↗</span>
                      <span className="student-kicker">MINHA EVOLUÇÃO</span>
                    </div>
                    <button className="student-link-button" type="button" onClick={() => setPage(pages.EVOLUTION)}>
                      Ver histórico
                    </button>
                  </div>

                  <div className="student-evolution-metrics">
                    <div>
                      <span>Peso inicial</span>
                      <strong>{formatWeight(initialWeight)}</strong>
                    </div>
                    <div>
                      <span>Peso atual</span>
                      <strong>{formatWeight(currentWeight)}</strong>
                    </div>
                    <div>
                      <span>Diferença</span>
                      <strong className={weightDifference != null && weightDifference <= 0 ? 'positive' : ''}>
                        {weightDifference == null
                          ? '— kg'
                          : `${weightDifference > 0 ? '+' : ''}${weightDifference.toLocaleString('pt-BR', {
                              maximumFractionDigits: 1,
                            })} kg`}
                      </strong>
                    </div>
                  </div>

                  <div className="student-evolution-message">
                    <span>↗</span>
                    <div>
                      <strong>
                        {weightDifference != null && weightDifference < 0
                          ? 'Excelente progresso!'
                          : 'Sua evolução começa aqui.'}
                      </strong>
                      <small>
                        {weightDifference != null
                          ? 'Continue acompanhando seus resultados.'
                          : 'Suas avaliações aparecerão neste espaço.'}
                      </small>
                    </div>
                  </div>
                </article>

                <article className="student-card student-challenge-card">
                  <div className="student-card-heading">
                    <div className="student-title-with-icon">
                      <span className="student-card-icon">🏆</span>
                      <span className="student-kicker">DESAFIO DO MÊS</span>
                    </div>
                    <button className="student-link-button" type="button">
                      Ver detalhes
                    </button>
                  </div>

                  <div className="student-challenge-count">
                    <strong>{challengeDays} de {challengeGoal} dias</strong>
                    <span>{challengePercent}%</span>
                  </div>

                  <div className="student-progress-track">
                    <span style={{ width: `${challengePercent}%` }} />
                  </div>

                  <div className="student-info-strip">
                    <span>◎</span>
                    <strong>
                      {challengeRemaining === 0
                        ? 'Desafio concluído. Excelente!'
                        : `Continue assim! Faltam ${challengeRemaining} dias para sua meta.`}
                    </strong>
                  </div>
                </article>

                <article className="student-card student-shortcuts-card">
                  <div className="student-card-heading">
                    <div className="student-title-with-icon">
                      <span className="student-card-icon">ϟ</span>
                      <span className="student-kicker">ACESSO RÁPIDO</span>
                    </div>
                  </div>

                  <div className="student-shortcuts">
                    <button type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
                      <span>▣</span>
                      <div><strong>Agendar treino</strong><small>Reserve seu horário</small></div>
                      <b>›</b>
                    </button>
                    <button type="button" onClick={() => setPage(pages.EVOLUTION)}>
                      <span>▥</span>
                      <div><strong>Ver evolução</strong><small>Acompanhe seus resultados</small></div>
                      <b>›</b>
                    </button>
                    <button type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
                      <span>▦</span>
                      <div><strong>Meus agendamentos</strong><small>Veja e gerencie seus treinos</small></div>
                      <b>›</b>
                    </button>
                    <button type="button" onClick={() => setPage(pages.PROFILE)}>
                      <span>◎</span>
                      <div><strong>Meu perfil</strong><small>Seus dados e configurações</small></div>
                      <b>›</b>
                    </button>
                  </div>
                </article>

                <article className="student-card student-finance-card">
                  <div className="student-title-with-icon">
                    <span className="student-card-icon">▤</span>
                    <div>
                      <span className="student-kicker">PAGAMENTOS</span>
                      <h2>Situação financeira</h2>
                    </div>
                  </div>

                  <p>
                    {student?.payment_plan && <strong className="student-plan-label">{student.payment_plan}</strong>}
                    {latestPayment
                      ? paymentConfirmed
                        ? 'Pagamento identificado com sucesso.'
                        : 'Aguarde confirmação de pagamento da recepção.'
                      : 'Acompanhe vencimento, histórico e comprovantes em um só lugar.'}
                  </p>

                  <div className="student-finance-actions">
                    <span className={`student-payment-pill ${paymentConfirmed ? 'confirmed' : ''}`}>
                      {loadingData ? 'Carregando' : paymentConfirmed ? 'Confirmado' : 'Pendente'}
                    </span>
                    <button className="student-secondary-button" type="button" onClick={() => setPage(pages.PAYMENTS)}>
                      Ver pagamentos <span>→</span>
                    </button>
                  </div>
                </article>
              </section>
            </>
          )}

          {page === pages.APPOINTMENTS && (
            <section className="student-section-page">
              <div className="student-section-page-heading">
                <button className="student-back-button" type="button" onClick={goHome}>←</button>
                <div>
                  <span className="student-kicker">STUDIO POWER FIT</span>
                  <h1>{pages.APPOINTMENTS}</h1>
                </div>
              </div>

              <StudentAppointments
                student={student}
                latestPayment={latestPayment}
                onChanged={() => setRefreshKey((value) => value + 1)}
              />
            </section>
          )}

          {page !== pages.HOME && page !== pages.APPOINTMENTS && (
            <section className="student-section-page">
              <div className="student-section-page-heading">
                <button className="student-back-button" type="button" onClick={goHome}>←</button>
                <div>
                  <span className="student-kicker">STUDIO POWER FIT</span>
                  <h1>{page}</h1>
                </div>
              </div>

              <div className="student-section-placeholder">
                <span className="student-placeholder-icon">
                  {page === pages.PAYMENTS ? '▤' : page === pages.EVOLUTION ? '↗' : '◎'}
                </span>
                <h2>{page}</h2>
                <p>Esta área será conectada aos dados completos do aluno nas próximas etapas.</p>

                {page === pages.PROFILE && (
                  <button className="student-secondary-button student-logout-button" type="button" onClick={onLogout}>
                    Sair da conta
                  </button>
                )}
              </div>
            </section>
          )}
        </section>

        <nav className="student-bottom-nav" aria-label="Navegação principal do aluno">
          <button className={page === pages.HOME ? 'active' : ''} type="button" onClick={() => setPage(pages.HOME)}>
            <span>⌂</span><small>Início</small>
          </button>
          <button className={page === pages.APPOINTMENTS ? 'active' : ''} type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
            <span>▣</span><small>Agendamentos</small>
          </button>
          <button className={page === pages.PAYMENTS ? 'active' : ''} type="button" onClick={() => setPage(pages.PAYMENTS)}>
            <span>▤</span><small>Pagamentos</small>
          </button>
        </nav>
      </div>
    </main>
  )
}

export default StudentApp
