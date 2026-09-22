import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './ReceptionNotifications.css'

export default function ReceptionNotifications({ profile }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  useEffect(() => {
    let active = true
    let pending = false
    async function refresh() {
      if (pending) return
      pending = true
      try {
        const { data, error: failure } = await supabase.from('notifications')
          .select('id,title,message,created_at,read_at')
          .eq('user_id', profile.id).is('read_at', null)
          .order('created_at', { ascending: false }).limit(50)
        if (!active) return
        if (failure) setError('Não foi possível atualizar as notificações.')
        else { setItems(data || []); setError('') }
      } catch {
        if (active) setError('Não foi possível atualizar as notificações.')
      } finally { pending = false }
    }
    refresh()
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [profile.id])
  async function markRead(id) {
    setBusy(id)
    try {
      const { data, error: failure } = await supabase.from('notifications')
        .update({ read_at: new Date().toISOString() }).eq('id', id)
        .eq('user_id', profile.id).select('id')
      if (failure || !data?.length) setError('Não foi possível marcar a notificação como lida.')
      else setItems(current => current.filter(item => item.id !== id))
    } catch { setError('Não foi possível marcar a notificação como lida.') }
    finally { setBusy('') }
  }
  return <section className="reception-notifications">
    <button className="rn-toggle" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      Notificações <span aria-live="polite">{items.length ? `(${items.length} não lidas)` : '(nenhuma nova)'}</span>
      <span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    {error && <p role="alert" className="rn-error">* {error}</p>}
    {open && <div className="rn-list">
      {!items.length && <p>Nenhuma notificação pendente.</p>}
      {items.map(item => <article key={item.id}>
        <div><strong>{item.title}</strong><p>{item.message}</p>
          <small>{new Date(item.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</small></div>
        <button className="outline-action" type="button" disabled={Boolean(busy)} onClick={() => markRead(item.id)}>
          {busy === item.id ? 'Salvando…' : 'Marcar como lida'}
        </button>
      </article>)}
    </div>}
  </section>
}
