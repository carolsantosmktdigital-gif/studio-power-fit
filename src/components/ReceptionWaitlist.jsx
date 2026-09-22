import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './ReceptionWaitlist.css'

export default function ReceptionWaitlist({ focus }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: failure } = await supabase.from('waitlist')
        .select('id,student_id,appointment_date,start_time,position,status,created_at')
        .in('status', ['AGUARDANDO', 'CONVOCADO'])
        .order('appointment_date').order('start_time').order('position')
      if (failure) throw failure

      const studentIds = [...new Set((data || []).map(row => row.student_id))]
      const { data: students } = studentIds.length
        ? await supabase.from('students').select('id,profile_id').in('id', studentIds)
        : { data: [] }
      const profileIds = (students || []).map(student => student.profile_id)
      const { data: people } = profileIds.length
        ? await supabase.from('profiles').select('id,full_name,phone').in('id', profileIds)
        : { data: [] }

      const peopleById = new Map((people || []).map(person => [person.id, person]))
      const studentById = new Map((students || []).map(student => [student.id, peopleById.get(student.profile_id)]))
      setRows((data || []).map(row => ({ ...row, person: studentById.get(row.student_id) })))
    } catch {
      setError('Não foi possível carregar a lista de espera.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const focused = focus?.appointment_date && focus?.start_time
    ? rows.filter(row => row.appointment_date === focus.appointment_date && String(row.start_time).slice(0,5) === String(focus.start_time).slice(0,5))
    : rows

  return <section className="reception-waitlist-page">
    <div className="rw-heading">
      <div><span>ATENDIMENTO · FILA DE PRIORIDADE</span><h2>Lista de espera</h2><p>{focus?.appointment_date ? 'Exibindo primeiro a fila da vaga que acabou de ser liberada.' : 'Alunos aguardando uma vaga, em ordem de prioridade.'}</p></div>
      <button type="button" onClick={load}>Atualizar</button>
    </div>
    {error && <p className="rw-error">* {error}</p>}
    {loading ? <div className="rw-empty">Atualizando lista de espera…</div> : focused.length ? <div className="rw-list">
      {focused.map((row, index) => <article key={row.id} className={index === 0 ? 'is-first' : ''}>
        <div className="rw-position"><strong>{row.position}º</strong><span>na fila</span></div>
        <div className="rw-person"><small>{index === 0 ? 'PRÓXIMO ALUNO' : 'ALUNO'}</small><strong>{row.person?.full_name || 'Aluno'}</strong><span>{row.person?.phone || 'Telefone não informado'}</span></div>
        <div className="rw-slot"><small>VAGA DE INTERESSE</small><strong>{new Date(`${row.appointment_date}T12:00:00`).toLocaleDateString('pt-BR')}</strong><span>{String(row.start_time).slice(0,5)}</span></div>
        <span className="rw-status">{row.status === 'CONVOCADO' ? 'Convocado' : 'Aguardando'}</span>
      </article>)}
    </div> : <div className="rw-empty">Não há alunos aguardando nesta fila.</div>}
  </section>
}
