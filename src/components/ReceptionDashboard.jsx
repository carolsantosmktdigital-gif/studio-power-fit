import { useState } from 'react'
import ManagementIcon from './ManagementIcon'
import './ReceptionDashboard.css'

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`
const timeOf = (value) => String(value).slice(0, 5)

export default function ReceptionDashboard({ profile, panel, loading, error, updatedAt, onRefresh, onNavigate, onNewStudent, onScheduleStudent, onRegisterPayment, teachers = [], onChangeTeacher }) {
  const [period, setPeriod] = useState('upcoming')
  const [expandedTimes, setExpandedTimes] = useState({})
  const now = new Date()
  const clock = now.toTimeString().slice(0, 5)
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = String(profile.full_name || 'Recepção').trim().split(/\s+/)[0]
  const appointmentGroups = Object.entries(panel.appointments.reduce((result, item) => {
    const time = timeOf(item.start_time)
    ;(result[time] ||= []).push(item)
    return result
  }, {})).sort(([a], [b]) => a.localeCompare(b))
  const upcomingGroups = appointmentGroups.filter(([time]) => time >= clock)
  const operationalUpcoming = upcomingGroups.length ? upcomingGroups : appointmentGroups.slice(-1)
  const visibleGroups = period === 'upcoming' ? operationalUpcoming.slice(0, 3) : appointmentGroups
  const groups = appointmentGroups.map(([time, items]) => [time, items.length])
  const upcoming = operationalUpcoming.map(([time, items]) => [time, items.length])
  const ready = Boolean(updatedAt)
  const value = (number) => ready ? number : '—'
  const next = upcoming[0] || groups.at(-1)
  const stats = [
    { icon: 'calendar', label: 'Agendados hoje', number: panel.appointments.length, note: 'Reservas confirmadas', page: 'Agenda', tone: 'blue' },
    { icon: 'check', label: 'Presenças hoje', number: panel.present, note: plural(panel.absent, 'ausência registrada', 'ausências registradas'), page: 'Agenda', tone: 'green' },
    { icon: 'wallet', label: 'Cobranças vencidas', number: panel.overdue, note: 'Acompanhar pagamentos', page: 'Pagamentos', tone: panel.overdue ? 'red' : 'neutral' },
    { icon: 'clock', label: 'Em espera hoje', number: panel.waitlist, note: 'Consultar horários na agenda', page: 'Agenda', tone: 'amber' },
  ]
  return <section className="rx-dashboard" aria-label="Painel da recepção" aria-busy={loading}>
    <div className="rx-intro">
      <div><span className="rx-eyebrow">RECEPÇÃO · OPERAÇÃO DO DIA</span><h2>{greeting}, {firstName}.</h2><p className="rx-date">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <div className="rx-update"><button className="rx-button rx-secondary" onClick={onRefresh} disabled={loading} type="button"><ManagementIcon name="refresh" size={17} />{loading ? 'Atualizando…' : 'Atualizar'}</button><span role="status">{updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Carregando informações'}</span></div>
    </div>
    {error && <p className="rx-error" role="alert"><span aria-hidden="true">*</span>{error}</p>}
    <div className="rx-hero">
      <div className="rx-hero-copy"><span className="rx-eyebrow">CADA ATENDIMENTO CONTA</span><h3>Seu dia, bem organizado.</h3><p>Agenda, alunos e prioridades em um só lugar.</p><div className="rx-hero-actions"><button className="rx-button rx-hero-secondary" onClick={onNewStudent} type="button"><ManagementIcon name="plus" size={18} />Cadastrar aluno</button><button className="rx-button rx-hero-secondary" onClick={onScheduleStudent} type="button"><ManagementIcon name="calendar" size={18} />Agendar aluno</button><button className="rx-button rx-hero-secondary" onClick={onRegisterPayment} type="button"><ManagementIcon name="wallet" size={18} />Cadastrar pagamento</button></div></div>
      <div className="rx-next"><span><ManagementIcon name="clock" size={16} />PRÓXIMO HORÁRIO</span><strong>{ready ? next?.[0] || 'Dia em ordem' : '—'}</strong><p>{!ready ? 'Consultando agenda…' : next ? plural(next[1], 'reserva confirmada', 'reservas confirmadas') : 'Sem novas reservas para hoje.'}</p><div><ManagementIcon name="team" size={16} />{ready ? plural(panel.activeTeachers, 'professor ativo', 'professores ativos') : 'Consultando equipe…'}</div></div>
    </div>
    <div className="rx-stats">{stats.map((stat) => <button key={stat.label} className={`rx-stat rx-${stat.tone}`} onClick={() => onNavigate(stat.page)} type="button"><div className="rx-stat-top"><span className="rx-icon"><ManagementIcon name={stat.icon} size={20} /></span><ManagementIcon name="arrow" size={17} /></div><span className="rx-stat-label">{stat.label}</span><strong>{value(stat.number)}</strong><span className="rx-stat-note">{ready ? stat.note : 'Aguardando dados'}</span></button>)}</div>
    <div className="rx-grid">
      <section className="rx-panel rx-agenda"><div className="rx-panel-heading"><div><span className="rx-eyebrow">FLUXO DE ATENDIMENTO</span><h3>Agenda de hoje</h3></div><button className="rx-link" onClick={() => onNavigate('Agenda')} type="button">Ver agenda<ManagementIcon name="arrow" size={16} /></button></div>
        <div className="rx-filters" role="group" aria-label="Filtrar horários"><button type="button" aria-pressed={period === 'upcoming'} onClick={() => setPeriod('upcoming')}>Próximos horários (3)</button><button type="button" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>Outros horários</button></div>
        {ready && visibleGroups.length ? <div className="rx-flow-slots">{visibleGroups.map(([time, items]) => { const expanded=Boolean(expandedTimes[time]); const shown=expanded?items:items.slice(0,4); return <article className="rx-flow-slot" key={time}><div className="rx-flow-time"><time>{time}</time><small>{plural(items.length,'aluno agendado','alunos agendados')}</small></div><div className="rx-flow-list">{shown.map((item,index)=>{const student=item.students?.profiles?.full_name||'Aluno';const teacher=item.employees?.profiles?.full_name||'Professor sugerido pelo sistema';return <div className="rx-flow-student" key={item.id}><span className="rx-flow-avatar">{student.trim()[0]||'A'}</span><div className="rx-flow-name"><b>{student}</b><small>Confirmado</small></div><label className="rx-flow-teacher"><span>Professor</span><select value={item.teacher_id||''} onChange={e=>onChangeTeacher?.(item.id,e.target.value)} aria-label={`Professor de ${student}`}><option value="">Professor a definir</option>{teachers.map(t=><option key={t.teacher_id} value={t.teacher_id}>{t.profile?.full_name||'Professor'}</option>)}</select></label><button className="rx-attendance" type="button" onClick={() => onNavigate('Agenda')}>Efetuar presença</button><button className="rx-payment-action" type="button" onClick={onRegisterPayment}><ManagementIcon name="wallet" size={15}/>Pagamentos</button></div>})}{items.length>4&&<button className="rx-show-more" type="button" onClick={()=>setExpandedTimes(current=>({...current,[time]:!expanded}))}>{expanded?`Mostrar apenas 4`:`Ver mais ${items.length-4} aluno${items.length-4===1?'':'s'}`}<ManagementIcon name="arrow" size={14}/></button>}</div></article>})}</div> : <div className="rx-empty"><span className="rx-empty-icon"><ManagementIcon name="calendar" size={26} /></span><strong>{!ready ? 'Carregando a agenda' : period === 'upcoming' ? 'Nenhum próximo horário' : 'Nenhum outro horário'}</strong><p>{!ready ? 'Os horários aparecerão assim que os dados chegarem.' : 'As reservas confirmadas aparecerão neste painel.'}</p></div>}
        <div className="rx-flow-note"><ManagementIcon name="team" size={16}/><span>O professor é sugerido pelo sistema para manter a distribuição equilibrada de alunos. A recepção pode alterar quando necessário.</span></div>
        <div className="rx-agenda-foot"><ManagementIcon name="calendar" size={16}/><span>{ready ? `${plural(groups.length, 'horário com reserva', 'horários com reservas')} hoje` : 'Consultando horários'}</span></div>
      </section>
      <div className="rx-aside"><section className="rx-panel"><div className="rx-panel-heading"><div><span className="rx-eyebrow">PRIORIDADES</span><h3>Atenção agora</h3></div><span className="rx-icon rx-neutral"><ManagementIcon name="alert" size={19} /></span></div>
        <div className="rx-priorities"><button type="button" onClick={() => onNavigate('Pagamentos')}><span className={`rx-icon ${panel.overdue ? 'rx-red' : 'rx-green'}`}><ManagementIcon name="wallet" size={19} /></span><span><b>{ready ? plural(panel.overdue, 'cobrança vencida', 'cobranças vencidas') : 'Consultando cobranças'}</b><small>{ready && !panel.overdue ? 'Nenhuma cobrança vencida no painel.' : 'Consultar pagamentos e pendências'}</small></span><ManagementIcon name="arrow" size={16} /></button><button type="button" onClick={() => onNavigate('Agenda')}><span className="rx-icon rx-amber"><ManagementIcon name="clock" size={19} /></span><span><b>{ready ? plural(panel.waitlist, 'reserva em espera', 'reservas em espera') : 'Consultando lista de espera'}</b><small>{ready && !panel.waitlist ? 'Nenhuma reserva aguardando hoje.' : 'Consultar agenda para acompanhar vagas'}</small></span><ManagementIcon name="arrow" size={16} /></button></div>
      </section>
      <section className="rx-panel rx-birthdays"><div className="rx-panel-heading"><div><span className="rx-eyebrow">CONEXÕES QUE IMPORTAM</span><h3>Aniversariantes do dia</h3></div><span className="rx-icon rx-blue"><ManagementIcon name="gift" size={19} /></span></div>{ready && panel.birthdays.length ? <ul>{panel.birthdays.map((person, index) => <li key={person.id || `${person.full_name}-${index}`}><span className="rx-person">{person.full_name?.trim()[0] || 'A'}</span><span><b>{person.full_name}</b><small>{person.phone || 'Telefone não informado'}</small></span></li>)}</ul> : <p className="rx-birthday-empty">{ready ? 'Nenhum aniversariante hoje. Um bom atendimento faz a diferença todos os dias.' : 'Consultando aniversariantes…'}</p>}</section></div>
    </div>
    <button className="rx-directory" type="button" onClick={() => onNavigate('Alunos')}><span className="rx-icon rx-blue"><ManagementIcon name="search" size={20} /></span><span><b>Precisa encontrar um aluno?</b><small>Acesse os cadastros e pesquise por nome, CPF ou e-mail.</small></span><span className="rx-directory-action">Consultar alunos<ManagementIcon name="arrow" size={18} /></span></button>
  </section>
}
