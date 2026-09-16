import { useMemo } from 'react'
import './ManagementDashboard.css'

const currency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percent = (value) => `${Math.round(Number(value || 0))}%`
const todayIso = () => new Date().toISOString().slice(0, 10)

function ManagementDashboard({ health, appointments, receptionPanel, onNavigate, onRefresh }) {
  const hours = useMemo(() => Array.from({ length: 16 }, (_, index) => index + 6), [])
  const capacity = Math.max(health.slotCapacity || 0, 4)
  const todaysAppointments = appointments.filter((item) => item.appointment_date === todayIso() && item.status === 'CONFIRMADO')
  const bookingsByHour = todaysAppointments.reduce((groups, item) => {
    const hour = Number(String(item.start_time).slice(0, 2))
    groups[hour] = (groups[hour] || 0) + 1
    return groups
  }, {})
  const fullSlots = hours.filter((hour) => (bookingsByHour[hour] || 0) >= capacity).length
  const operationalCapacity = capacity * hours.length
  const dailyOccupancy = operationalCapacity ? (todaysAppointments.length / operationalCapacity) * 100 : 0
  const activeTotal = Object.values(health.planCounts).reduce((sum, amount) => sum + amount, 0)
  const planShare = (plan) => activeTotal ? (health.planCounts[plan] / activeTotal) * 100 : 0
  const currentHour = new Date().getHours()
  const nextSlots = hours.filter((hour) => hour >= currentHour).slice(0, 3)
  const attention = [
    { count: health.overdue, label: 'alunos inadimplentes', tone: 'high', action: 'Ver alunos', page: 'Pagamentos' },
    { count: fullSlots, label: 'horários lotados', tone: 'high', action: 'Ver agenda', page: 'Agenda' },
    { count: receptionPanel.waitlist, label: 'alunos na lista de espera', tone: 'medium', action: 'Ver lista', page: 'Agenda' },
    { count: health.dueSoon, label: 'pagamentos próximos do vencimento', tone: 'medium', action: 'Acompanhar', page: 'Pagamentos' },
    { count: health.inactiveStudents, label: 'alunos inativos ou suspensos', tone: 'medium', action: 'Ver alunos', page: 'Alunos' },
    { count: health.dueToday, label: 'vencimentos de hoje', tone: 'low', action: 'Regularizar', page: 'Pagamentos' },
  ]

  return <section className="management-dashboard">
    <div className="management-intro">
      <div><span className="management-eyebrow">VISÃO GERAL</span><h2>Acompanhe a operação do Studio em tempo real.</h2><p>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
      <div className="management-actions"><button className="outline-action" onClick={() => onNavigate('Relatórios')} type="button">Gerar relatório</button><button className="dashboard-primary-action" onClick={onRefresh} type="button">Atualizar dados</button></div>
    </div>

    <div className="management-kpis">
      <article className="management-kpi is-students"><span className="management-kpi-icon">◉</span><div><small>ALUNOS ATIVOS</small><strong>{health.activeStudents}</strong><p>{health.inactiveStudents} inativos ou suspensos</p></div></article>
      <article className="management-kpi is-occupancy"><span className="management-kpi-icon">▥</span><div><small>OCUPAÇÃO HOJE</small><strong>{percent(dailyOccupancy)}</strong><p>{todaysAppointments.length} de {operationalCapacity} vagas do dia</p></div></article>
      <article className="management-kpi is-revenue"><span className="management-kpi-icon">↗</span><div><small>RECEITA DO MÊS</small><strong>{currency(health.revenue)}</strong><p>{percent(health.collectionRate)} do valor previsto</p></div></article>
      <article className="management-kpi is-overdue"><span className="management-kpi-icon">!</span><div><small>INADIMPLÊNCIA</small><strong>{currency(health.overdueAmount)}</strong><p>{health.overdue} aluno(s) em atraso</p></div></article>
    </div>

    <div className="management-main-grid">
      <section className="management-panel operation-panel">
        <div className="management-panel-heading"><div><span className="management-eyebrow">OPERAÇÃO DE HOJE</span><h3>Ocupação por horário</h3></div><div className="operation-summary"><b>{todaysAppointments.length}</b> agendados <span>·</span> <b>{health.attendancePresent}</b> presentes <span>·</span> <b>{health.attendanceAbsent}</b> faltas</div></div>
        <div className="operation-legend"><span><i className="free" />Livre</span><span><i className="attention" />Atenção</span><span><i className="full" />Lotado</span></div>
        <div className="operation-chart">{hours.map((hour) => {
          const booked = bookingsByHour[hour] || 0
          const ratio = Math.min(100, (booked / capacity) * 100)
          const tone = booked >= capacity ? 'full' : ratio >= 75 ? 'attention' : 'free'
          return <article key={hour}><span>{String(hour).padStart(2, '0')}h</span><div><i className={tone} style={{ height: `${Math.max(10, ratio)}%` }}><b>{booked}/{capacity}</b></i></div><small>Musculação</small></article>
        })}</div>
      </section>

      <section className="management-panel financial-health">
        <div className="management-panel-heading"><div><span className="management-eyebrow">ESTE MÊS</span><h3>Saúde financeira</h3></div><button onClick={() => onNavigate('Pagamentos')} type="button">Ver detalhes →</button></div>
        <div className="financial-health-list">
          <div><span><i className="received" />Receita recebida</span><strong>{currency(health.revenue)}</strong></div>
          <div><span><i className="expected" />Receita prevista</span><strong>{currency(health.expectedRevenue)}</strong></div>
          <div><span><i className="expense" />Despesas</span><strong>{currency(health.expenses)}</strong></div>
          <div className="result"><span><i />Resultado no mês</span><strong className={health.netResult >= 0 ? 'positive' : 'negative'}>{currency(health.netResult)}</strong></div>
        </div>
        <div className="mini-financial-chart" aria-label="Evolução financeira recente">{health.financialHistory.slice(-8).map((item) => {
          const max = Math.max(1, ...health.financialHistory.slice(-8).map((entry) => entry.revenue))
          return <i key={item.period} title={`${item.label}: ${currency(item.revenue)}`} style={{ height: `${Math.max(8, (item.revenue / max) * 100)}%` }} />
        })}</div>
      </section>
    </div>

    <div className="management-secondary-grid">
      <section className="management-panel attention-center">
        <div className="management-panel-heading"><div><span className="management-eyebrow">PRIORIDADES</span><h3>Central de atenção</h3><p>Ações que precisam da gestão hoje.</p></div></div>
        <div className="attention-list">{attention.map((item) => <article key={item.label}><div><strong>{item.count}</strong><span>{item.label}</span></div><small className={`tone-${item.tone}`}>{item.tone === 'high' ? 'Alta' : item.tone === 'medium' ? 'Média' : 'Baixa'}</small><button onClick={() => onNavigate(item.page)} type="button">{item.action} →</button></article>)}</div>
      </section>

      <section className="management-panel financial-calendar-summary">
        <div className="management-panel-heading"><div><span className="management-eyebrow">AGENDA FINANCEIRA</span><h3>Calendário financeiro</h3></div><button onClick={() => onNavigate('Pagamentos')} type="button">Ver calendário →</button></div>
        <div className="calendar-summary-list"><div><span>Vencimentos hoje</span><strong>{health.dueToday}</strong></div><div><span>Próximos 7 dias</span><strong>{health.dueSoon}</strong></div><div className="danger"><span>Contas em atraso</span><strong>{health.overdue}</strong></div><div><span>Despesas programadas</span><strong>{health.expenseCategories.length}</strong></div></div>
      </section>
    </div>

    <div className="management-bottom-grid">
      <section className="management-panel base-profile">
        <div className="management-panel-heading"><div><span className="management-eyebrow">BASE DE ALUNOS</span><h3>Perfil da base</h3></div><strong>{activeTotal}</strong></div>
        <div className="base-profile-list">{[['MENSALISTA', 'Mensalistas'], ['WELLHUB', 'Wellhub'], ['TOTALPASS', 'TotalPass']].map(([plan, label]) => <article key={plan}><span>{label}</span><strong>{health.planCounts[plan]}</strong><div><i style={{ width: `${planShare(plan)}%` }} /></div><small>{percent(planShare(plan))}</small></article>)}</div>
      </section>
      <section className="management-panel next-slots">
        <div className="management-panel-heading"><div><span className="management-eyebrow">AGENDA</span><h3>Próximos horários</h3></div><button onClick={() => onNavigate('Agenda')} type="button">Ver agenda completa →</button></div>
        <div className="next-slot-list">{nextSlots.map((hour) => {
          const booked = bookingsByHour[hour] || 0
          const isFull = booked >= capacity
          return <article key={hour}><strong>{String(hour).padStart(2, '0')}:00</strong><span>Musculação</span><b>{booked}/{capacity} vagas</b><small className={isFull ? 'is-full' : booked / capacity >= .75 ? 'is-attention' : 'is-free'}>{isFull ? 'Lotado' : booked / capacity >= .75 ? 'Atenção' : 'Livre'}</small></article>
        })}</div>
      </section>
    </div>
  </section>
}

export default ManagementDashboard
