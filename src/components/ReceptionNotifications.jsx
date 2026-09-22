import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './ReceptionNotifications.css'

const formatDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
  weekday: 'long', day: '2-digit', month: '2-digit'
})

export default function ReceptionNotifications({ profile, onNavigate }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let pending = false

    async function refresh() {
      if (pending) return
      pending = true
      try {
        const { data, error: failure } = await supabase.from('notifications')
          .select('id,type,title,message,created_at,read_at,reference_type,reference_id')
          .eq('user_id', profile.id).is('read_at', null)
          .order('created_at', { ascending: false }).limit(50)

        if (!active) return
        if (failure) {
          setError('Não foi possível atualizar as notificações.')
          return
        }

        const notifications = data || []
        const enriched = await Promise.all(notifications.map(async (item) => {
          if (item.reference_type !== 'WAITLIST' || !item.reference_id) return item

          const { data: reference } = await supabase.from('waitlist')
            .select('appointment_date,start_time')
            .eq('id', item.reference_id).maybeSingle()
          if (!reference) return item

          const { data: first } = await supabase.from('waitlist')
            .select('id,student_id,appointment_date,start_time,position')
            .eq('appointment_date', reference.appointment_date)
            .eq('start_time', reference.start_time)
            .in('status', ['AGUARDANDO', 'CONVOCADO'])
            .order('position').order('created_at').limit(1).maybeSingle()
          if (!first) return { ...item, waitlist: reference }

          const { data: student } = await supabase.from('students')
            .select('profile_id').eq('id', first.student_id).maybeSingle()
          const { data: person } = student?.profile_id
            ? await supabase.from('profiles').select('full_name').eq('id', student.profile_id).maybeSingle()
            : { data: null }

          return { ...item, waitlist: { ...first, full_name: person?.full_name || 'Aluno da lista de espera' } }
        }))

        if (active) {
          setItems(enriched)
          setError('')
        }
      } catch {
        if (active) setError('Não foi possível atualizar as notificações.')
      } finally {
        pending = false
      }
    }

    refresh()
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [profile.id])

  const goToWaitlist = (item) => {
    onNavigate?.('Lista de espera', item.waitlist || null)
  }

  const unreadLabel = items.length === 1
    ? '1 vaga da lista de espera precisa de atenção'
    : `${items.length} notificações precisam de atenção`

  return <section className={`reception-notifications ${items.length ? 'has-unread' : ''} ${open ? 'is-open' : 'is-closed'}`}>
    <button className="rn-toggle" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className="rn-alert-icon" aria-hidden="true">{items.length ? '!' : '✓'}</span>
      <span className="rn-toggle-copy">
        <strong>{items.length ? unreadLabel : 'Notificações em dia'}</strong>
        <small>{items.length ? 'Confira a vaga liberada e atenda o próximo aluno da fila.' : 'Nenhuma nova ação pendente.'}</small>
      </span>
      {items.length > 0 && <span className="rn-unread-dot" aria-label={`${items.length} não lida(s)`}>{items.length}</span>}
      <span className="rn-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
    </button>

    {error && <p role="alert" className="rn-error">* {error}</p>}

    {open && <div className="rn-list">
      {!items.length && <p className="rn-empty">Nenhuma notificação pendente.</p>}
      {items.map(item => {
        const waiting = item.waitlist
        return <article key={item.id} className="rn-item">
          <div className="rn-item-copy">
            <span className="rn-kicker">VAGA LIBERADA</span>
            <strong>Vaga disponível para lista de espera</strong>
            {waiting?.full_name ? <>
              <p><b>{waiting.full_name}</b> é o primeiro da fila para <b>{formatDate(waiting.appointment_date)}, às {String(waiting.start_time).slice(0, 5)}</b>.</p>
              <small>Entre em contato com o aluno para confirmar o interesse na vaga.</small>
            </> : <p>{item.message}</p>}
            <time>{new Date(item.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time>
          </div>
          <button className="rn-action" type="button" onClick={() => goToWaitlist(item)}>
            Ver lista de espera <span aria-hidden="true">→</span>
          </button>
        </article>
      })}
    </div>}
  </section>
}
