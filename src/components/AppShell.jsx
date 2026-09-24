import ReceptionNotifications from './ReceptionNotifications'
import ReceptionWaitlist from './ReceptionWaitlist'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_BATCH_ID, seedDemoData } from '../lib/demoSeed'
import studioLogo from '../assets/studio-power-fit-logo.png'
import ManagementDashboard from './ManagementDashboard'
import ReceptionDashboard from './ReceptionDashboard'
import ReportsPage from './ReportsPage'
import ManagementIcon from './ManagementIcon'
import './DemoSeed.css'
import './ExecutiveDashboard.css'
import './ManagementMobile.css'

const defaultWorkSchedule = [
  { weekday: 1, label: 'Segunda-feira', active: true, periods: [{ start_time: '08:00', end_time: '17:00' }] },
  { weekday: 2, label: 'Terça-feira', active: true, periods: [{ start_time: '08:00', end_time: '17:00' }] },
  { weekday: 3, label: 'Quarta-feira', active: true, periods: [{ start_time: '08:00', end_time: '17:00' }] },
  { weekday: 4, label: 'Quinta-feira', active: true, periods: [{ start_time: '08:00', end_time: '17:00' }] },
  { weekday: 5, label: 'Sexta-feira', active: true, periods: [{ start_time: '08:00', end_time: '17:00' }] },
  { weekday: 6, label: 'Sábado', active: false, periods: [{ start_time: '08:00', end_time: '12:00' }] },
  { weekday: 0, label: 'Domingo', active: false, periods: [{ start_time: '08:00', end_time: '12:00' }] },
]

const freshWorkSchedule = () => defaultWorkSchedule.map((day) => ({ ...day, periods: day.periods.map((period) => ({ ...period })) }))
const emptyForm = { documents: [], full_name: '', email: '', phone: '', password: '', role: 'ALUNO', position: '', hire_date: '', cpf: '', birth_date: '', address_zip_code: '', address_street: '', address_number: '', address_complement: '', address_district: '', address_city: '', address_state: '', employment_type: '', notes: '', payment_plan: 'MENSALISTA', work_schedule: [] }

const onlyDigits = (value) => String(value || '').replace(/\D/g, '')
const formatCpf = (value) => onlyDigits(value).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
const formatPhone = (value) => onlyDigits(value).slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
const formatCep = (value) => onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
const normalizePlan = (value) => {
  const plan = String(value || '').toUpperCase().replace(/[\s_-]/g, '')
  if (plan === 'WELLHUB' || plan === 'GYMPASS') return 'WELLHUB'
  if (plan === 'TOTALPASS') return 'TOTALPASS'
  return 'MENSALISTA'
}
const formatPlan = (value) => {
  const plan = normalizePlan(value)
  if (plan === 'MENSALISTA') return 'Mensalista'
  if (plan === 'TOTALPASS') return 'TotalPass'
  return 'Wellhub'
}
const maskedProfile = (profile = {}) => ({ ...profile, cpf: formatCpf(profile.cpf), phone: formatPhone(profile.phone), address_zip_code: formatCep(profile.address_zip_code) })
const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatPercent = (value) => `${Math.round(Number(value || 0))}%`
const normalizeDirectorySearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const getPaymentPresentation = (payment) => {
  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const soonLimit = sevenDaysFromNow.toISOString().slice(0, 10)
  if (payment.status === 'IDENTIFICADO') return { label: 'Pago', tone: 'is-paid', priority: 3 }
  if (payment.status === 'CANCELADO') return { label: 'Cancelado', tone: 'is-cancelled', priority: 4 }
  if (payment.due_date < today) return { label: 'Vencido', tone: 'is-overdue', priority: 0 }
  if (payment.due_date <= soonLimit) return { label: 'A vencer', tone: 'is-due-soon', priority: 1 }
  return { label: 'Pendente', tone: 'is-pending', priority: 2 }
}

function WorkScheduleEditor({ schedule, onChange, required = false }) {
  const days = schedule?.length ? schedule : freshWorkSchedule()
  const firstPeriod = (day) => day.periods?.[0] || { start_time: '', end_time: '' }
  const updateDay = (weekday, patch) => onChange(days.map((day) => day.weekday === weekday ? { ...day, ...patch } : day))
  const updateTime = (weekday, field, value) => onChange(days.map((day) => day.weekday === weekday ? { ...day, periods: [{ ...firstPeriod(day), [field]: value }] } : day))
  const isWeekend = (weekday) => weekday === 0 || weekday === 6
  const copyFirstActiveTime = () => {
    const source = days.find((day) => day.active && firstPeriod(day).start_time && firstPeriod(day).end_time)
    if (!source) return
    const sourcePeriod = firstPeriod(source)
    onChange(days.map((day) => day.active ? { ...day, periods: [{ start_time: sourcePeriod.start_time, end_time: sourcePeriod.end_time }] } : day))
  }

  return <fieldset className="work-schedule-editor">
    <legend>Horário de expediente{required ? ' *' : ''}</legend>
    <p className="work-schedule-help">Defina os dias em que o funcionário trabalha e informe o horário de entrada e saída.</p>
    <div className="work-schedule-shift-note"><strong>Sábado e domingo funcionam por escala.</strong><span>Marque o dia somente quando fizer parte do expediente do funcionário.</span></div>
    <div className="work-schedule-table">
      <div className="work-schedule-head"><span>Dia da semana</span><span>Trabalha</span><span>Entrada</span><span>Saída</span></div>
      {days.map((day) => {
        const period = firstPeriod(day)
        return <div className={`work-schedule-row ${day.active ? 'is-active' : 'is-off'}`} key={day.weekday}>
          <strong>{day.label}{isWeekend(day.weekday) && <small> (escala)</small>}</strong>
          <label className="work-schedule-check"><input aria-label={`${day.label}: trabalha`} type="checkbox" checked={day.active} onChange={(event) => updateDay(day.weekday, { active: event.target.checked })} /></label>
          <label className="work-schedule-time"><span>Entrada</span><input type="time" value={period.start_time} disabled={!day.active} onChange={(event) => updateTime(day.weekday, 'start_time', event.target.value)} required={day.active} /></label>
          <label className="work-schedule-time"><span>Saída</span><input type="time" value={period.end_time} disabled={!day.active} onChange={(event) => updateTime(day.weekday, 'end_time', event.target.value)} required={day.active} /></label>
        </div>
      })}
    </div>
    <button type="button" className="schedule-copy-all" onClick={copyFirstActiveTime}>Copiar horário para todos os dias selecionados</button>
    <small className="schedule-copy-hint">O primeiro horário preenchido será aplicado aos demais dias marcados.</small>
  </fieldset>
}

