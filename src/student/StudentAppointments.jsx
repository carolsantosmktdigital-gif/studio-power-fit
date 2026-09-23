import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const isoDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const dateFromOffset = (offset) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date
}

const dateLabel = (offset) => {
  if (offset === 0) return 'Hoje'
  if (offset === 1) return 'Amanhã'
  return 'Depois de amanhã'
}

const prettyDate = (value) => {
  if (!value) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${value}T12:00:00`))
}

const prettyTime = (value) => String(value || '').slice(0, 5)

function StudentAppointments({ student, latestPayment, onChanged }) {
  const dates = useMemo(() => [0, 1, 2].map((offset) => ({
    offset,
    label: dateLabel(offset),
    value: isoDate(dateFromOffset(offset)),
  })), [])

  const [selectedDate, setSelectedDate] = useState(dates[0].value)
  const [slots, setSlots] = useState([])
  const [appointments, setAppointments] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [overdue, setOverdue] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [notice, setNotice] = useState('')
  const [leaveCandidate, setLeaveCandidate] = useState(null)
  const [cancelCandidate, setCancelCandidate] = useState(null)

  const load = async () => {
    if (!student?.id) return

    setLoading(true)
    setNotice('')

    const startDate = dates[0].value
    const endDate = dates[2].value

    const [slotsResult, appointmentsResult, waitlistResult, overdueResult] = await Promise.all([
      supabase.rpc('get_student_booking_slots', { p_start_date: startDate }),
      supabase
        .from('appointments')
        .select('id, appointment_date, start_time, status')
        .eq('student_id', student.id)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .in('status', ['CONFIRMADO', 'REALIZADO'])
        .order('appointment_date')
        .order('start_time'),
      supabase
        .from('waitlist')
        .select('id, appointment_date, start_time, position, status')
        .eq('student_id', student.id)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .in('status', ['AGUARDANDO', 'CONVOCADO'])
        .order('appointment_date')
        .order('start_time'),
      supabase.rpc('student_is_overdue', { p_student_id: student.id }),
    ])

    if (slotsResult.error) {
      setNotice('A disponibilidade de horários ainda não pôde ser carregada.')
      setSlots([])
    } else {
      setSlots(slotsResult.data ?? [])
    }

    if (appointmentsResult.error || waitlistResult.error) {
      setNotice((current) => current || 'Algumas informações de agendamento estão temporariamente indisponíveis.')
    }

    setAppointments(appointmentsResult.data ?? [])
    setWaitlist(waitlistResult.data ?? [])
    setOverdue(Boolean(overdueResult.data))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [student?.id])

  const selectedSlots = slots.filter((slot) => slot.appointment_date === selectedDate)
  const dayAppointment = appointments.find(
    (item) => item.appointment_date === selectedDate && item.status === 'CONFIRMADO'
  )

  const isBlocked = overdue
  const pendingPayment = latestPayment && latestPayment.status !== 'IDENTIFICADO'

  const handleBook = async (slot) => {
    if (!student?.id || isBlocked || dayAppointment) return

    setActionLoading(`book-${slot.appointment_date}-${slot.start_time}`)
    setNotice('')

    const { error } = await supabase.rpc('create_appointment', {
      p_student_id: student.id,
      p_date: slot.appointment_date,
      p_start_time: slot.start_time,
      p_source: 'ALUNO',
    })

    if (error) {
      setNotice(error.message)
    } else {
      setNotice('Treino agendado com sucesso.')
      await load()
      onChanged?.()
    }

    setActionLoading('')
  }

  const handleJoinWaitlist = async (slot) => {
    if (!student?.id || isBlocked || dayAppointment) return

    setActionLoading(`wait-${slot.appointment_date}-${slot.start_time}`)
    setNotice('')

    const { error } = await supabase.rpc('join_waitlist', {
      p_student_id: student.id,
      p_date: slot.appointment_date,
      p_start_time: slot.start_time,
    })

    if (error) {
      setNotice(error.message)
    } else {
      setNotice('Você entrou na lista de espera.')
      await load()
    }

    setActionLoading('')
  }

  const handleCancel = async () => {
    if (!cancelCandidate) return

    setActionLoading(`cancel-${cancelCandidate.id}`)
    setNotice('')

    const { error } = await supabase.rpc('cancel_appointment', {
      p_appointment_id: cancelCandidate.id,
      p_reason: 'Cancelado pelo aluno no aplicativo',
    })

    if (error) {
      setNotice(error.message)
    } else {
      setNotice('Agendamento cancelado com sucesso.')
      setCancelCandidate(null)
      await load()
      onChanged?.()
    }

    setActionLoading('')
  }

  const confirmLeaveWaitlist = async () => {
    if (!leaveCandidate) return

    setActionLoading(`leave-${leaveCandidate.id}`)
    setNotice('')

    const { error } = await supabase.rpc('leave_waitlist', {
      p_waitlist_id: leaveCandidate.id,
    })

    if (error) {
      setNotice(error.message)
    } else {
      setNotice('Sua posição foi liberada.')
      setLeaveCandidate(null)
      await load()
    }

    setActionLoading('')
  }

  return (
    <div className="student-booking-page">
      <section className="student-booking-intro">
        <div>
          <span className="student-kicker">MUSCULAÇÃO</span>
          <h2>Escolha quando você quer treinar.</h2>
          <p>Escolha sua data e horário. O Studio Power Fit cuida da distribuição da equipe para você.</p>
        </div>

        <div className={`student-booking-status ${isBlocked ? 'blocked' : 'ok'}`}>
          <strong>{isBlocked ? 'Agendamento bloqueado' : 'Agendamento liberado'}</strong>
          <span>
            {isBlocked
              ? 'Há pagamento com mais de 3 dias de atraso.'
              : pendingPayment
                ? 'Pagamento aguardando confirmação, sem bloqueio por enquanto.'
                : 'Você está apto a realizar novos agendamentos.'}
          </span>
        </div>
      </section>

      {notice && <div className="student-data-alert" role="status"><span>{notice}</span></div>}

      <section className="student-my-bookings">
        <div className="student-booking-section-title">
          <div>
            <span className="student-kicker">MEUS AGENDAMENTOS</span>
            <h3>Próximos treinos</h3>
          </div>
        </div>

        {appointments.some((item) => item.status === 'CONFIRMADO') && (
          <div className="student-day-limit" role="note">
            <strong>Não vai conseguir comparecer?</strong>
            <span>Cancele seu agendamento com pelo menos 1h30 de antecedência. Assim, outro aluno poderá aproveitar esse horário.</span>
          </div>
        )}

        {appointments.filter((item) => item.status === 'CONFIRMADO').length === 0 ? (
          <div className="student-empty-state">
            <span>▣</span>
            <div>
              <strong>Nenhum treino agendado.</strong>
              <small>Escolha um dos horários disponíveis abaixo.</small>
            </div>
          </div>
        ) : (
          <div className="student-booking-list">
            {appointments.filter((item) => item.status === 'CONFIRMADO').map((appointment) => (
              <article key={appointment.id} className="student-booking-item">
                <div className="student-booking-date-badge">
                  <strong>{prettyTime(appointment.start_time)}</strong>
                  <span>{prettyDate(appointment.appointment_date)}</span>
                </div>
                <div className="student-booking-item-copy">
                  <strong>Musculação</strong>
                  <span>Treino confirmado</span>
                </div>
                <button
                  type="button"
                  className="student-cancel-button"
                  disabled={actionLoading === `cancel-${appointment.id}`}
                  onClick={() => setCancelCandidate(appointment)}
                >
                  {actionLoading === `cancel-${appointment.id}` ? 'Cancelando...' : 'Cancelar'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {waitlist.length > 0 && (
        <section className="student-waitlist-section">
          <div className="student-booking-section-title">
            <div>
              <span className="student-kicker">LISTA DE ESPERA</span>
              <h3>Você está aguardando vaga</h3>
            </div>
          </div>

          <div className="student-day-limit" role="note">
            <strong>Fique de olho no celular!</strong>
            <span>Se surgir uma vaga no horário de sua preferência e chegar a sua vez na lista de espera, a recepção enviará uma mensagem para você. Fique atento ao celular para confirmar sua presença.</span>
          </div>

          <div className="student-waitlist-grid">
            {waitlist.map((item) => {
              const matchingSlot = slots.find(
                (slot) => slot.appointment_date === item.appointment_date && prettyTime(slot.start_time) === prettyTime(item.start_time)
              )
              return (
                <article key={item.id} className="student-waitlist-card">
                  <div>
                    <span>{prettyDate(item.appointment_date)}</span>
                    <strong>{prettyTime(item.start_time)}</strong>
                  </div>
                  <div>
                    <span>Sua posição</span>
                    <strong>{item.position}º lugar</strong>
                  </div>
                  <div>
                    <span>Aguardando</span>
                    <strong>{matchingSlot?.waitlist_count ?? item.position} pessoas</strong>
                  </div>
                  <button type="button" onClick={() => setLeaveCandidate(item)}>
                    Escolher outro horário
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section className="student-slot-section">
        <div className="student-booking-section-title">
          <div>
            <span className="student-kicker">AGENDAR MUSCULAÇÃO</span>
            <h3>Horários disponíveis</h3>
          </div>
          <small>Vagas atualizadas automaticamente conforme a equipe disponível</small>
        </div>

        <div className="student-date-tabs">
          {dates.map((date) => (
            <button
              type="button"
              key={date.value}
              className={selectedDate === date.value ? 'active' : ''}
              onClick={() => setSelectedDate(date.value)}
            >
              <strong>{date.label}</strong>
              <span>{prettyDate(date.value)}</span>
            </button>
          ))}
        </div>

        {dayAppointment && (
          <div className="student-day-limit">
            <strong>Você já possui um treino neste dia.</strong>
            <span>Não é permitido ter dois agendamentos no mesmo dia.</span>
          </div>
        )}

        {loading ? (
          <div className="student-loading-slots" role="status">
            <span className="student-loading-dot" />
            <span>Carregando horários disponíveis...</span>
          </div>
        ) : selectedSlots.length === 0 ? (
          <div className="student-empty-state">
            <span>◌</span>
            <div>
              <strong>Não há horários disponíveis para exibir.</strong>
              <small>Confira a configuração de disponibilidade dos professores.</small>
            </div>
          </div>
        ) : (
          <div className="student-slots-grid">
            {selectedSlots.map((slot) => {
              const available = Number(slot.available || 0)
              const full = available <= 0
              const past = Boolean(slot.is_past)
              const alreadyWaiting = waitlist.some(
                (item) => item.appointment_date === slot.appointment_date && prettyTime(item.start_time) === prettyTime(slot.start_time)
              )
              const disabled = isBlocked || Boolean(dayAppointment) || past || alreadyWaiting
              const actionKey = `${full ? 'wait' : 'book'}-${slot.appointment_date}-${slot.start_time}`

              return (
                <article key={`${slot.appointment_date}-${slot.start_time}`} className={`student-slot-card ${full ? 'full' : ''} ${disabled ? 'disabled' : ''}`}>
                  <div>
                    <strong>{prettyTime(slot.start_time)}</strong>
                    <span>
                      {past
                        ? 'Horário encerrado'
                        : full
                          ? 'LOTADO'
                          : `${available} ${available === 1 ? 'vaga' : 'vagas'}`}
                    </span>
                  </div>

                  <small>{Number(slot.capacity || 0)} vagas totais</small>

                  {alreadyWaiting ? (
                    <button type="button" disabled>Na lista de espera</button>
                  ) : full ? (
                    <button
                      type="button"
                      disabled={disabled || Boolean(actionLoading)}
                      onClick={() => handleJoinWaitlist(slot)}
                    >
                      {actionLoading === actionKey ? 'Entrando...' : 'Entrar na lista de espera'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled || Boolean(actionLoading)}
                      onClick={() => handleBook(slot)}
                    >
                      {actionLoading === actionKey ? 'Agendando...' : 'Agendar'}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {cancelCandidate && (
        <div className="student-modal-backdrop" role="presentation">
          <div className="student-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
            <span className="student-modal-icon">×</span>
            <span className="student-kicker">CANCELAR TREINO</span>
            <h3 id="cancel-booking-title">Cancelar este agendamento?</h3>
            <p>
              {prettyDate(cancelCandidate.appointment_date)} às {prettyTime(cancelCandidate.start_time)}.
              O cancelamento só é permitido dentro do prazo definido pelo Studio Power Fit.
            </p>
            <div>
              <button type="button" onClick={() => setCancelCandidate(null)}>Manter treino</button>
              <button
                type="button"
                className="confirm danger"
                disabled={actionLoading === `cancel-${cancelCandidate.id}`}
                onClick={handleCancel}
              >
                {actionLoading === `cancel-${cancelCandidate.id}` ? 'Cancelando...' : 'Cancelar treino'}
              </button>
            </div>
          </div>
        </div>
      )}

      {leaveCandidate && (
        <div className="student-modal-backdrop" role="presentation">
          <div className="student-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="leave-waitlist-title">
            <span className="student-modal-icon">!</span>
            <h3 id="leave-waitlist-title">Liberar sua posição?</h3>
            <p>
              Confirma liberar sua posição da lista de espera para {prettyDate(leaveCandidate.appointment_date)} às {prettyTime(leaveCandidate.start_time)}?
            </p>
            <div>
              <button type="button" onClick={() => setLeaveCandidate(null)}>Não</button>
              <button
                type="button"
                className="confirm"
                disabled={actionLoading === `leave-${leaveCandidate.id}`}
                onClick={confirmLeaveWaitlist}
              >
                {actionLoading === `leave-${leaveCandidate.id}` ? 'Liberando...' : 'Sim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentAppointments
