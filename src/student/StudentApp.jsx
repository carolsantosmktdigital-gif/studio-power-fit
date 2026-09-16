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

function StudentApp({ profile, onLogout }) {
  const [page, setPage] = useState(pages.HOME)
  const [student, setStudent] = useState(null)
  const [nextWorkout, setNextWorkout] = useState(null)
  const [latestPayment, setLatestPayment] = useState(null)
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
        setDataError('Não foi possível carregar seus dados agora.')
        setLoadingData(false)
        return
      }

      setStudent(studentRow)

      const today = new Date().toISOString().slice(0, 10)

      const [{ data: appointments, error: appointmentsError }, { data: payments, error: paymentsError }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, student_id, appointment_date, start_time, status')
          .eq('student_id', studentRow.id)
          .gte('appointment_date', today)
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
      ])

      if (cancelled) return

      if (appointmentsError || paymentsError) {
        setDataError('Algumas informações podem estar temporariamente indisponíveis.')
      }

      setNextWorkout(appointments?.[0] ?? null)
      setLatestPayment(payments?.[0] ?? null)
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

  const goHome = () => setPage(pages.HOME)

  const formattedWorkoutDate = useMemo(() => {
    if (!nextWorkout?.appointment_date) return ''
    const date = new Date(`${nextWorkout.appointment_date}T12:00:00`)
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(date)
  }, [nextWorkout?.appointment_date])

  const paymentConfirmed = latestPayment?.status === 'IDENTIFICADO'

  return (
    <main className="student-app">
      <div className="student-bg-glow student-bg-glow-one" />
      <div className="student-bg-glow student-bg-glow-two" />

      <header className="student-header">
        <button className="student-brand" type="button" onClick={goHome} aria-label="Ir para início">
          <img src={studioLogo} alt="Studio Power Fit" />
          <span>
            <small>STUDIO</small>
            <strong>POWER FIT</strong>
          </span>
        </button>

        <div className="student-header-actions">
          <button className="student-icon-button" type="button" aria-label="Notificações">⌁</button>
          <button className="student-profile-button" type="button" onClick={() => setPage(pages.PROFILE)}>
            <span className="student-avatar">{firstName.slice(0, 1).toUpperCase()}</span>
            <span className="student-user-copy">
              <strong>{firstName}</strong>
              <small>Aluno</small>
            </span>
          </button>
        </div>
      </header>

      <section className="student-content">
        {page === pages.HOME && (
          <>
            <section className="student-welcome">
              <div>
                <span className="student-kicker">SEU ESPAÇO POWER FIT</span>
                <h1>Olá, {firstName}.</h1>
                <p>{todayLabel}</p>
              </div>

              <button className="student-outline-button" type="button" onClick={() => setPage(pages.PROFILE)}>
                Meu perfil
              </button>
            </section>

            {dataError && <div className="student-data-alert">{dataError}</div>}

            <section className="student-hero-grid">
              <article className="student-next-workout">
                <div className="student-card-heading">
                  <div>
                    <span className="student-kicker">PRÓXIMO TREINO</span>
                    <h2>Seu próximo passo começa aqui.</h2>
                  </div>
                  <span className="student-status-badge">{nextWorkout ? 'Treino confirmado' : 'Sem treino agendado'}</span>
                </div>

                <div className="student-next-workout-body">
                  <div className="student-calendar-mark">
                    <span>{nextWorkout ? formattedWorkoutDate : 'HOJE'}</span>
                    <strong>{nextWorkout ? String(nextWorkout.start_time || '').slice(0, 5) : '+'}</strong>
                  </div>
                  <div>
                    <h3>{nextWorkout ? 'Seu treino está confirmado' : 'Escolha seu horário'}</h3>
                    <p>
                      {nextWorkout
                        ? 'Consulte os detalhes ou gerencie seu agendamento.'
                        : 'Veja as vagas disponíveis para hoje, amanhã e depois de amanhã.'}
                    </p>
                  </div>
                </div>

                <button className="student-primary-button" type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
                  {nextWorkout ? 'Ver meu agendamento' : 'Agendar treino'}
                  <span>→</span>
                </button>
              </article>

              <article className="student-frequency-card">
                <div className="student-card-heading">
                  <div>
                    <span className="student-kicker">FREQUÊNCIA</span>
                    <h2>Minha constância</h2>
                  </div>
                  <span className="student-mini-icon">◒</span>
                </div>

                <div className="student-frequency-score">
                  <strong>0</strong>
                  <span>treinos neste mês</span>
                </div>

                <div className="student-progress-track">
                  <span style={{ width: '0%' }} />
                </div>

                <p>Seu histórico de presença aparecerá aqui conforme você treinar.</p>
              </article>
            </section>

            <section className="student-dashboard-grid">
              <article className="student-panel student-evolution-card">
                <div className="student-card-heading">
                  <div>
                    <span className="student-kicker">MINHA EVOLUÇÃO</span>
                    <h2>Seu progresso, de forma visual.</h2>
                  </div>
                  <button className="student-text-button" type="button" onClick={() => setPage(pages.EVOLUTION)}>
                    Ver evolução
                  </button>
                </div>

                <div className="student-evolution-metrics">
                  <div>
                    <span>Peso inicial</span>
                    <strong>—</strong>
                  </div>
                  <div>
                    <span>Peso atual</span>
                    <strong>—</strong>
                  </div>
                  <div>
                    <span>Diferença</span>
                    <strong>—</strong>
                  </div>
                </div>

                <div className="student-chart-placeholder">
                  <span className="student-chart-line" />
                  <small>Suas avaliações irão formar sua linha de evolução.</small>
                </div>
              </article>

              <article className="student-panel student-challenge-card">
                <span className="student-kicker">DESAFIO DO MÊS</span>
                <h2>Consistência em movimento</h2>
                <p>Complete seus treinos e acompanhe seu progresso ao longo do mês.</p>

                <div className="student-challenge-ring">
                  <strong>0%</strong>
                  <span>concluído</span>
                </div>
              </article>

              <article className="student-panel student-finance-card">
                <div className="student-card-heading">
                  <div>
                    <span className="student-kicker">PAGAMENTOS</span>
                    <h2>Situação financeira</h2>
                  </div>
                  <span className="student-payment-pill">{loadingData ? 'Carregando' : paymentConfirmed ? 'Confirmado' : 'Pendente'}</span>
                </div>

                <p>
                  {student?.payment_plan && <strong className="student-plan-label">{student.payment_plan}</strong>}
                  {latestPayment
                    ? paymentConfirmed
                      ? 'Pagamento identificado com sucesso.'
                      : 'Aguarde confirmação de pagamento da recepção.'
                    : 'Acompanhe vencimento, histórico e comprovantes em um só lugar.'}
                </p>

                <button className="student-secondary-button" type="button" onClick={() => setPage(pages.PAYMENTS)}>
                  Ver pagamentos
                </button>
              </article>
            </section>

            <section className="student-shortcuts">
              <button type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
                <span>＋</span>
                <div><strong>Agendar treino</strong><small>Escolha data e horário</small></div>
              </button>

              <button type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
                <span>▣</span>
                <div><strong>Meus agendamentos</strong><small>Consulte seus próximos treinos</small></div>
              </button>

              <button type="button" onClick={() => setPage(pages.EVOLUTION)}>
                <span>↗</span>
                <div><strong>Minha evolução</strong><small>Veja seu progresso</small></div>
              </button>

              <button type="button" onClick={() => setPage(pages.PROFILE)}>
                <span>◎</span>
                <div><strong>Meu perfil</strong><small>Dados pessoais e preferências</small></div>
              </button>
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
                {page === pages.APPOINTMENTS ? '▣' : page === pages.PAYMENTS ? '◈' : page === pages.EVOLUTION ? '↗' : '◎'}
              </span>
              <h2>{page}</h2>
              <p>
                Esta área já está separada dentro do aplicativo do aluno e será conectada às regras e aos dados reais do Supabase na próxima etapa.
              </p>

              {page === pages.PROFILE && (
                <button className="student-secondary-button" type="button" onClick={onLogout}>
                  Sair da conta
                </button>
              )}
            </div>
          </section>
        )}
      </section>

      <nav className="student-bottom-nav" aria-label="Navegação principal do aluno">
        <button className={page === pages.HOME ? 'active' : ''} type="button" onClick={() => setPage(pages.HOME)}>
          <span>⌂</span>
          <small>Início</small>
        </button>
        <button className={page === pages.APPOINTMENTS ? 'active' : ''} type="button" onClick={() => setPage(pages.APPOINTMENTS)}>
          <span>▣</span>
          <small>Agendamentos</small>
        </button>
        <button className={page === pages.PAYMENTS ? 'active' : ''} type="button" onClick={() => setPage(pages.PAYMENTS)}>
          <span>◇</span>
          <small>Pagamentos</small>
        </button>
      </nav>
    </main>
  )
}

export default StudentApp