function AppShell({ profile, onLogout }) {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('power-fit-theme') === 'dark' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('power-fit-theme', darkMode ? 'dark' : 'light') } catch { /* Storage may be unavailable. */ }
  }, [darkMode])
  const [page, setPage] = useState('Início')
  const [waitlistFocus, setWaitlistFocus] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [students, setStudents] = useState([])
  const [employees, setEmployees] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [agendaWaitlist, setAgendaWaitlist] = useState([])
  const [agendaDate, setAgendaDate] = useState(() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [agendaTeacher, setAgendaTeacher] = useState('')
  const [agendaStatus, setAgendaStatus] = useState('')
  const [payments, setPayments] = useState([])
  const [health, setHealth] = useState({
    activeStudents: 0,
    inactiveStudents: 0,
    activeEmployees: 0,
    revenue: 0,
    expectedRevenue: 0,
    collectionRate: 0,
    overdue: 0,
    overdueAmount: 0,
    dueSoon: 0,
    dueSoonAmount: 0,
    todayAppointments: 0,
    activeTeachers: 0,
    slotCapacity: 0,
    peakBooked: 0,
    occupancyRate: 0,
    attendancePresent: 0,
    attendanceAbsent: 0,
    attendanceRate: 0,
    expenses: 0,
    netResult: 0,
    paidToday: 0,
    paidTodayAmount: 0,
    dueToday: 0,
    dueTodayAmount: 0,
    financialHistory: [],
    expenseCategories: [],
    planCounts: { MENSALISTA: 0, WELLHUB: 0, TOTALPASS: 0 },
  })
  const [receptionPanel, setReceptionPanel] = useState({ appointments: [], present: 0, absent: 0, activeTeachers: 0, overdue: 0, waitlist: 0, birthdays: [] })
  const [receptionLoading, setReceptionLoading] = useState(true)
  const [receptionError, setReceptionError] = useState('')
  const [receptionUpdatedAt, setReceptionUpdatedAt] = useState(null)
  const [notice, setNotice] = useState('')
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [form, setForm] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [studentTab, setStudentTab] = useState('dados')
  const [paymentStudentFilter, setPaymentStudentFilter] = useState(null)
  const [quickAction, setQuickAction] = useState(null)
  const [quickSlots, setQuickSlots] = useState([])
  const [quickLoading, setQuickLoading] = useState(false)
  const [quickStudentSearch, setQuickStudentSearch] = useState('')
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [directorySearch, setDirectorySearch] = useState({ Alunos: '', Funcionários: '' })
  const [modalError, setModalError] = useState('')
  const isAdmin = profile.role === 'ADMIN'

  const loadStudents = async () => {
    let { data, error } = await supabase.from('students').select('id, profile_id, status, payment_plan, billing_due_day, monthly_fee, created_at').order('created_at', { ascending: false })
    if (error && /payment_plan|schema cache|column/i.test(error.message || '')) {
      const fallback = await supabase.from('students').select('id, profile_id, status, created_at').order('created_at', { ascending: false })
      data = fallback.data
      error = fallback.error
    }
    if (error) return setNotice(error.message)
    const ids = data.map((item) => item.profile_id)
    const { data: profiles, error: profilesError } = ids.length ? await supabase.from('profiles').select('id, full_name, email, phone, cpf, birth_date, address_zip_code, address_street, address_number, address_complement, address_district, address_city, address_state').in('id', ids) : { data: [], error: null }
    if (profilesError) return setNotice(`Não foi possível carregar os dados dos alunos: ${profilesError.message}`)
    const byId = new Map((profiles ?? []).map((item) => [item.id, item]))
    setStudents(data.map((item) => ({ ...item, profile: byId.get(item.profile_id) })))
  }

  const loadEmployees = async () => {
    const { data, error: employeesError } = await supabase.from('employees').select('id, profile_id, position, status, hire_date, employment_type, notes, created_at').order('created_at', { ascending: false })
    if (employeesError) return setNotice(`Não foi possível carregar os professores: ${employeesError.message}`)
    const ids = (data ?? []).map((item) => item.profile_id)
    const { data: profiles, error: profilesError } = ids.length ? await supabase.from('profiles').select('id, full_name, email, phone, cpf, birth_date, address_zip_code, address_street, address_number, address_complement, address_district, address_city, address_state, role').in('id', ids) : { data: [], error: null }
    if (profilesError) return setNotice(`Não foi possível carregar os dados dos funcionários: ${profilesError.message}`)
    const byId = new Map((profiles ?? []).map((item) => [item.id, item]))
    const professorProfileIds = (data ?? []).filter((item) => item.status === 'ATIVO' && String(item.position || '').toLowerCase().includes('professor')).map((item) => item.profile_id)
    const { data: teacherRows, error: teachersError } = professorProfileIds.length ? await supabase.from('teachers').select('id, profile_id, status').in('profile_id', professorProfileIds) : { data: [], error: null }
    if (teachersError) return setNotice(`Não foi possível carregar os vínculos dos professores: ${teachersError.message}`)
    const teacherByProfile = new Map((teacherRows ?? []).map((item) => [item.profile_id, item]))
    setEmployees((data ?? []).map((item) => ({ ...item, profile: byId.get(item.profile_id), teacher_id: teacherByProfile.get(item.profile_id)?.id || null, teacher_status: teacherByProfile.get(item.profile_id)?.status || null })))
  }

  const loadAudit = async () => {
    const { data, error } = await supabase.from('audit_logs').select('id, user_id, action, module, table_name, created_at').order('created_at', { ascending: false }).limit(200)
    if (error) return
    const ids = [...new Set((data ?? []).map((item) => item.user_id).filter(Boolean))]
    const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name, role').in('id', ids) : { data: [] }
    const byId = new Map((people ?? []).map((item) => [item.id, item]))
    setAuditLogs((data ?? []).map((item) => ({ ...item, person: byId.get(item.user_id) })).filter((item) => ['RECEPCAO', 'PROFESSOR'].includes(item.person?.role)))
  }

  const loadHealth = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = `${today.slice(0, 7)}-01`
    const nextMonth = new Date(`${monthStart}T12:00:00`)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const monthEnd = nextMonth.toISOString().slice(0, 10)
    const dueSoonDate = new Date()
    dueSoonDate.setDate(dueSoonDate.getDate() + 7)
    const dueSoonLimit = dueSoonDate.toISOString().slice(0, 10)
    const [studentResult, staff, paymentResult, appointmentResult, teacherResult, attendanceResult] = await Promise.all([
      supabase.from('students').select('id, status'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
      supabase.from('payments').select('student_id, amount, status, due_date, payment_date, payment_type'),
      supabase.from('appointments').select('start_time, status').eq('appointment_date', today).eq('status', 'CONFIRMADO'),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
      supabase.from('attendance').select('status, attendance_date').gte('attendance_date', monthStart).lt('attendance_date', monthEnd),
    ])
    const studentRows = studentResult.data ?? []
    const activeRows = studentRows.filter((item) => item.status === 'ATIVO')
    const paymentRows = paymentResult.data ?? []
    const currentPayments = paymentRows.filter((item) => item.due_date >= monthStart && item.due_date < monthEnd && item.status !== 'CANCELADO')
    const paidRows = currentPayments.filter((item) => item.status === 'IDENTIFICADO')
    const overdueRows = paymentRows.filter((item) => !['IDENTIFICADO', 'CANCELADO'].includes(item.status) && item.due_date < today)
    const dueSoonRows = paymentRows.filter((item) => !['IDENTIFICADO', 'CANCELADO'].includes(item.status) && item.due_date >= today && item.due_date <= dueSoonLimit)
    const attendanceRows = attendanceResult.data ?? []
    const attendancePresent = attendanceRows.filter((item) => item.status === 'PRESENTE').length
    const attendanceAbsent = attendanceRows.filter((item) => item.status === 'AUSENTE').length
    const attendanceTotal = attendancePresent + attendanceAbsent
    const appointmentRows = appointmentResult.data ?? []
    const appointmentsByTime = appointmentRows.reduce((groups, item) => {
      const time = String(item.start_time).slice(0, 5)
      groups[time] = (groups[time] || 0) + 1
      return groups
    }, {})
    const activeTeachers = teacherResult.count ?? 0
    const slotCapacity = activeTeachers * 4
    const peakBooked = Math.max(0, ...Object.values(appointmentsByTime))
    const latestPlanByStudent = paymentRows.reduce((plans, item) => {
      const current = plans.get(item.student_id)
      if (!current || String(item.due_date) > String(current.due_date)) plans.set(item.student_id, { due_date: item.due_date, plan: item.payment_type === 'MENSALIDADE' ? 'MENSALISTA' : item.payment_type })
      return plans
    }, new Map())
    const planCounts = activeRows.reduce((counts, item) => {
      const plan = latestPlanByStudent.get(item.id)?.plan || 'MENSALISTA'
      counts[plan] = (counts[plan] || 0) + 1
      return counts
    }, { MENSALISTA: 0, WELLHUB: 0, TOTALPASS: 0 })
    const revenue = paidRows.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const expectedRevenue = currentPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const paidTodayRows = paymentRows.filter((item) => item.status === 'IDENTIFICADO' && item.payment_date === today)
    const dueTodayRows = paymentRows.filter((item) => !['IDENTIFICADO', 'CANCELADO'].includes(item.status) && item.due_date === today)
    const financialHistory = Array.from({ length: 25 }, (_, index) => {
      const periodDate = new Date()
      periodDate.setDate(1)
      periodDate.setMonth(periodDate.getMonth() - 24 + index)
      const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`
      const periodRevenue = paymentRows.filter((item) => item.status === 'IDENTIFICADO' && String(item.due_date).startsWith(period)).reduce((sum, item) => sum + Number(item.amount || 0), 0)
      const growth = 0.72 + (index * 0.012)
      const expenseCategories = [
        { label: 'Equipe', amount: Math.round(720 * growth) },
        { label: 'Aluguel', amount: Math.round(690 * growth) },
        { label: 'Energia e água', amount: Math.round((185 + ((index % 4) * 17)) * growth) },
        { label: 'Sistemas', amount: Math.round(95 * growth) },
        { label: 'Marketing', amount: Math.round((110 + ((index % 3) * 25)) * growth) },
        { label: 'Manutenção', amount: Math.round((70 + ((index % 5) * 18)) * growth) },
      ]
      const expenses = expenseCategories.reduce((sum, item) => sum + item.amount, 0)
      return {
        period,
        label: periodDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
        revenue: periodRevenue,
        expenses,
        result: periodRevenue - expenses,
        expenseCategories,
      }
    })
    const currentFinancialPeriod = financialHistory.at(-1) ?? { expenses: 0, expenseCategories: [] }
    setHealth({
      activeStudents: activeRows.length,
      inactiveStudents: studentRows.length - activeRows.length,
      activeEmployees: staff.count ?? 0,
      revenue,
      expectedRevenue,
      collectionRate: expectedRevenue ? (revenue / expectedRevenue) * 100 : 0,
      overdue: overdueRows.length,
      overdueAmount: overdueRows.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      dueSoon: dueSoonRows.length,
      dueSoonAmount: dueSoonRows.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      todayAppointments: appointmentRows.length,
      activeTeachers,
      slotCapacity,
      peakBooked,
      occupancyRate: slotCapacity ? (peakBooked / slotCapacity) * 100 : 0,
      attendancePresent,
      attendanceAbsent,
      attendanceRate: attendanceTotal ? (attendancePresent / attendanceTotal) * 100 : 0,
      expenses: currentFinancialPeriod.expenses,
      netResult: revenue - currentFinancialPeriod.expenses,
      paidToday: paidTodayRows.length,
      paidTodayAmount: paidTodayRows.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      dueToday: dueTodayRows.length,
      dueTodayAmount: dueTodayRows.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      financialHistory,
      expenseCategories: currentFinancialPeriod.expenseCategories,
      planCounts,
    })
  }

  const loadAgenda = async () => {
    const today = todayIso()
    const { data } = await supabase.from('appointments').select('id, student_id, teacher_id, appointment_date, start_time, status').gte('appointment_date', today).neq('status', 'CANCELADO').order('appointment_date').order('start_time').limit(500)
    const studentIds = [...new Set((data ?? []).map((item) => item.student_id))]
    const { data: studentsData } = studentIds.length ? await supabase.from('students').select('id, profile_id').in('id', studentIds) : { data: [] }
    const profileIds = (studentsData ?? []).map((item) => item.profile_id)
    const { data: people } = profileIds.length ? await supabase.from('profiles').select('id, full_name').in('id', profileIds) : { data: [] }
    const profilesById = new Map((people ?? []).map((item) => [item.id, item]))
    const studentById = new Map((studentsData ?? []).map((item) => [item.id, profilesById.get(item.profile_id)]))
    setAppointments((data ?? []).filter((item) => String(item.status || '').trim().toUpperCase() !== 'CANCELADO').map((item) => ({ ...item, student: studentById.get(item.student_id) })))
    const { data: waitRows } = await supabase.from('waitlist').select('id, student_id, appointment_date, start_time, position, status').gte('appointment_date', today).eq('status', 'AGUARDANDO').order('appointment_date').order('start_time').order('position')
    const waitStudentIds = [...new Set((waitRows ?? []).map((item) => item.student_id))]
    const { data: waitStudents } = waitStudentIds.length ? await supabase.from('students').select('id, profile_id').in('id', waitStudentIds) : { data: [] }
    const waitProfileIds = (waitStudents ?? []).map((item) => item.profile_id)
    const { data: waitPeople } = waitProfileIds.length ? await supabase.from('profiles').select('id, full_name').in('id', waitProfileIds) : { data: [] }
    const waitProfilesById = new Map((waitPeople ?? []).map((item) => [item.id, item]))
    const waitStudentById = new Map((waitStudents ?? []).map((item) => [item.id, waitProfilesById.get(item.profile_id)]))
    setAgendaWaitlist((waitRows ?? []).map((item) => ({ ...item, student: waitStudentById.get(item.student_id) })))
  }

  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('id, student_id, amount, due_date, payment_date, status, payment_type').order('due_date', { ascending: false }).limit(2000)
    const studentIds = [...new Set((data ?? []).map((item) => item.student_id))]
    const { data: studentsData } = studentIds.length ? await supabase.from('students').select('id, profile_id').in('id', studentIds) : { data: [] }
    const profileIds = (studentsData ?? []).map((item) => item.profile_id)
    const { data: people } = profileIds.length ? await supabase.from('profiles').select('id, full_name').in('id', profileIds) : { data: [] }
    const profilesById = new Map((people ?? []).map((item) => [item.id, item]))
    const studentById = new Map((studentsData ?? []).map((item) => [item.id, profilesById.get(item.profile_id)]))
    setPayments((data ?? []).map((item) => ({ ...item, student: studentById.get(item.student_id) })).sort((a, b) => {
      const presentationDiff = getPaymentPresentation(a).priority - getPaymentPresentation(b).priority
      return presentationDiff || String(b.due_date).localeCompare(String(a.due_date))
    }))
  }

  const loadReceptionPanel = async () => {
    setReceptionLoading(true)
    try {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const [agenda, attendance, bookingSlots, paymentsData, profilesData] = await Promise.all([
        supabase.from('appointments').select('id, student_id, teacher_id, appointment_date, start_time, status, students(profile_id, profiles:profile_id(full_name)), employees:teacher_id(profile_id, profiles:profile_id(full_name))').eq('appointment_date', today).eq('status', 'CONFIRMADO').order('start_time'),
        supabase.from('attendance').select('status, attendance_date').eq('attendance_date', today),
        supabase.rpc('get_student_booking_slots', { p_start_date: today }),
        supabase.from('payments').select('status, due_date').lt('due_date', today),
        supabase.from('profiles').select('id, full_name, birth_date, phone').not('birth_date', 'is', null),
      ])
      const monthDay = today.slice(5)
      const birthdays = (profilesData.data ?? []).filter((person) => String(person.birth_date).slice(5) === monthDay)
      const slots = bookingSlots.data ?? []
      const activeTeachers = Math.ceil(Math.max(0, ...slots.map((slot) => Number(slot.capacity || 0))) / 4)
      const waitlist = slots.reduce((total, slot) => total + Number(slot.waitlist_count || 0), 0)
      setReceptionPanel((current) => ({
        appointments: agenda.error ? current.appointments : agenda.data ?? [],
        present: attendance.error ? current.present : (attendance.data ?? []).filter((item) => item.status === 'PRESENTE').length,
        absent: attendance.error ? current.absent : (attendance.data ?? []).filter((item) => item.status === 'AUSENTE').length,
        activeTeachers: bookingSlots.error ? current.activeTeachers : activeTeachers,
        overdue: paymentsData.error ? current.overdue : (paymentsData.data ?? []).filter((item) => !['IDENTIFICADO', 'CANCELADO'].includes(item.status)).length,
        waitlist: bookingSlots.error ? current.waitlist : waitlist,
        birthdays: profilesData.error ? current.birthdays : birthdays,
      }))
      setReceptionUpdatedAt(new Date())
      setReceptionError(agenda.error ? 'Não foi possível atualizar a agenda neste momento.' : '')
    } catch {
      setReceptionError('O painel não pôde ser atualizado. Tente novamente.')
    } finally {
      setReceptionLoading(false)
    }
  }

  useEffect(() => { loadStudents(); loadEmployees(); loadAudit(); loadHealth(); loadAgenda(); loadPayments(); loadReceptionPanel() }, [])

  useEffect(() => {
    document.querySelector('.dashboard-shell .app-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  useEffect(() => {
    if (!form && !editingStudent && !editingEmployee) setModalError('')
  }, [form, editingStudent, editingEmployee])

  useEffect(() => {
    if (isAdmin) return undefined
    const timer = window.setInterval(() => { loadReceptionPanel(); loadAgenda(); loadPayments(); loadEmployees() }, 30000)
    return () => window.clearInterval(timer)
  }, [isAdmin])

  useEffect(() => {
    const applyMask = (event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement)) return
      const label = input.closest('label')?.textContent || ''
      const field = label.startsWith('CPF') ? 'cpf' : label.startsWith('Telefone') ? 'phone' : label.startsWith('CEP') ? 'address_zip_code' : null
      if (!field) return
      const maskedValue = field === 'cpf' ? formatCpf(input.value) : field === 'phone' ? formatPhone(input.value) : formatCep(input.value)
      input.value = maskedValue
      const modal = input.closest('.student-modal')
      if (modal?.classList.contains('employee-modal')) {
        setEditingEmployee((current) => current ? { ...current, profile: { ...current.profile, [field]: maskedValue } } : current)
      } else if (modal?.querySelector('.placeholder-kicker')?.textContent === 'DADOS CADASTRAIS') {
        setEditingStudent((current) => current ? { ...current, profile: { ...current.profile, [field]: maskedValue } } : current)
      } else {
        setForm((current) => current ? { ...current, [field]: maskedValue } : current)
      }
    }
    const searchCep = async (event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || !(input.closest('label')?.textContent || '').startsWith('CEP')) return
      const cep = onlyDigits(input.value)
      if (cep.length !== 8) return
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        const address = await response.json()
        if (address.erro) return setNotice('CEP não encontrado.')
        const fields = { address_zip_code: formatCep(cep), address_street: address.logradouro || '', address_complement: address.complemento || '', address_district: address.bairro || '', address_city: address.localidade || '', address_state: address.uf || '' }
        if (input.closest('.employee-modal')) setEditingEmployee((current) => current ? { ...current, profile: { ...current.profile, ...fields } } : current)
        else setForm((current) => current ? { ...current, ...fields } : current)
      } catch (_) { setNotice('Não foi possível consultar o CEP agora.') }
    }
    document.addEventListener('input', applyMask, true)
    document.addEventListener('blur', searchCep, true)
    return () => { document.removeEventListener('input', applyMask, true); document.removeEventListener('blur', searchCep, true) }
  }, [])

  const createAccount = async (event) => {
    event.preventDefault()
    setNotice('')
    const { data, error } = await supabase.functions.invoke('dynamic-function', { body: form })
    if (error || data?.error) {
      let message = data?.error || error?.message || 'Não foi possível concluir o cadastro.'
      if (error?.context) {
        try {
          const details = await error.context.json()
          message = details?.error || details?.message || message
        } catch (_) {}
      }
      setNotice(message)
      setModalError(message)
      return
    }
    if (data?.id) {
      const expectedProfile = { ...editableProfileFields(form, onlyDigits(form.cpf) || null), email: String(form.email || '').trim().toLowerCase() }
      const { data: savedProfile, error: verificationError } = await supabase.from('profiles').select('id, full_name, email, phone, cpf, birth_date, address_zip_code, address_street, address_number, address_complement, address_district, address_city, address_state').eq('id', data.id).single()
      const mismatch = changedFieldNotConfirmed(savedProfile, expectedProfile)
      if (verificationError || mismatch) {
        const message = verificationError?.message || `O cadastro foi criado, mas o banco não confirmou o campo ${mismatch[0]}.`
        setNotice(message)
        setModalError(message)
        return
      }
    }
    setForm(null)
    setNotice('Cadastro criado com sucesso.')
    await loadStudents(); await loadEmployees()
  }

  const manageAccount = async (body) => {
    const { data, error } = await supabase.functions.invoke('dynamic-function', { body })
    if (error || data?.error) {
      let message = data?.error || error?.message || 'Não foi possível concluir a ação.'
      if (error?.context) {
        try {
          const details = await error.context.json()
          message = details?.error || details?.message || message
        } catch (_) {}
      }
      setNotice(message)
      setModalError(message)
      return false
    }
    setModalError('')
    return true
  }

  const validateCpf = (cpf, currentProfileId) => {
    const digits = onlyDigits(cpf)
    if (!digits) return { valid: true, value: null }
    if (digits.length !== 11) return { valid: false, message: 'O CPF precisa ter 11 dígitos.' }
    const duplicate = [...students, ...employees].find((item) => item.profile_id !== currentProfileId && onlyDigits(item.profile?.cpf) === digits)
    if (duplicate) return { valid: false, message: 'Este CPF já está vinculado a outro cadastro.' }
    return { valid: true, value: digits }
  }

  const editableProfileFields = (profile, cpf) => ({
    full_name: String(profile.full_name || '').trim(),
    phone: String(profile.phone || '').trim() || null,
    cpf,
    birth_date: profile.birth_date || null,
    address_zip_code: String(profile.address_zip_code || '').trim() || null,
    address_street: String(profile.address_street || '').trim() || null,
    address_number: String(profile.address_number || '').trim() || null,
    address_complement: String(profile.address_complement || '').trim() || null,
    address_district: String(profile.address_district || '').trim() || null,
    address_city: String(profile.address_city || '').trim() || null,
    address_state: String(profile.address_state || '').trim().toUpperCase() || null,
  })

  const changedFieldNotConfirmed = (saved, expected) => Object.entries(expected).find(([field, value]) => (saved?.[field] ?? null) !== (value ?? null))

  const updateProfile = async (profileId, profile, cpf) => {
    const expected = editableProfileFields(profile, cpf)
    const { data: savedRows, error } = await supabase.from('profiles').update(expected).eq('id', profileId).select('id, full_name, phone, cpf, birth_date, address_zip_code, address_street, address_number, address_complement, address_district, address_city, address_state')
    if (error) return { error: error.message }
    if (!savedRows?.length) return { error: 'O cadastro não foi encontrado ou você não tem permissão para alterá-lo.' }
    if (savedRows.length > 1) return { error: 'Foram encontrados registros duplicados para este cadastro. A atualização foi interrompida por segurança.' }
    const saved = savedRows[0]
    const mismatch = changedFieldNotConfirmed(saved, expected)
    if (mismatch) return { error: `O banco não confirmou a alteração do campo ${mismatch[0]}. Tente novamente.` }
    return { saved }
  }

  const updateStudentPlan = async (studentId, requestedPlan) => {
    const plan = normalizePlan(requestedPlan)
    const canonicalResult = await supabase.from('students').update({ payment_plan: plan }).eq('id', studentId).select('payment_plan').maybeSingle()
    if (!canonicalResult.error && canonicalResult.data?.payment_plan === plan) return { plan }
    const missingColumn = canonicalResult.error && /payment_plan|schema cache|column/i.test(canonicalResult.error.message || '')
    if (canonicalResult.error && !missingColumn) return { error: canonicalResult.error.message }

    const paymentType = plan === 'MENSALISTA' ? 'MENSALIDADE' : plan
    const today = new Date().toISOString().slice(0, 10)
    const futureResult = await supabase.from('payments').update({ payment_type: paymentType }).eq('student_id', studentId).gte('due_date', today).neq('status', 'CANCELADO').select('id, payment_type')
    if (futureResult.error) return { error: futureResult.error.message }
    if (futureResult.data?.length && futureResult.data.every((payment) => payment.payment_type === paymentType)) return { plan }

    const latestPayment = payments.find((payment) => payment.student_id === studentId && payment.status !== 'CANCELADO') || payments.find((payment) => payment.student_id === studentId)
    if (!latestPayment) return { error: 'Cadastre a primeira cobrança do aluno antes de alterar o plano.' }
    const { data: savedPayment, error } = await supabase.from('payments').update({ payment_type: paymentType }).eq('id', latestPayment.id).select('payment_type').single()
    if (error) return { error: error.message }
    if (savedPayment?.payment_type !== paymentType) return { error: 'O banco não confirmou a alteração do plano.' }
    return { plan }
  }

  const saveStudent = async (event) => {
    event.preventDefault()
    setNotice('')
    setModalError('')
    if (!String(editingStudent.profile?.full_name || '').trim()) return setModalError('Informe o nome completo do aluno.')
    const cpf = validateCpf(editingStudent.profile?.cpf, editingStudent.profile_id)
    if (!cpf.valid) return setModalError(cpf.message)
    const profileResult = await updateProfile(editingStudent.profile_id, editingStudent.profile, cpf.value)
    if (profileResult.error) { setModalError(profileResult.error); return setNotice(profileResult.error) }
    const requestedPlanForBilling = normalizePlan(editingStudent.plan_code)
    const dueDay = requestedPlanForBilling === 'MENSALISTA' ? Number(editingStudent.billing_due_day) : null
    const monthlyFee = requestedPlanForBilling === 'MENSALISTA' ? Number(String(editingStudent.monthly_fee || '').replace(',', '.')) : null
    if (requestedPlanForBilling === 'MENSALISTA' && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) return setModalError('Informe o dia de vencimento da mensalidade, de 1 a 31.')
    if (requestedPlanForBilling === 'MENSALISTA' && (!Number.isFinite(monthlyFee) || monthlyFee <= 0)) return setModalError('Informe o valor da mensalidade.')
    const { data: savedStudent, error } = await supabase.from('students').update({ status: editingStudent.status, billing_due_day: dueDay, monthly_fee: monthlyFee }).eq('id', editingStudent.id).select('status, billing_due_day, monthly_fee').single()
    if (error || savedStudent?.status !== editingStudent.status) { const message = error?.message || 'O banco não confirmou a alteração do status.'; setModalError(message); return setNotice(message) }
    const originalPlan = normalizePlan(editingStudent.original_plan_code ?? editingStudent.plan_code)
    const requestedPlan = normalizePlan(editingStudent.plan_code)
    if (requestedPlan !== originalPlan) {
      const planResult = await updateStudentPlan(editingStudent.id, requestedPlan)
      if (planResult.error) { setModalError(planResult.error); return setNotice(planResult.error) }
    }
    if (requestedPlan === 'MENSALISTA') {
      const { error: chargeError } = await supabase.rpc('generate_monthly_charge_for_student', { p_student_id: editingStudent.id })
      if (chargeError) { setModalError(chargeError.message); return setNotice(chargeError.message) }
    }
    setEditingStudent(null)
    setNotice('Dados, contato e plano do aluno atualizados com sucesso.')
    await Promise.all([loadStudents(), loadPayments(), loadHealth()])
  }

  const saveEmployee = async (event) => {
    event.preventDefault()
    setNotice('')
    setModalError('')
    if (!String(editingEmployee.profile?.full_name || '').trim()) return setModalError('Informe o nome completo do funcionário.')
    const cpf = validateCpf(editingEmployee.profile?.cpf, editingEmployee.profile_id)
    if (!cpf.valid) return setModalError(cpf.message)
    const profileResult = await updateProfile(editingEmployee.profile_id, editingEmployee.profile, cpf.value)
    if (profileResult.error) { setModalError(profileResult.error); return setNotice(profileResult.error) }
    const scheduleRows = (editingEmployee.work_schedule || []).flatMap((day) => day.active ? (day.periods || []).slice(0,1).map((period) => ({ employee_id: editingEmployee.id, weekday: day.weekday, start_time: period.start_time, end_time: period.end_time, active: true })) : []).filter((row) => row.start_time && row.end_time && row.start_time < row.end_time)
    if (editingEmployee.profile?.role === 'PROFESSOR' && !scheduleRows.length) return setModalError('Informe pelo menos um dia e horário de expediente para o professor.')
    const { error: deleteScheduleError } = await supabase.from('employee_work_hours').delete().eq('employee_id', editingEmployee.id)
    if (deleteScheduleError) { setModalError(deleteScheduleError.message); return setNotice(deleteScheduleError.message) }
    if (scheduleRows.length) {
      const { error: scheduleError } = await supabase.from('employee_work_hours').insert(scheduleRows)
      if (scheduleError) { setModalError(scheduleError.message); return setNotice(scheduleError.message) }
    }
    const expectedEmployee = { position: editingEmployee.position, hire_date: editingEmployee.hire_date || null, employment_type: editingEmployee.employment_type || null, notes: editingEmployee.notes || null, status: editingEmployee.status || 'ATIVO' }
    const { data: savedEmployee, error: employeeError } = await supabase.from('employees').update(expectedEmployee).eq('id', editingEmployee.id).select('position, hire_date, employment_type, notes, status').single()
    const employeeMismatch = changedFieldNotConfirmed(savedEmployee, expectedEmployee)
    if (employeeError || employeeMismatch) { const message = employeeError?.message || `O banco não confirmou a alteração do campo ${employeeMismatch[0]}.`; setModalError(message); return setNotice(message) }
    setEditingEmployee(null)
    setNotice('Dados e contato do funcionário atualizados com sucesso.')
    await loadEmployees()
  }

  const resetEmployeePassword = async () => {
    if (newPassword.length < 8) return setModalError('A nova senha deve ter ao menos 8 caracteres.')
    const ok = await manageAccount({ action: 'reset_password', user_id: editingEmployee.profile_id, password: newPassword })
    if (ok) { setNewPassword(''); setNotice('Senha redefinida com sucesso.') }
  }

  const deleteEmployee = async () => {
    if (!window.confirm(`Excluir definitivamente ${editingEmployee.profile.full_name}?`)) return
    const ok = await manageAccount({ action: 'delete', user_id: editingEmployee.profile_id })
    if (ok) { setEditingEmployee(null); setNotice('Conta excluída com sucesso.'); await loadEmployees() }
  }

  const openForm = (role) => { setModalError(''); setForm({ ...emptyForm, work_schedule: role === 'ALUNO' ? [] : freshWorkSchedule(), role, position: role === 'PROFESSOR' ? 'Professor(a)' : role === 'RECEPCAO' ? 'Recepcionista' : '' }) }
  const createDemoData = async () => {
    const approved = window.confirm('Criar ou completar os dados fictícios da demonstração? Nenhum registro real será apagado ou sobrescrito.')
    if (!approved) return
    setSeedingDemo(true)
    setNotice('Preparando os dados da demonstração…')
    try {
      const result = await seedDemoData(supabase)
      const inserted = Object.values(result.inserted).reduce((total, amount) => total + amount, 0)
      const warning = result.warnings.length ? ` ${result.warnings.length} grupo(s) opcional(is) não puderam ser incluídos.` : ''
      setNotice(`Demonstração pronta: ${result.totalStudents} aluno(s) atualizados, ${result.createdAccounts} conta(s) nova(s) e ${inserted} registro(s) operacional(is) incluído(s).${warning}`)
      await Promise.all([loadStudents(), loadEmployees(), loadHealth(), loadAgenda(), loadPayments(), loadReceptionPanel()])
    } catch (error) {
      setNotice(`Não foi possível concluir a demonstração: ${error.message}`)
    } finally {
      setSeedingDemo(false)
    }
  }
  useEffect(() => {
    if (!isAdmin) return undefined
    const storageKey = `power-fit-${DEMO_BATCH_ID}`
    try {
      if (localStorage.getItem(storageKey) === 'completed') return undefined
    } catch { /* The manual action remains available when storage is unavailable. */ }
    let active = true
    const populateDemo = async () => {
      setSeedingDemo(true)
      setNotice('Preparando automaticamente os dados da demonstração…')
      try {
        const result = await seedDemoData(supabase)
        if (!active) return
        const inserted = Object.values(result.inserted).reduce((total, amount) => total + amount, 0)
        const warning = result.warnings.length ? ` ${result.warnings.length} grupo(s) não puderam ser incluídos.` : ''
        setNotice(`Demonstração pronta: ${result.totalStudents} aluno(s), ${inserted} registro(s) operacional(is) incluído(s).${warning}`)
        try { localStorage.setItem(storageKey, 'completed') } catch { /* The seed is idempotent. */ }
        await Promise.all([loadStudents(), loadEmployees(), loadHealth(), loadAgenda(), loadPayments(), loadReceptionPanel()])
      } catch (error) {
        if (active) setNotice(`Não foi possível concluir a demonstração: ${error.message}`)
      } finally {
        if (active) setSeedingDemo(false)
      }
    }
    populateDemo()
    return () => { active = false }
  }, [isAdmin])
  const navItems = isAdmin ? ['Início', 'Alunos', 'Funcionários', 'Agenda', 'Pagamentos', 'Relatórios', 'Auditoria'] : ['Início', 'Agendamentos', 'Alunos', 'Financeiro', 'Relatórios']
  const navigationPage = (item) => item === 'Agendamentos' ? 'Agenda' : item === 'Financeiro' ? 'Pagamentos' : item
  const mobilePrimaryItems = navItems.slice(0, 4)
  const mobileMoreItems = navItems.slice(4)
  const navIcon = (item) => item === 'Alunos' ? 'users' : item === 'Professores' || item === 'Funcionários' ? 'team' : item === 'Auditoria' ? 'audit' : item === 'Relatórios' ? 'report' : item === 'Pagamentos' || item === 'Financeiro' ? 'wallet' : item === 'Agenda' || item === 'Agendamentos' || item === 'Lista de espera' ? 'calendar' : 'home'
  const navLabel = (item) => item === 'Funcionários' ? 'Equipe' : item === 'Agendamentos' ? 'Agenda' : item
  const navigateMobile = (item) => { setPage(navigationPage(item)); setMobileMenuOpen(false) }
  const title = page === 'Início' ? 'Visão geral' : page
  const rows = page === 'Alunos' ? students : employees
  const studentPlan = (student) => formatPlan(student?.payment_plan || payments.find((payment) => payment.student_id === student?.id)?.payment_type)
  const studentPlanCode = (student) => normalizePlan(student?.payment_plan || payments.find((payment) => payment.student_id === student?.id)?.payment_type)
  const directoryQuery = normalizeDirectorySearch(directorySearch[page] || '')
  const filteredRows = directoryQuery ? rows.filter((item) => [item.profile?.full_name, item.profile?.cpf, item.profile?.email, page === 'Alunos' ? studentPlan(item) : item.position].some((value) => normalizeDirectorySearch(value).includes(directoryQuery))) : rows
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
  const openQuickBooking = async () => {
    setQuickStudentSearch('')
    setQuickAction({ type: 'booking', student_id: '', date: '', time: '' })
    setQuickLoading(true)
    const { data, error } = await supabase.rpc('get_student_booking_slots')
    if (data?.length) setQuickAction((current) => current?.type === 'booking' ? { ...current, date: data[0].appointment_date } : current)
    setQuickSlots(error ? [] : data ?? [])
    setQuickLoading(false)
  }
  const openQuickPayment = () => { setQuickStudentSearch(''); setQuickAction({ type: 'payment', scope: 'ALUNO', student_id: '', category: 'MENSALIDADE', amount: '', description: '', due_date: todayIso(), linked_payment_id: '' }) }
  const selectQuickPaymentStudent = (studentId) => {
    const nearest = payments.filter((p) => p.student_id === studentId && p.payment_type === 'MENSALIDADE' && p.status !== 'CANCELADO').sort((a,b) => Math.abs(new Date(a.due_date)-new Date()) - Math.abs(new Date(b.due_date)-new Date()))[0]
    setQuickAction((q) => ({ ...q, student_id: studentId, linked_payment_id: nearest?.id || '', amount: q.category === 'MENSALIDADE' ? (nearest?.amount || '') : q.category === 'DAY_USE' ? '20.00' : q.amount, due_date: q.category === 'MENSALIDADE' && nearest?.due_date ? nearest.due_date : q.due_date }))
  }
  const saveQuickBooking = async (event) => {
    event.preventDefault(); if (!quickAction.student_id || !quickAction.date || !quickAction.time) return setNotice('Selecione aluno, data e horário.')
    setQuickLoading(true)
    const { error } = await supabase.rpc('create_appointment', { p_student_id: quickAction.student_id, p_date: quickAction.date, p_start_time: quickAction.time, p_source: 'RECEPCAO' })
    setQuickLoading(false); if (error) return setNotice(error.message)
    setQuickAction(null); setNotice('Aluno agendado com sucesso.'); await Promise.all([loadAgenda(),loadReceptionPanel()])
  }
  const saveQuickPayment = async (event) => {
    event.preventDefault(); const q=quickAction; const amount=Number(String(q.amount||'').replace(',','.'))
    if (!Number.isFinite(amount)||amount<=0) return setNotice('Informe um valor válido.')
    if (q.scope==='ALUNO'&&!q.student_id) return setNotice('Selecione o aluno.')
    if ((q.scope==='OUTROS'||q.category==='OUTROS')&&!String(q.description||'').trim()) return setNotice('Descreva o pagamento.')
    if (q.scope==='ALUNO'&&q.category==='MENSALIDADE'&&q.linked_payment_id) {
      const { error }=await supabase.from('payments').update({ amount, status:'IDENTIFICADO', payment_date:todayIso(), notes:'Pagamento cadastrado pela recepção' }).eq('id',q.linked_payment_id)
      if(error) return setNotice(error.message)
    } else {
      const paymentType=q.scope==='ALUNO'&&q.category==='DAY_USE'?'DAY_USE':'OUTROS'
      const { error }=await supabase.from('payments').insert({ student_id:q.scope==='ALUNO'?q.student_id:null, payment_type:paymentType, amount, due_date:q.due_date||todayIso(), payment_date:todayIso(), status:'IDENTIFICADO', notes:q.description||'Pagamento cadastrado pela recepção' })
      if(error) return setNotice(error.message)
    }
    setQuickAction(null); setNotice('Pagamento cadastrado com sucesso.'); await Promise.all([loadPayments(),loadHealth(),loadReceptionPanel()])
  }

  const changeAppointmentTeacher = async (appointmentId, teacherId) => {
    const expectedTeacherId = teacherId || null
    const { data: savedRows, error } = await supabase.from('appointments').update({ teacher_id: expectedTeacherId }).eq('id', appointmentId).select('id, teacher_id')
    if (error) { setNotice(`Não foi possível alterar o professor: ${error.message}`); return false }
    if (!savedRows?.length || savedRows[0].teacher_id !== expectedTeacherId) { setNotice('O banco não confirmou a alteração do professor.'); return false }
    setReceptionPanel(current => ({...current, appointments: current.appointments.map(item => item.id === appointmentId ? {...item, teacher_id: expectedTeacherId} : item)}))
    setNotice('Professor atualizado com sucesso.')
    await Promise.all([loadReceptionPanel(), loadAgenda()])
    return true
  }

  const registerAgendaAttendance = async (item, status = 'REALIZADO') => {
    setNotice('')
    const attendanceStatus = status === 'AUSENTE' ? 'AUSENTE' : 'PRESENTE'
    const { data: existing, error: lookupError } = await supabase.from('attendance').select('id').eq('appointment_id', item.id).maybeSingle()
    if (lookupError) { setNotice(`Não foi possível verificar a presença: ${lookupError.message}`); return false }
    const payload = { appointment_id: item.id, student_id: item.student_id, status: attendanceStatus, registered_by: profile.id, registered_at: new Date().toISOString() }
    const attendanceResult = existing?.id
      ? await supabase.from('attendance').update(payload).eq('id', existing.id)
      : await supabase.from('attendance').insert(payload)
    if (attendanceResult.error) { setNotice(`Não foi possível registrar a presença: ${attendanceResult.error.message}`); return false }
    const { error: appointmentError } = await supabase.from('appointments').update({ status }).eq('id', item.id)
    if (appointmentError) { setNotice(`A presença foi registrada, mas o agendamento não foi atualizado: ${appointmentError.message}`); return false }
    setNotice(status === 'REALIZADO' ? 'Presença registrada com sucesso.' : 'Falta registrada com sucesso.')
    await Promise.all([loadAgenda(), loadReceptionPanel(), loadHealth()])
    return true
  }

  const undoAgendaAttendance = async (item) => {
    setNotice('')
    const { error: attendanceError } = await supabase.from('attendance').delete().eq('appointment_id', item.id)
    if (attendanceError) { setNotice(`Não foi possível desfazer a presença: ${attendanceError.message}`); return false }
    const { error: appointmentError } = await supabase.from('appointments').update({ status: 'CONFIRMADO' }).eq('id', item.id)
    if (appointmentError) { setNotice(`O registro de presença foi removido, mas o agendamento não voltou para aguardando presença: ${appointmentError.message}`); return false }
    setNotice('Presença desfeita. O aluno voltou para aguardando presença.')
    await Promise.all([loadAgenda(), loadReceptionPanel(), loadHealth()])
    return true
  }

  const openAgendaPayment = (item) => {
    const student = students.find((entry) => entry.id === item.student_id)
    openQuickPayment()
    if (student) {
      setQuickStudentSearch(student.profile?.full_name || '')
      setTimeout(() => selectQuickPaymentStudent(student.id), 0)
    }
  }


  const openStudentEditor = (student) => {
    const planCode = studentPlanCode(student)
    setStudentTab('dados')
    setEditingStudent({ ...student, plan_code: planCode, original_plan_code: planCode, billing_due_day: student.billing_due_day || '', monthly_fee: student.monthly_fee || '', profile: maskedProfile(student.profile) })
  }
  const openStudentFinance = (student) => {
    setPaymentStudentFilter({ id: student.id, name: student.profile?.full_name || 'Aluno' })
    setEditingStudent(null)
    setPage('Pagamentos')
  }
  const openEmployeeEditor = async (employee) => {
    setModalError('')
    const { data: schedules, error } = await supabase.from('employee_work_hours').select('weekday, start_time, end_time, active').eq('employee_id', employee.id).order('weekday')
    if (error) setNotice(`Não foi possível carregar o expediente: ${error.message}`)
    const byWeekday = new Map((schedules ?? []).map((item) => [Number(item.weekday), item]))
    const work_schedule = freshWorkSchedule().map((day) => {
      const saved = byWeekday.get(day.weekday)
      return saved ? { ...day, active: saved.active !== false, periods: [{ start_time: String(saved.start_time || '').slice(0,5), end_time: String(saved.end_time || '').slice(0,5) }] } : { ...day, active: false }
    })
    setEditingEmployee({ ...employee, documents: [], work_schedule, profile: maskedProfile(employee.profile) })
  }

  return <div className={`app-shell dashboard-shell ${darkMode ? 'theme-dark' : 'theme-light'} ${isAdmin ? 'is-admin' : 'is-reception'}`}>
    <aside className="app-sidebar"><div className="sidebar-brand sidebar-brand-logo"><img src={studioLogo} alt="Studio Power Fit" /></div><div className="sidebar-section-title">{isAdmin ? 'GESTÃO' : 'ATENDIMENTO'}</div><nav className="sidebar-menu">{navItems.map((item) => <button key={item} className={`sidebar-item ${page === navigationPage(item) ? 'active' : ''}`} onClick={() => setPage(navigationPage(item))} type="button"><span className="sidebar-icon"><ManagementIcon name={navIcon(item)} size={18} /></span><span>{item}</span></button>)}</nav><div className="sidebar-bottom"><button className="sidebar-item" onClick={onLogout} type="button"><span className="sidebar-icon"><ManagementIcon name="logout" size={18} /></span><span>Sair da conta</span></button></div></aside>
    <div className="app-main"><header className="app-header"><div><span className="header-kicker">STUDIO POWER FIT · DEMONSTRAÇÃO</span><h1>{title}</h1></div><div className="header-actions"><button className="header-theme-button" aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'} title={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={() => setDarkMode(!darkMode)} type="button"><ManagementIcon name={darkMode ? 'sun' : 'moon'} size={19} /></button><div className="header-user"><div className="user-avatar">{(profile.full_name || 'A')[0]}</div><div className="user-info"><strong>{profile.full_name}</strong><span>{isAdmin ? 'Gestão' : 'Recepção'}</span></div></div></div></header><main className="app-content">
      {profile.role === 'RECEPCAO' && page === 'Início' && <ReceptionNotifications profile={profile} onNavigate={(target, focus) => { setWaitlistFocus(focus); setPage(target) }} />}
      {isAdmin && page === 'Início' && <div className="demo-seed-toolbar"><div><strong>Apresentação com dados realistas</strong><span>Crie contas e históricos fictícios identificados como DEMO, sem alterar os registros reais.</span></div><button className="dashboard-primary-action" disabled={seedingDemo} onClick={createDemoData} type="button"><ManagementIcon name="database" size={17} />{seedingDemo ? 'Criando demonstração…' : 'Criar dados da demo'}</button></div>}
      {isAdmin && page === 'Início' && notice && <div className="dashboard-notice demo-seed-notice">{notice}</div>}
      {!isAdmin && page === 'Início' && <ReceptionDashboard profile={profile} panel={receptionPanel} loading={receptionLoading} error={receptionError} updatedAt={receptionUpdatedAt} onRefresh={loadReceptionPanel} onNavigate={setPage} onNewStudent={() => openForm('ALUNO')} onScheduleStudent={openQuickBooking} onRegisterPayment={openQuickPayment} teachers={employees.filter((employee) => employee.status === 'ATIVO' && employee.teacher_id && employee.teacher_status === 'ATIVO' && (employee.profile?.role === 'PROFESSOR' || String(employee.position || '').toLowerCase().includes('professor'))).map((employee) => ({ ...employee, id: employee.teacher_id }))} onChangeTeacher={changeAppointmentTeacher} />}
      {profile.role === 'RECEPCAO' && page === 'Lista de espera' && <ReceptionWaitlist focus={waitlistFocus} />}
      {page === 'Agenda' && (()=>{const today=todayIso();const selectedDate=agendaDate||today;const dayItems=appointments.filter(a=>a.appointment_date===selectedDate&&String(a.status||'').trim().toUpperCase()!=='CANCELADO'&&(!agendaTeacher||a.teacher_id===agendaTeacher)&&(!agendaStatus||a.status===agendaStatus));const dayWaitlist=agendaWaitlist.filter(w=>w.appointment_date===selectedDate&&w.status==='AGUARDANDO');const teacherName=(id)=>employees.find(e=>e.teacher_id===id)?.profile?.full_name||'Professor a definir';const statusLabel=(s)=>s==='CONFIRMADO'?'Aguardando presença':s==='REALIZADO'?'Presença confirmada':s==='AUSENTE'?'Falta registrada':s==='CANCELADO'?'Cancelado':s;return <section className="students-page live-data-page agenda-redesign"><div className="agenda-title-row"><div><h2>Agendamentos</h2><p>Gerencie os agendamentos e acompanhe os atendimentos do dia.</p></div><button className="dashboard-primary-action" type="button" onClick={openQuickBooking}>+&nbsp; Agendar aluno</button></div><div className="agenda-filterbar"><div className="agenda-period"><button className={selectedDate===today?'active':''} type="button" onClick={()=>setAgendaDate(today)}>Hoje</button><button className={selectedDate!==today?'active':''} type="button" onClick={()=>{const d=new Date(selectedDate+'T12:00:00');d.setDate(d.getDate()+1);setAgendaDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)}}>Próximo dia</button></div><label>Data<input type="date" value={selectedDate} onChange={e=>setAgendaDate(e.target.value)}/></label><label>Professor<select value={agendaTeacher} onChange={e=>setAgendaTeacher(e.target.value)}><option value="">Todos os professores</option>{employees.filter(e=>e.teacher_id&&e.teacher_status==='ATIVO').map(e=><option key={e.teacher_id} value={e.teacher_id}>{e.profile?.full_name}</option>)}</select></label><label>Status<select value={agendaStatus} onChange={e=>setAgendaStatus(e.target.value)}><option value="">Todos os status</option><option value="CONFIRMADO">Aguardando presença</option><option value="REALIZADO">Presença confirmada</option><option value="AUSENTE">Falta registrada</option><option value="CANCELADO">Cancelado</option></select></label></div><div className="agenda-summary"><article><span>◉</span><strong>{dayItems.length}</strong><small>Agendamentos hoje</small></article><article className="green"><span>✓</span><strong>{dayItems.filter(a=>a.status==='REALIZADO').length}</strong><small>Presenças confirmadas</small></article><article className="amber"><span>◷</span><strong>{dayItems.filter(a=>a.status==='CONFIRMADO').length}</strong><small>Aguardando presença</small></article><article className="red"><span>×</span><strong>{dayItems.filter(a=>a.status==='AUSENTE').length}</strong><small>Faltas registradas</small></article><article><span>♙</span><strong>{receptionPanel.waitlist}</strong><small>Lista de espera</small></article></div><div className="agenda-content-grid"><div className="agenda-main-card"><div className="agenda-card-head"><div><span className="placeholder-kicker">AGENDA DO DIA</span><h3>{new Date(selectedDate+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</h3></div><button className="outline-action" onClick={loadAgenda} type="button"><ManagementIcon name="refresh" size={16}/> Atualizar</button></div><div className="agenda-list">{dayItems.length?dayItems.map(item=><article className={`agenda-row status-${String(item.status).toLowerCase()}`} key={item.id}><time>{String(item.start_time).slice(0,5)}</time><div className="agenda-person"><span>{(item.student?.full_name||'A')[0]}</span><div><strong>{item.student?.full_name||'Aluno'}</strong><small>Agendamento confirmado</small></div></div><div className="agenda-teacher"><small>PROFESSOR</small><strong>{teacherName(item.teacher_id)}</strong></div><span className={`agenda-status ${String(item.status).toLowerCase()}`}>{statusLabel(item.status)}</span><div className="agenda-actions">{item.status==='CONFIRMADO'&&<><button className="agenda-presence" type="button" onClick={()=>registerAgendaAttendance(item,'REALIZADO')}>Efetuar presença</button><button className="agenda-absence" type="button" onClick={()=>registerAgendaAttendance(item,'FALTOU')}>Registrar falta</button></>}{item.status==='REALIZADO'&&<button className="agenda-undo-attendance" type="button" onClick={()=>undoAgendaAttendance(item)}>Desfazer presença</button>}<button className="agenda-more" type="button" title="Pagamentos do aluno" aria-label="Abrir pagamento do aluno" onClick={()=>openAgendaPayment(item)}>•••</button></div></article>):<div className="agenda-empty">Nenhum agendamento para a data selecionada.</div>}</div>{dayWaitlist.length>0&&<section className="agenda-waitlist-card"><div className="agenda-waitlist-head"><div><span className="placeholder-kicker">LISTA DE ESPERA</span><h3>{dayWaitlist.length} aluno{dayWaitlist.length===1?'':'s'} aguardando vaga</h3></div><button className="outline-action" type="button" onClick={()=>setPage('Lista de espera')}>Ver lista completa</button></div><div className="agenda-waitlist-list">{dayWaitlist.map(item=><div className="agenda-waitlist-row" key={item.id}><time>{String(item.start_time).slice(0,5)}</time><span className="agenda-waitlist-avatar">{(item.student?.full_name||'A')[0]}</span><div><strong>{item.student?.full_name||'Aluno'}</strong><small>Preferência de horário · posição {item.position||1}</small></div><span className="agenda-waitlist-badge">Na espera</span></div>)}</div></section>}</div><aside className="agenda-sidebar"><section className="agenda-calendar"><div className="agenda-calendar-head"><strong>{new Date(selectedDate+'T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,x=>x.toUpperCase())}</strong></div><div className="agenda-weekdays">{['D','S','T','Q','Q','S','S'].map(d=><span key={d}>{d}</span>)}</div><div className="agenda-calendar-days">{Array.from({length:new Date(Number(selectedDate.slice(0,4)),Number(selectedDate.slice(5,7)),0).getDate()},(_,i)=>i+1).map(day=><button key={day} type='button' className={day===Number(selectedDate.slice(8,10))?'active':''} onClick={()=>setAgendaDate(`${selectedDate.slice(0,8)}${String(day).padStart(2,'0')}`)}>{day}</button>)}</div></section><section className="agenda-side-card"><div className="agenda-side-title"><strong>Professores</strong><span>{employees.filter(e=>e.teacher_id&&e.teacher_status==='ATIVO').length} ativos</span></div>{employees.filter(e=>e.teacher_id&&e.teacher_status==='ATIVO').map(e=><div className='agenda-side-person' key={e.teacher_id}><span>{(e.profile?.full_name||'P')[0]}</span><div><strong>{e.profile?.full_name}</strong><small>{dayItems.filter(a=>a.teacher_id===e.teacher_id).length} agendamento(s)</small></div></div>)}</section><section className="agenda-side-card"><div className="agenda-side-title"><strong>Status</strong></div><div className="agenda-side-status"><span><i className='green'></i>Presença confirmada</span><span><i className='amber'></i>Aguardando presença</span><span><i className='red'></i>Falta registrada</span><span><i></i>Cancelado</span></div></section></aside></div></section>})()}
      {page === 'Pagamentos' && <section className="students-page live-data-page finance-page"><div className="panel-heading"><div><span className="placeholder-kicker">CONTROLE FINANCEIRO</span><h2>Pagamentos</h2></div><button className="outline-action" onClick={() => { loadPayments(); loadHealth() }} type="button">Atualizar</button></div>{paymentStudentFilter && <div className="payment-student-filter"><span>Aluno: <strong>{paymentStudentFilter.name}</strong></span><button type="button" onClick={() => setPaymentStudentFilter(null)}>Limpar filtro</button></div>}<div className="finance-summary"><article><small>RECEBIDO NO MÊS</small><strong>{formatCurrency(health.revenue)}</strong><span>{formatPercent(health.collectionRate)} do previsto</span></article><article className="finance-due"><small>A VENCER EM 7 DIAS</small><strong>{formatCurrency(health.dueSoonAmount)}</strong><span>{health.dueSoon} cobrança(s)</span></article><article className="finance-overdue"><small>TOTAL VENCIDO</small><strong>{formatCurrency(health.overdueAmount)}</strong><span>{health.overdue} cobrança(s)</span></article></div><div className="students-table-wrap"><table className="students-table"><thead><tr><th>Aluno</th><th>Origem</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>{(paymentStudentFilter ? payments.filter((item) => item.student_id === paymentStudentFilter.id) : payments).length ? (paymentStudentFilter ? payments.filter((item) => item.student_id === paymentStudentFilter.id) : payments).map((item) => { const paymentState = getPaymentPresentation(item); return <tr key={item.id}><td>{item.student?.full_name || 'Aluno'}</td><td>{item.payment_type === 'MENSALIDADE' ? 'Mensalista' : item.payment_type}</td><td>{new Date(`${item.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td>{formatCurrency(item.amount)}</td><td><span className={`status-pill ${paymentState.tone}`}>{paymentState.label}</span></td></tr> }) : <tr><td colSpan="5">Nenhum pagamento registrado.</td></tr>}</tbody></table></div></section>}
      {isAdmin && page === 'Início' && <ManagementDashboard health={health} appointments={appointments} receptionPanel={receptionPanel} onNavigate={setPage} onRefresh={() => Promise.all([loadHealth(), loadAgenda(), loadPayments(), loadReceptionPanel()])} />}
      {isAdmin && page === 'Relatórios' && <ReportsPage students={students} employees={employees} payments={payments} />}
      {page === 'Auditoria' && <section className="students-page audit-page"><div className="panel-heading"><div><span className="placeholder-kicker">CONTROLE DO GESTOR</span><h2>Auditoria</h2></div><button className="outline-action" onClick={loadAudit} type="button">Atualizar</button></div><p className="audit-description">Ações realizadas por recepção e professores.</p><div className="students-table-wrap"><table className="students-table"><thead><tr><th>Responsável</th><th>Perfil</th><th>Ação</th><th>Módulo</th><th>Quando</th></tr></thead><tbody>{auditLogs.length === 0 ? <tr><td colSpan="5">Ainda não há ações registradas desses perfis.</td></tr> : auditLogs.map((item) => <tr key={item.id}><td>{item.person?.full_name || 'Usuário removido'}</td><td>{item.person?.role === 'RECEPCAO' ? 'Recepção' : 'Professor'}</td><td>{item.action}</td><td>{item.module}</td><td>{new Date(item.created_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div></section>}
      {['Alunos','Funcionários'].includes(page) ? <section className="students-page"><div className="panel-heading"><div><span className="placeholder-kicker">{page === 'Alunos' ? 'CADASTRO E ACOMPANHAMENTO' : 'EQUIPE E ACESSOS'}</span><h2>{page}</h2></div><button className="dashboard-primary-action" onClick={() => openForm(page === 'Alunos' ? 'ALUNO' : 'RECEPCAO')} type="button">+ Novo {page === 'Alunos' ? 'aluno' : 'funcionário'}</button></div>{notice && <div className="dashboard-notice">{notice}</div>}<div className="directory-toolbar"><label><ManagementIcon name="search" size={18} /><input aria-label={`Pesquisar ${page.toLowerCase()}`} placeholder="Pesquisar por nome, CPF ou e-mail" value={directorySearch[page]} onChange={(event) => setDirectorySearch((current) => ({ ...current, [page]: event.target.value }))} />{directorySearch[page] && <button aria-label="Limpar pesquisa" onClick={() => setDirectorySearch((current) => ({ ...current, [page]: '' }))} type="button"><ManagementIcon name="close" size={16} /></button>}</label><span>{filteredRows.length} {filteredRows.length === 1 ? 'registro encontrado' : 'registros encontrados'}</span></div><div className="students-table-wrap"><table className="students-table"><thead><tr><th>{page === 'Alunos' ? 'Aluno' : 'Funcionário'}</th><th>{page === 'Alunos' ? 'Status' : 'Cargo'}</th>{page === 'Alunos' && <th>Plano</th>}<th>Contato</th><th>Ações</th></tr></thead><tbody>{filteredRows.length === 0 ? <tr><td colSpan={page === 'Alunos' ? 5 : 4}>{rows.length === 0 ? 'Ainda não há registros.' : 'Nenhum resultado para esta pesquisa.'}</td></tr> : filteredRows.map((item) => <tr key={item.id}><td><strong>{item.profile?.full_name}</strong><span>{item.profile?.email}</span><span>{item.profile?.cpf ? `CPF ${formatCpf(item.profile.cpf)}` : 'CPF não informado'}</span></td><td>{page === 'Alunos' ? <span className={`status-pill ${item.status === 'ATIVO' ? 'is-active' : ''}`}>{item.status}</span> : item.position}</td>{page === 'Alunos' && <td><span className="student-plan-admin-tag">{studentPlan(item)}</span></td>}<td><strong>{item.profile?.phone || 'Não informado'}</strong>{page === 'Funcionários' && <span>{item.profile?.role}</span>}</td><td><button className="outline-action" onClick={() => page === 'Alunos' ? openStudentEditor(item) : openEmployeeEditor(item)} type="button">Editar</button></td></tr>)}</tbody></table></div></section> : !['Início','Agenda','Pagamentos','Auditoria','Relatórios'].includes(page) ? <section className={`page-placeholder ${page === 'Auditoria' ? 'audit-placeholder' : ''}`}><span className="placeholder-kicker">EM CONSTRUÇÃO</span><h2>{page}</h2></section> : null}
    </main></div>
    {mobileMenuOpen && <button className="management-mobile-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} type="button" />}
    {mobileMenuOpen && <section className="management-mobile-sheet" aria-label="Mais opções"><div className="management-mobile-sheet-heading"><div><span>GESTÃO</span><strong>Mais opções</strong></div><button aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} type="button"><ManagementIcon name="close" size={19} /></button></div><div className="management-mobile-sheet-grid">{mobileMoreItems.map((item) => <button key={item} className={page === navigationPage(item) ? 'active' : ''} onClick={() => navigateMobile(item)} type="button"><span><ManagementIcon name={navIcon(item)} size={19} /></span><strong>{navLabel(item)}</strong></button>)}</div><button className="management-mobile-logout" onClick={onLogout} type="button"><ManagementIcon name="logout" size={17} />Sair da conta</button></section>}
    <nav className="management-mobile-nav" aria-label="Navegação da gestão">{mobilePrimaryItems.map((item) => <button key={item} className={page === navigationPage(item) ? 'active' : ''} onClick={() => navigateMobile(item)} type="button"><span><ManagementIcon name={navIcon(item)} size={20} /></span><small>{navLabel(item)}</small></button>)}<button className={mobileMoreItems.some((item) => page === navigationPage(item)) || mobileMenuOpen ? 'active' : ''} onClick={() => setMobileMenuOpen((current) => !current)} type="button"><span><ManagementIcon name="menu" size={20} /></span><small>Mais</small></button></nav>
    {modalError && (form || editingStudent || editingEmployee) && <div className="modal-floating-notice" role="alert"><ManagementIcon name="alert" size={18} /><span>{modalError}</span></div>}
    {form && <div className="modal-backdrop"><form className="student-modal" onSubmit={createAccount}><div className="panel-heading"><h3>Novo acesso</h3><button className="modal-close" onClick={() => setForm(null)} type="button">×</button></div><label>Nome completo<input value={form.full_name} onChange={(e) => setForm({...form,full_name:e.target.value})} required/></label><label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})} required/></label><label>Telefone<input value={form.phone} onChange={(e) => setForm({...form,phone:e.target.value})}/></label><label>Senha inicial<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({...form,password:e.target.value})} required/></label>{form.role === 'ALUNO' && <><label>CPF<input value={form.cpf} onChange={(e) => setForm({...form,cpf:e.target.value})} required/></label><label>CEP<input value={form.address_zip_code} onChange={(e) => setForm({...form,address_zip_code:e.target.value})}/></label><label>Endereço<input value={form.address_street} onChange={(e) => setForm({...form,address_street:e.target.value})}/></label><label>Número<input value={form.address_number} onChange={(e) => setForm({...form,address_number:e.target.value})}/></label><label>Complemento<input value={form.address_complement} onChange={(e) => setForm({...form,address_complement:e.target.value})}/></label><label>Bairro<input value={form.address_district} onChange={(e) => setForm({...form,address_district:e.target.value})}/></label><label>Cidade<input value={form.address_city} onChange={(e) => setForm({...form,address_city:e.target.value})}/></label><label>Estado<input value={form.address_state} onChange={(e) => setForm({...form,address_state:e.target.value})}/></label><label>Pagamento<select value={form.payment_plan} onChange={(e) => setForm({...form,payment_plan:e.target.value})}><option value="MENSALISTA">Mensalista</option><option value="TOTALPASS">TotalPass</option><option value="WELLHUB">Wellhub</option></select></label></>}{form.role !== 'ALUNO' && <><label>CPF<input value={form.cpf} onChange={(e) => setForm({...form,cpf:e.target.value})}/></label><label>Data de admissão<input type="date" value={form.hire_date} onChange={(e) => setForm({...form,hire_date:e.target.value})}/></label><label>CEP<input value={form.address_zip_code} onChange={(e) => setForm({...form,address_zip_code:e.target.value})}/></label><label>Endereço<input value={form.address_street} onChange={(e) => setForm({...form,address_street:e.target.value})}/></label><label>Número<input value={form.address_number} onChange={(e) => setForm({...form,address_number:e.target.value})}/></label><label>Complemento<input value={form.address_complement} onChange={(e) => setForm({...form,address_complement:e.target.value})}/></label><label>Bairro<input value={form.address_district} onChange={(e) => setForm({...form,address_district:e.target.value})}/></label><label>Cidade<input value={form.address_city} onChange={(e) => setForm({...form,address_city:e.target.value})}/></label><label>Estado<input value={form.address_state} onChange={(e) => setForm({...form,address_state:e.target.value})}/></label><label>Perfil<select value={form.role} onChange={(e) => setForm({...form,role:e.target.value})}><option value="RECEPCAO">Recepção</option><option value="PROFESSOR">Professor</option></select></label><label>Cargo<input value={form.position} onChange={(e) => setForm({...form,position:e.target.value})} required/></label><label>Tipo de vínculo<input value={form.employment_type} onChange={(e) => setForm({...form,employment_type:e.target.value})}/></label><label>Observações<input value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})}/></label><label className="employee-documents-field">Documentos do funcionário<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setForm({...form,documents:Array.from(e.target.files || [])})}/><small>Anexe documentos do funcionário. PDF, imagem ou documento.</small></label><WorkScheduleEditor schedule={form.work_schedule} required={form.role === 'PROFESSOR'} onChange={(work_schedule) => setForm({...form,work_schedule})} /></>}<button className="dashboard-primary-action full-action" type="submit">Criar acesso</button></form></div>}
    {quickAction?.type === 'booking' && <div className="modal-backdrop"><form className="student-modal quick-action-modal quick-booking-modal" onSubmit={saveQuickBooking}>
      <div className="quick-booking-head"><div><span className="placeholder-kicker">RECEPÇÃO</span><h3>Agendar aluno</h3><p>Pesquise o aluno e selecione um horário disponível para o agendamento.</p></div><div className="quick-booking-callout"><ManagementIcon name="calendar" size={22}/><div><strong>Cada treino conta!</strong><span>Mantenha a agenda em dia e ajude nossos alunos a manterem a rotina.</span></div></div><button className="modal-close" type="button" onClick={()=>setQuickAction(null)}>×</button></div>
      <div className="quick-booking-search"><label>Aluno<div className="quick-student-search"><input type="search" placeholder="Digite o nome, CPF ou telefone do aluno" value={quickStudentSearch} onChange={e=>{setQuickStudentSearch(e.target.value);setQuickAction({...quickAction,student_id:'',time:''})}} required={!quickAction.student_id}/>{quickStudentSearch && !quickAction.student_id && <div className="quick-student-results">{students.filter(s=>s.status==='ATIVO'&&normalizeDirectorySearch(`${s.profile?.full_name||''}${s.profile?.cpf||''}${s.profile?.phone||''}`).includes(normalizeDirectorySearch(quickStudentSearch))).slice(0,8).map(s=><button type="button" key={s.id} onClick={()=>{setQuickAction({...quickAction,student_id:s.id,time:''});setQuickStudentSearch(s.profile?.full_name||'')}}><strong>{s.profile?.full_name}</strong><span>{s.profile?.cpf||s.profile?.phone||''}</span></button>)}</div>}</div></label>
      {quickAction.student_id && (()=>{const s=students.find(x=>x.id===quickAction.student_id);return <div className="quick-selected-student"><span className="quick-student-avatar">{(s?.profile?.full_name||'A').split(/\s+/).map(n=>n[0]).slice(0,2).join('')}</span><div><strong>{s?.profile?.full_name}</strong><span>{s?.profile?.cpf||'CPF não informado'} &nbsp; | &nbsp; {s?.profile?.phone||'Telefone não informado'}</span></div><span className="status-pill is-active">Ativo</span><div className="quick-student-plan"><span>Plano: <strong>{formatPlan(studentPlanCode(s))}</strong></span>{s?.billing_due_day&&<span>Vencimento: dia {s.billing_due_day}</span>}</div></div>})()}</div>
      <div className="quick-booking-section-title"><h4>Escolha a data e o horário</h4><div className="quick-slot-legend"><span className="available">● Disponível</span><span className="full">● Lotado</span></div></div>
      <div className="quick-day-columns">{[...new Set(quickSlots.map(s=>s.appointment_date))].slice(0,3).map((v,offset)=>{const visible=quickSlots.filter(s=>s.appointment_date===v&&!s.is_past);const actualToday=v===todayIso();return <section className={offset===0?'quick-day-card today':'quick-day-card'} key={v}><div className="quick-day-head"><ManagementIcon name="calendar" size={21}/><div><strong>{actualToday?'Hoje':new Date(v+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'}).replace(/^./,x=>x.toUpperCase())}</strong><span>{new Date(v+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</span></div></div><div className="quick-day-slots">{quickLoading?<p>Carregando…</p>:visible.length?visible.map(s=>{const full=Number(s.available||0)<=0;return <button type="button" key={s.start_time} disabled={full} className={`${full?'full':''} ${!full&&quickAction.date===v&&quickAction.time===String(s.start_time).slice(0,5)?'active':''}`} onClick={()=>!full&&setQuickAction({...quickAction,date:v,time:String(s.start_time).slice(0,5)})}><span className="quick-slot-dot">●</span><strong>{String(s.start_time).slice(0,5)}</strong><small className="quick-slot-count">{Number(s.available||0)} livres · {Number(s.occupied||0)} agendadas</small>{full&&<em>Lotado</em>}</button>}):<p className="quick-no-slots">Sem horários futuros</p>}</div></section>})}</div>
      <div className="quick-booking-footer"><button className="outline-action" type="button" onClick={()=>setQuickAction(null)}>Cancelar</button><button className="dashboard-primary-action" type="submit" disabled={quickLoading||!quickAction.student_id||!quickAction.time}>Confirmar agendamento <span>→</span></button></div>
    </form></div>}
    {quickAction?.type === 'payment' && <div className="modal-backdrop"><form className="student-modal quick-action-modal" onSubmit={saveQuickPayment}><div className="panel-heading"><div><span className="placeholder-kicker">RECEPÇÃO</span><h3>Cadastrar pagamento</h3></div><button className="modal-close" type="button" onClick={()=>setQuickAction(null)}>×</button></div><div className="quick-choice"><button type="button" className={quickAction.scope==='ALUNO'?'active':''} onClick={()=>setQuickAction({...quickAction,scope:'ALUNO'})}>Aluno</button><button type="button" className={quickAction.scope==='OUTROS'?'active':''} onClick={()=>setQuickAction({...quickAction,scope:'OUTROS',student_id:'',category:'OUTROS'})}>Outros</button></div>{quickAction.scope==='ALUNO'?<><label>Aluno<div className="quick-student-search"><input type="search" placeholder="Digite o nome, CPF ou telefone" value={quickStudentSearch} onChange={e=>{setQuickStudentSearch(e.target.value);setQuickAction({...quickAction,student_id:'',linked_payment_id:''})}} required={!quickAction.student_id}/>{quickStudentSearch && !quickAction.student_id && <div className="quick-student-results">{students.filter(s=>normalizeDirectorySearch(`${s.profile?.full_name||''}${s.profile?.cpf||''}${s.profile?.phone||''}`).includes(normalizeDirectorySearch(quickStudentSearch))).slice(0,8).map(s=><button type="button" key={s.id} onClick={()=>{selectQuickPaymentStudent(s.id);setQuickStudentSearch(s.profile?.full_name||'')}}><strong>{s.profile?.full_name}</strong><span>{s.profile?.cpf||s.profile?.phone||''}</span></button>)}</div>}</div></label><label>Referente a<select value={quickAction.category} onChange={e=>{const category=e.target.value;const studentId=quickAction.student_id;const nearest=payments.filter(p=>p.student_id===studentId&&p.payment_type==='MENSALIDADE'&&p.status!=='CANCELADO').sort((a,b)=>Math.abs(new Date(a.due_date)-new Date())-Math.abs(new Date(b.due_date)-new Date()))[0];setQuickAction({...quickAction,category,amount:category==='DAY_USE'?'20.00':category==='MENSALIDADE'?(nearest?.amount||''):'',linked_payment_id:category==='MENSALIDADE'?(nearest?.id||''):''})}}><option value="DAY_USE">Day use</option><option value="MENSALIDADE">Mensalidade</option><option value="OUTROS">Outros</option></select></label>{quickAction.category==='MENSALIDADE'&&<div className="quick-payment-hint">{quickAction.linked_payment_id?`Cobrança mais próxima localizada. Vencimento: ${new Date(quickAction.due_date+'T12:00:00').toLocaleDateString('pt-BR')}`:'Nenhuma mensalidade pendente localizada para este aluno.'}</div>}{quickAction.category==='OUTROS'&&<label>Descrição<input value={quickAction.description} onChange={e=>setQuickAction({...quickAction,description:e.target.value})} required /></label>}</>:<label>Descrição do pagamento<input value={quickAction.description} onChange={e=>setQuickAction({...quickAction,description:e.target.value})} required /></label>}<label>Valor (R$)<input inputMode="decimal" value={quickAction.amount} onChange={e=>setQuickAction({...quickAction,amount:e.target.value})} placeholder="0,00" required /></label><button className="dashboard-primary-action" type="submit">Cadastrar pagamento</button></form></div>}
    {editingStudent && <div className="modal-backdrop"><form className="student-modal student-profile-modal" onSubmit={saveStudent}>
      <div className="student-profile-head"><div><span className="placeholder-kicker">CADASTRO DO ALUNO</span><div className="student-profile-title"><h3>{editingStudent.profile?.full_name}</h3><span className={`status-pill ${editingStudent.status === 'ATIVO' ? 'is-active' : ''}`}>{editingStudent.status}</span></div><p>{editingStudent.profile?.phone || 'Telefone não informado'} · {editingStudent.profile?.email}</p></div><button className="modal-close" onClick={() => setEditingStudent(null)} type="button">×</button></div>
      <nav className="student-tabs" aria-label="Informações do aluno">
        <button className={studentTab === 'dados' ? 'active' : ''} onClick={() => setStudentTab('dados')} type="button">Dados pessoais</button>
        <button className={studentTab === 'plano' ? 'active' : ''} onClick={() => setStudentTab('plano')} type="button">Plano</button>
        <button className={studentTab === 'agendamentos' ? 'active' : ''} onClick={() => setStudentTab('agendamentos')} type="button">Agendamentos</button>
        <button className={studentTab === 'espera' ? 'active' : ''} onClick={() => setStudentTab('espera')} type="button">Lista de espera</button>
        <button className={studentTab === 'financeiro' ? 'active' : ''} onClick={() => setStudentTab('financeiro')} type="button">Financeiro</button>
      </nav>
      {studentTab === 'dados' && <div className="student-tab-panel"><div className="student-fields-grid">{[['full_name','Nome completo'],['email','E-mail de acesso'],['phone','Telefone'],['cpf','CPF'],['birth_date','Data de nascimento'],['address_zip_code','CEP'],['address_street','Rua'],['address_number','Número'],['address_complement','Complemento'],['address_district','Bairro'],['address_city','Cidade'],['address_state','Estado']].map(([field,label]) => <label key={field}>{label}<input type={field === 'birth_date' ? 'date' : field === 'email' ? 'email' : 'text'} value={editingStudent.profile?.[field] || ''} onChange={(event) => setEditingStudent((current) => ({ ...current, profile: { ...current.profile, [field]: event.target.value } }))} readOnly={field === 'email'} /></label>)}</div><label>Status<select value={editingStudent.status} onChange={(e) => setEditingStudent({...editingStudent,status:e.target.value})}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option><option value="SUSPENSO">Suspenso</option><option value="CANCELADO">Cancelado</option></select></label><button className="dashboard-primary-action student-save" type="submit">Salvar alterações</button></div>}
      {studentTab === 'plano' && <div className="student-tab-panel"><div className="plan-panel-grid"><label>Tipo de plano<select value={editingStudent.plan_code} onChange={(event) => setEditingStudent((current) => ({ ...current, plan_code: event.target.value }))}><option value="MENSALISTA">Mensalista</option><option value="TOTALPASS">TotalPass</option><option value="WELLHUB">Wellhub</option></select></label>{editingStudent.plan_code === 'MENSALISTA' && <><label>Dia do vencimento<input type="number" min="1" max="31" placeholder="Ex.: 10" value={editingStudent.billing_due_day || ''} onChange={(event) => setEditingStudent((current) => ({ ...current, billing_due_day: event.target.value }))} required /><small>A próxima cobrança será criada automaticamente 10 dias antes do vencimento.</small></label><label>Valor da mensalidade (R$)<input type="text" inputMode="decimal" placeholder="Ex.: 150,00" value={editingStudent.monthly_fee || ''} onChange={(event) => setEditingStudent((current) => ({ ...current, monthly_fee: event.target.value }))} required /><small>Este será o valor usado nas cobranças automáticas.</small></label></>}<div className="plan-current"><strong>Plano ativo</strong><span>{formatPlan(editingStudent.plan_code)}</span></div></div>{editingStudent.plan_code === 'MENSALISTA' && <div className="finance-link-card"><div><strong>Gerencie as cobranças no Financeiro</strong><span>Criação, vencimentos, pagamentos e histórico financeiro ficam separados do cadastro.</span></div><button type="button" onClick={() => openStudentFinance(editingStudent)}>Ir para Pagamentos →</button></div>}<button className="dashboard-primary-action student-save" type="submit">Salvar plano</button></div>}
      {studentTab === 'agendamentos' && <div className="student-tab-panel student-record-list"><h4>Agendamentos</h4>{appointments.filter((item) => item.student_id === editingStudent.id).length ? appointments.filter((item) => item.student_id === editingStudent.id).map((item) => <div key={item.id}><strong>{new Date(`${item.appointment_date}T12:00:00`).toLocaleDateString('pt-BR')} às {String(item.start_time).slice(0,5)}</strong><span>{item.status}</span></div>) : <p>Nenhum agendamento encontrado.</p>}</div>}
      {studentTab === 'espera' && <div className="student-tab-panel student-record-list"><h4>Lista de espera</h4><p>Consulte e gerencie a posição deste aluno pela Lista de espera da Recepção.</p></div>}
      {studentTab === 'financeiro' && <div className="student-tab-panel student-record-list"><div className="tab-heading-action"><div><h4>Resumo financeiro</h4><p>As operações financeiras são realizadas em Pagamentos.</p></div>{editingStudent.plan_code === 'MENSALISTA' && <button className="outline-action" type="button" onClick={() => openStudentFinance(editingStudent)}>Ir para Pagamentos</button>}</div>{payments.filter((item) => item.student_id === editingStudent.id).slice(0,5).map((item) => { const state=getPaymentPresentation(item); return <div key={item.id}><strong>{new Date(`${item.due_date}T12:00:00`).toLocaleDateString('pt-BR')} · {formatCurrency(item.amount)}</strong><span>{state.label}</span></div> })}{!payments.some((item) => item.student_id === editingStudent.id) && <p>Nenhum pagamento registrado.</p>}</div>}
    </form></div>}
    {editingEmployee && <div className="modal-backdrop"><form className="student-modal employee-modal" onSubmit={saveEmployee}><div className="panel-heading"><h3>Editar funcionário</h3><button className="modal-close" onClick={() => setEditingEmployee(null)} type="button">×</button></div>{[['full_name','Nome completo'],['email','E-mail de acesso'],['phone','Telefone'],['cpf','CPF'],['birth_date','Data de nascimento'],['address_zip_code','CEP'],['address_street','Rua'],['address_number','Número'],['address_complement','Complemento'],['address_district','Bairro'],['address_city','Cidade'],['address_state','Estado']].map(([field,label]) => <label key={field}>{label}<input type={field === 'birth_date' ? 'date' : field === 'email' ? 'email' : 'text'} value={editingEmployee.profile[field] || ''} onChange={(e) => setEditingEmployee({...editingEmployee, profile: {...editingEmployee.profile, [field]: e.target.value}})} readOnly={field === 'email'} title={field === 'email' ? 'O e-mail de acesso não é alterado nesta tela.' : undefined} /></label>)}<label>Cargo<input value={editingEmployee.position || ''} onChange={(e) => setEditingEmployee({...editingEmployee,position:e.target.value})} required /></label><label>Data de admissão<input type="date" value={editingEmployee.hire_date || ''} onChange={(e) => setEditingEmployee({...editingEmployee,hire_date:e.target.value})} /></label><label>Tipo de vínculo<input value={editingEmployee.employment_type || ''} onChange={(e) => setEditingEmployee({...editingEmployee,employment_type:e.target.value})} /></label><label>Observações<input value={editingEmployee.notes || ''} onChange={(e) => setEditingEmployee({...editingEmployee,notes:e.target.value})} /></label><label className="employee-documents-field">Documentos do funcionário<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setEditingEmployee({...editingEmployee,documents:Array.from(e.target.files || [])})}/><small>Anexe novos documentos do funcionário. PDF, imagem ou documento.</small></label><WorkScheduleEditor schedule={editingEmployee.work_schedule} required={editingEmployee.profile?.role === 'PROFESSOR'} onChange={(work_schedule) => setEditingEmployee({...editingEmployee,work_schedule})} /><button className="dashboard-primary-action full-action" type="submit">Salvar dados</button><label>Nova senha<input type="password" minLength="8" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><button className="outline-action full-action" type="button" onClick={resetEmployeePassword}>Redefinir senha</button><button className="outline-action full-action" type="button" onClick={deleteEmployee}>Excluir conta</button></form></div>}
  </div>
}

export default AppShell
