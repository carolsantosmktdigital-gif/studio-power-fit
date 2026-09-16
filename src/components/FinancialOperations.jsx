import { useMemo, useState } from 'react'
import './FinancialOperations.css'

const currency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const isoDate = (date) => date.toISOString().slice(0, 10)

const paymentState = (payment) => {
  const today = isoDate(new Date())
  if (payment.status === 'IDENTIFICADO') return { label: 'Pago', tone: 'is-paid' }
  if (payment.status === 'CANCELADO') return { label: 'Cancelado', tone: 'is-cancelled' }
  if (payment.due_date < today) return { label: 'Vencido', tone: 'is-overdue' }
  if (payment.due_date === today) return { label: 'Vence hoje', tone: 'is-today' }
  return { label: 'A vencer', tone: 'is-upcoming' }
}

function FinancialOperations({ health, payments, onOpenPayments }) {
  const today = new Date()
  const todayIso = isoDate(today)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const paymentsByDate = useMemo(() => payments.reduce((groups, payment) => {
    if (String(payment.due_date).startsWith(monthPrefix)) {
      groups[payment.due_date] = [...(groups[payment.due_date] || []), payment]
    }
    return groups
  }, {}), [payments, monthPrefix])

  const calendarDays = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `blank-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const date = `${monthPrefix}-${String(day).padStart(2, '0')}`
      return { key: date, date, day, entries: paymentsByDate[date] || [] }
    }),
  ]
  const selectedPayments = paymentsByDate[selectedDate] || []
  const chartMax = Math.max(1, ...health.financialHistory.flatMap((item) => [item.revenue, item.expenses]))
  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

  return <section className="financial-operations">
    <div className="today-finance-grid">
      <article className="today-finance-card is-paid-today"><small>PAGAMENTOS RECEBIDOS HOJE</small><strong>{currency(health.paidTodayAmount)}</strong><span>{health.paidToday} pagamento(s) identificado(s)</span></article>
      <article className="today-finance-card is-due-today"><small>VENCIMENTOS DE HOJE</small><strong>{currency(health.dueTodayAmount)}</strong><span>{health.dueToday} cobrança(s) aguardando</span></article>
      <article className="today-finance-card is-expense"><small>DESPESAS DO MÊS</small><strong>{currency(health.expenses)}</strong><span>Custos operacionais simulados</span></article>
      <article className={`today-finance-card ${health.netResult >= 0 ? 'is-positive' : 'is-negative'}`}><small>RESULTADO DO MÊS</small><strong>{currency(health.netResult)}</strong><span>{health.netResult >= 0 ? 'Saldo operacional positivo' : 'Despesas acima das receitas'}</span></article>
    </div>

    <div className="financial-history-panel">
      <div className="financial-section-heading"><div><span className="placeholder-kicker">25 MESES DE OPERAÇÃO</span><h3>Receitas e despesas</h3></div><div className="chart-legend"><span><i className="revenue-dot" />Receitas</span><span><i className="expense-dot" />Despesas</span></div></div>
      <div className="financial-chart-scroll">
        <div className="financial-chart" role="img" aria-label="Comparativo mensal de receitas e despesas dos últimos 25 meses">
          {health.financialHistory.map((item) => <div className="financial-chart-column" key={item.period} title={`${item.label}: receitas ${currency(item.revenue)}, despesas ${currency(item.expenses)}`}><div className="financial-chart-bars"><i className="revenue-bar" style={{ height: `${(item.revenue / chartMax) * 100}%` }} /><i className="expense-bar" style={{ height: `${(item.expenses / chartMax) * 100}%` }} /></div><span>{item.label}</span></div>)}
        </div>
      </div>
      <div className="financial-history-summary"><span>Receita acumulada <b>{currency(health.financialHistory.reduce((sum, item) => sum + item.revenue, 0))}</b></span><span>Despesas acumuladas <b>{currency(health.financialHistory.reduce((sum, item) => sum + item.expenses, 0))}</b></span><span>Resultado acumulado <b>{currency(health.financialHistory.reduce((sum, item) => sum + item.result, 0))}</b></span></div>
    </div>

    <div className="financial-detail-grid">
      <section className="financial-calendar-panel">
        <div className="financial-section-heading"><div><span className="placeholder-kicker">AGENDA FINANCEIRA</span><h3>Calendário de vencimentos</h3></div><strong>{today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong></div>
        <div className="calendar-weekdays">{['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="finance-calendar">{calendarDays.map((item) => {
          if (!item.date) return <span className="calendar-blank" key={item.key} />
          const hasOverdue = item.entries.some((entry) => paymentState(entry).tone === 'is-overdue')
          const isToday = item.date === todayIso
          return <button className={`${item.entries.length ? 'has-payments' : ''} ${hasOverdue ? 'has-overdue' : ''} ${isToday ? 'is-today' : ''} ${selectedDate === item.date ? 'is-selected' : ''}`} key={item.key} onClick={() => setSelectedDate(item.date)} type="button"><span>{item.day}</span>{item.entries.length > 0 && <small>{item.entries.length}</small>}</button>
        })}</div>
        <div className="selected-due-list"><div><strong>{selectedLabel}</strong><span>{selectedPayments.length} vencimento(s)</span></div>{selectedPayments.length ? selectedPayments.slice(0, 6).map((payment) => { const state = paymentState(payment); return <article key={payment.id}><div><strong>{payment.student?.full_name || 'Aluno'}</strong><span>{payment.payment_type === 'MENSALIDADE' ? 'Mensalista' : payment.payment_type}</span></div><b>{currency(payment.amount)}</b><small className={state.tone}>{state.label}</small></article> }) : <p>Nenhum vencimento para esta data.</p>}<button className="outline-action" onClick={onOpenPayments} type="button">Ver todos os pagamentos</button></div>
      </section>

      <section className="expense-breakdown-panel">
        <div className="financial-section-heading"><div><span className="placeholder-kicker">CUSTOS OPERACIONAIS</span><h3>Despesas do mês</h3></div><strong>{currency(health.expenses)}</strong></div>
        <div className="expense-breakdown">{health.expenseCategories.map((expense) => <article key={expense.label}><div><span>{expense.label}</span><strong>{currency(expense.amount)}</strong></div><div><i style={{ width: `${health.expenses ? (expense.amount / health.expenses) * 100 : 0}%` }} /></div></article>)}</div>
        <div className="expense-note"><span>i</span><p>Valores fictícios e consistentes, criados exclusivamente para demonstrar a análise gerencial do sistema.</p></div>
      </section>
    </div>
  </section>
}

export default FinancialOperations
