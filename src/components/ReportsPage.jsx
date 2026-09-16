import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './ReportsPage.css'

const date = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—'
const currency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

const reportDefinitions = {
  financeiro: { label: 'Financeiro', dateField: 'due_date', columns: ['Aluno', 'Plano', 'Vencimento', 'Pagamento', 'Valor', 'Situação'] },
  alunos: { label: 'Alunos', dateField: 'created_at', columns: ['Aluno', 'E-mail', 'Telefone', 'Plano', 'Status', 'Cadastro'] },
  agendamentos: { label: 'Agendamentos', dateField: 'appointment_date', columns: ['Aluno', 'Data', 'Horário', 'Status'] },
  frequencia: { label: 'Frequência', dateField: 'attendance_date', columns: ['Aluno', 'Data', 'Registro'] },
  equipe: { label: 'Equipe', dateField: 'hire_date', columns: ['Profissional', 'Cargo', 'Perfil', 'Status', 'Admissão'] },
}

function ReportsPage({ students, employees, payments }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`
  const [type, setType] = useState('financeiro')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [plan, setPlan] = useState('TODOS')
  const [status, setStatus] = useState('TODOS')
  const [search, setSearch] = useState('')
  const [appointments, setAppointments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const [appointmentResult, attendanceResult] = await Promise.all([
        supabase.from('appointments').select('id, student_id, appointment_date, start_time, status').order('appointment_date', { ascending: false }).limit(2000),
        supabase.from('attendance').select('id, student_id, attendance_date, status').order('attendance_date', { ascending: false }).limit(2000),
      ])
      if (active) {
        setAppointments(appointmentResult.data ?? [])
        setAttendance(attendanceResult.data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students])
  const sourceRows = useMemo(() => {
    if (type === 'financeiro') return payments.map((item) => ({ ...item, _name: item.student?.full_name || 'Aluno', _plan: item.payment_type === 'MENSALIDADE' ? 'MENSALISTA' : item.payment_type }))
    if (type === 'alunos') return students.map((item) => ({ ...item, _name: item.profile?.full_name || 'Aluno', _plan: item.payment_plan || 'MENSALISTA' }))
    if (type === 'agendamentos') return appointments.map((item) => ({ ...item, _name: studentById.get(item.student_id)?.profile?.full_name || 'Aluno', _plan: studentById.get(item.student_id)?.payment_plan || 'MENSALISTA' }))
    if (type === 'frequencia') return attendance.map((item) => ({ ...item, _name: studentById.get(item.student_id)?.profile?.full_name || 'Aluno', _plan: studentById.get(item.student_id)?.payment_plan || 'MENSALISTA' }))
    return employees.map((item) => ({ ...item, _name: item.profile?.full_name || 'Profissional' }))
  }, [type, payments, students, appointments, attendance, employees, studentById])

  const availableStatuses = useMemo(() => [...new Set(sourceRows.map((row) => row.status).filter(Boolean))].sort(), [sourceRows])
  const filteredRows = useMemo(() => {
    const dateField = reportDefinitions[type].dateField
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return sourceRows.filter((row) => {
      const rowDate = String(row[dateField] || '').slice(0, 10)
      const inPeriod = (!from || !rowDate || rowDate >= from) && (!to || !rowDate || rowDate <= to)
      const inPlan = plan === 'TODOS' || row._plan === plan
      const inStatus = status === 'TODOS' || row.status === status
      const inSearch = !term || row._name.toLocaleLowerCase('pt-BR').includes(term)
      return inPeriod && inPlan && inStatus && inSearch
    })
  }, [sourceRows, type, from, to, plan, status, search])

  const valuesFor = (row) => {
    if (type === 'financeiro') return [row._name, row._plan, date(row.due_date), date(row.payment_date), currency(row.amount), row.status]
    if (type === 'alunos') return [row._name, row.profile?.email, row.profile?.phone, row._plan, row.status, date(String(row.created_at || '').slice(0, 10))]
    if (type === 'agendamentos') return [row._name, date(row.appointment_date), String(row.start_time).slice(0, 5), row.status]
    if (type === 'frequencia') return [row._name, date(row.attendance_date), row.status]
    return [row._name, row.position, row.profile?.role, row.status, date(row.hire_date)]
  }

  const exportCsv = () => {
    const definition = reportDefinitions[type]
    const rows = [definition.columns, ...filteredRows.map(valuesFor)]
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(';')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `power-fit-${type}-${from || 'inicio'}-${to || 'hoje'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalValue = type === 'financeiro' ? filteredRows.reduce((sum, item) => sum + Number(item.amount || 0), 0) : null
  const changeType = (value) => { setType(value); setStatus('TODOS'); setPlan('TODOS') }
  const showPlan = ['financeiro', 'alunos', 'agendamentos', 'frequencia'].includes(type)

  return <section className="reports-page">
    <div className="reports-heading"><div><span className="management-eyebrow">ANÁLISE E EXPORTAÇÃO</span><h2>Relatórios personalizados</h2><p>Escolha exatamente quais informações deseja visualizar ou exportar.</p></div><div><button className="outline-action" onClick={() => window.print()} type="button">Imprimir</button><button className="dashboard-primary-action" disabled={!filteredRows.length} onClick={exportCsv} type="button">Exportar CSV</button></div></div>

    <div className="report-filters">
      <label>Relatório<select value={type} onChange={(event) => changeType(event.target.value)}>{Object.entries(reportDefinitions).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
      <label>De<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>Até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      {showPlan && <label>Plano<select value={plan} onChange={(event) => setPlan(event.target.value)}><option value="TODOS">Todos</option><option value="MENSALISTA">Mensalistas</option><option value="WELLHUB">Wellhub</option><option value="TOTALPASS">TotalPass</option></select></label>}
      <label>Situação<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="TODOS">Todas</option>{availableStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="report-search">Buscar<input type="search" placeholder="Nome do aluno ou profissional" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    </div>

    <div className="report-presets"><span>Período rápido:</span><button onClick={() => { setFrom(monthStart); setTo(today) }} type="button">Este mês</button><button onClick={() => { const value = new Date(); value.setDate(value.getDate() - 30); setFrom(value.toISOString().slice(0, 10)); setTo(today) }} type="button">Últimos 30 dias</button><button onClick={() => { const value = new Date(); value.setMonth(value.getMonth() - 12); setFrom(value.toISOString().slice(0, 10)); setTo(today) }} type="button">Últimos 12 meses</button><button onClick={() => { setFrom(''); setTo('') }} type="button">Todo o histórico</button></div>

    <div className="report-summary"><article><small>REGISTROS ENCONTRADOS</small><strong>{filteredRows.length}</strong></article><article><small>TIPO DE RELATÓRIO</small><strong>{reportDefinitions[type].label}</strong></article>{totalValue !== null && <article><small>VALOR TOTAL FILTRADO</small><strong>{currency(totalValue)}</strong></article>}<article><small>PERÍODO</small><strong>{from ? date(from) : 'Início'} — {to ? date(to) : 'Hoje'}</strong></article></div>

    <div className="report-table-wrap"><table><thead><tr>{reportDefinitions[type].columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{loading && ['agendamentos', 'frequencia'].includes(type) ? <tr><td colSpan={reportDefinitions[type].columns.length}>Carregando dados…</td></tr> : filteredRows.length ? filteredRows.map((row, index) => <tr key={row.id || index}>{valuesFor(row).map((value, cellIndex) => <td key={`${row.id || index}-${cellIndex}`}>{value || '—'}</td>)}</tr>) : <tr><td colSpan={reportDefinitions[type].columns.length}>Nenhum registro corresponde aos filtros selecionados.</td></tr>}</tbody></table></div>
  </section>
}

export default ReportsPage
