import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { seedDemoData } from '../lib/demoSeed'
import studioLogo from '../assets/studio-power-fit-logo.png'
import './DemoSeed.css'

const emptyForm = { full_name: '', email: '', phone: '', notification_phone: '', password: '', role: 'ALUNO', position: '', hire_date: '', cpf: '', birth_date: '', address_zip_code: '', address_street: '', address_number: '', address_complement: '', address_district: '', address_city: '', address_state: '', employment_type: '', notes: '', payment_plan: 'MENSALISTA' }

const onlyDigits = (value) => String(value || '').replace(/\D/g, '')
const formatCpf = (value) => onlyDigits(value).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
const formatPhone = (value) => onlyDigits(value).slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
const formatCep = (value) => onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')

function AppShell({ profile, onLogout }) {
  const [darkMode, setDarkMode] = useState(true)
  const [page, setPage] = useState('Início')
  const [students, setStudents] = useState([])
  const [employees, setEmployees] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [payments, setPayments] = useState([])
  const [health, setHealth] = useState({ activeStudents: 0, inactiveStudents: 0, activeEmployees: 0, revenue: 0, overdue: 0, todayAppointments: 0 })
  const [receptionPanel, setReceptionPanel] = useState({ appointments: [], present: 0, absent: 0, activeTeachers: 0, overdue: 0, waitlist: 0, birthdays: [] })
  const [notice, setNotice] = useState('')
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [form, setForm] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const hour = new Date().getHours()
  const receptionGreeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const isAdmin = profile.role === 'ADMIN'

  const loadStudents = async () => {
    const { data, error } = await supabase.from('students').select('id, profile_id, status, created_at').order('created_at', { ascending: false })
    if (error) return setNotice(error.message)
    const ids = data.map((item) => item.profile_id)
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, full_name, email, phone').in('id', ids) : { data: [] }
    const byId = new Map((profiles ?? []).map((item) => [item.id, item]))
    setStudents(data.map((item) => ({ ...item, profile: byId.get(item.profile_id) })))
  }

  const loadEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, profile_id, position, status, hire_date, employment_type, notes, created_at').order('created_at', { ascending: false })
    const ids = (data ?? []).map((item) => item.profile_id)
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, full_name, email, phone, cpf, birth_date, address_zip_code, address_street, address_number, address_complement, address_district, address_city, address_state, role').in('id', ids) : { data: [] }
    const byId = new Map((profiles ?? []).map((item) => [item.id, item]))
    setEmployees((data ?? []).map((item) => ({ ...item, profile: byId.get(item.profile_id) })))
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
    const [active, inactive, staff, payments, appointments] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
      supabase.from('students').select('*', { count: 'exact', head: true }).neq('status', 'ATIVO'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
      supabase.from('payments').select('amount, status, due_date, payment_date').gte('due_date', monthStart),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today).eq('status', 'CONFIRMADO'),
    ])
    const paid = (payments.data ?? []).filter((item) => item.status === 'IDENTIFICADO').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const overdue = (payments.data ?? []).filter((item) => !['IDENTIFICADO', 'CANCELADO'].includes(item.status) && item.due_date < today).length
    setHealth({ activeStudents: active.count ?? 0, inactiveStudents: inactive.count ?? 0, activeEmployees: staff.count ?? 0, revenue: paid, overdue, todayAppointments: appointments.count ?? 0 })
  }

  const loadAgenda = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('appointments').select('id, student_id, appointment_date, start_time, status').gte('appointment_date', today).order('appointment_date').order('start_time').limit(30)
    const studentIds = [...new Set((data ?? []).map((item) => item.student_id))]
    const { data: studentsData } = studentIds.length ? await supabase.from('students').select('id, profile_id').in('id', studentIds) : { data: [] }
    const profileIds = (studentsData ?? []).map((item) => item.profile_id)
    const { data: people } = profileIds.length ? await supabase.from('profiles').select('id, full_name').in('id', profileIds) : { data: [] }
    const profilesById = new Map((people ?? []).map((item) => [item.id, item]))
    const studentById = new Map((studentsData ?? []).map((item) => [item.id, profilesById.get(item.profile_id)]))
    setAppointments((data ?? []).map((item) => ({ ...item, student: studentById.get(item.student_id) })))
  }

  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('id, student_id, amount, due_date, status, payment_type').order('due_date').limit(50)
    const studentIds = [...new Set((data ?? []).map((item) => item.student_id))]
    const { data: studentsData } = studentIds.length ? await supabase.from('students').select('id, profile_id').in('id', studentIds) : { data: [] }
    const profileIds = (studentsData ?? []).map((item) => item.profile_id)
    const { data: people } = profileIds.length ? await supabase.from('profiles').select('id, full_name').in('id', profileIds) : { data: [] }
    const profilesById = new Map((people ?? []).map((item) => [item.id, item]))
    const studentById = new Map((studentsData ?? []).map((item) => [item.id, profilesById.get(item.profile_id)]))
    setPayments((data ?? []).map((item) => ({ ...item, student: studentById.get(item.student_id) })))
  }

  const loadReceptionPanel = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const [agenda, attendance, teachers, waiting, paymentsData, profilesData] = await Promise.all([
      supabase.from('appointments').select('id, appointment_date, start_time, status').eq('appointment_date', today).eq('status', 'CONFIRMADO').order('start_time'),
      supabase.from('attendance').select('status, created_at').gte('created_at', `${today}T00:00:00`),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
      supabase.from('waitlist').select('*', { count: 'exact', head: true }).eq('appointment_date', today).eq('status', 'AGUARDANDO'),
      supabase.from('payments').select('status, due_date').lt('due_date', today),
      supabase.from('profiles').select('full_name, birth_date, phone, notification_phone').not('birth_date', 'is', null),
    ])
    const monthDay = today.slice(5)
    const birthdays = (profilesData.data ?? []).filter((person) => String(person.birth_date).slice(5) === monthDay).slice(0, 5)
    setReceptionPanel({
      appointments: agenda.data ?? [],
      present: (attendance.data ?? []).filter((item) => item.status === 'PRESENTE').length,
      absent: (attendance.data ?? []).filter((item) => item.status === 'AUSENTE').length,
      activeTeachers: teachers.count ?? 0,
      overdue: (paymentsData.data ?? []).filter((item) => !['IDENTIFICADO', 'CANCELADO'].includes(item.status)).length,
      waitlist: waiting.count ?? 0,
      birthdays,
    })
  }

  useEffect(() => { loadStudents(); loadEmployees(); loadAudit(); loadHealth(); loadAgenda(); loadPayments(); loadReceptionPanel() }, [])

  useEffect(() => {
    if (isAdmin) return undefined
    const timer = window.setInterval(() => { loadReceptionPanel(); loadAgenda(); loadPayments() }, 30000)
    return () => window.clearInterval(timer)
  }, [isAdmin])

  useEffect(() => {
    const heading = document.querySelector('.reception-welcome h2')
    const firstName = String(profile.full_name || 'Recepção').trim().split(/\s+/)[0]
    if (heading) heading.textContent = `${receptionGreeting}, ${firstName}.`
  }, [page, receptionGreeting, profile.full_name])

  useEffect(() => {
    const card = document.querySelector('.reception-stats article:nth-child(5)')
    if (!card) return
    card.querySelector('.waitlist-action')?.remove()
    if (!receptionPanel.waitlist) return
    const button = document.createElement('button')
    button.className = 'waitlist-action'
    button.type = 'button'
    button.textContent = 'Ver lista de espera →'
    button.onclick = () => setPage('Lista de espera')
    card.appendChild(button)
  }, [receptionPanel.waitlist])

  useEffect(() => {
    const applyMask = (event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement)) return
      const label = input.closest('label')?.textContent || ''
      if (label.startsWith('CPF')) input.value = formatCpf(input.value)
      if (label.startsWith('Telefone')) input.value = formatPhone(input.value)
      if (label.startsWith('CEP')) input.value = formatCep(input.value)
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
      return setNotice(message)
    }
    setForm(null)
    setNotice('Cadastro criado com sucesso.')
    await loadStudents(); await loadEmployees()
  }

  const saveStudentStatus = async (event) => {
    event.preventDefault()
    const { error } = await supabase.from('students').update({ status: editingStudent.status }).eq('id', editingStudent.id)
    if (error) setNotice(error.message)
    else { setEditingStudent(null); setNotice('Status do aluno atualizado.'); await loadStudents() }
  }

  const manageEmployee = async (body) => {
    const { data, error } = await supabase.functions.invoke('dynamic-function', { body })
    if (error || data?.error) return setNotice(data?.error || error?.message || 'Não foi possível concluir a ação.')
    return true
  }

  const saveEmployee = async (event) => {
    event.preventDefault()
    const ok = await manageEmployee({ action: 'update', user_id: editingEmployee.profile_id, employee_id: editingEmployee.id, ...editingEmployee, ...editingEmployee.profile })
    if (ok) { setEditingEmployee(null); setNotice('Dados do funcionário atualizados.'); await loadEmployees() }
  }

  const resetEmployeePassword = async () => {
    if (newPassword.length < 8) return setNotice('A nova senha deve ter ao menos 8 caracteres.')
    const ok = await manageEmployee({ action: 'reset_password', user_id: editingEmployee.profile_id, password: newPassword })
    if (ok) { setNewPassword(''); setNotice('Senha redefinida com sucesso.') }
  }

  const deleteEmployee = async () => {
    if (!window.confirm(`Excluir definitivamente ${editingEmployee.profile.full_name}?`)) return
    const ok = await manageEmployee({ action: 'delete', user_id: editingEmployee.profile_id })
    if (ok) { setEditingEmployee(null); setNotice('Conta excluída com sucesso.'); await loadEmployees() }
  }

  const openForm = (role) => setForm({ ...emptyForm, role, position: role === 'PROFESSOR' ? 'Professor(a)' : role === 'RECEPCAO' ? 'Recepcionista' : '' })
  const createDemoData = async () => {
    const approved = window.confirm('Criar ou completar os dados fictícios da demonstração? Nenhum registro real será apagado ou sobrescrito.')
    if (!approved) return
    setSeedingDemo(true)
    setNotice('Preparando os dados da demonstração…')
    try {
      const result = await seedDemoData(supabase)
      const inserted = Object.values(result.inserted).reduce((total, amount) => total + amount, 0)
      const warning = result.warnings.length ? ` ${result.warnings.length} grupo(s) opcional(is) não puderam ser incluídos.` : ''
      setNotice(`Demonstração pronta: ${result.totalAccounts} contas verificadas, ${result.createdAccounts} nova(s) e ${inserted} registro(s) operacional(is) incluído(s).${warning}`)
      await Promise.all([loadStudents(), loadEmployees(), loadHealth(), loadAgenda(), loadPayments(), loadReceptionPanel()])
    } catch (error) {
      setNotice(`Não foi possível concluir a demonstração: ${error.message}`)
    } finally {
      setSeedingDemo(false)
    }
  }
  const navItems = isAdmin ? ['Início', 'Alunos', 'Funcionários', 'Agenda', 'Pagamentos', 'Auditoria'] : ['Início', 'Agendamentos', 'Alunos', 'Professores', 'Financeiro', 'Lista de espera', 'Comunicação', 'Relatórios', 'Configurações']
  const navigationPage = (item) => item === 'Agendamentos' ? 'Agenda' : item === 'Financeiro' ? 'Pagamentos' : item
  const title = page === 'Início' ? 'Visão geral' : page
  const rows = page === 'Alunos' ? students : employees
  const receptionSlots = Object.values(receptionPanel.appointments.reduce((groups, item) => { const key = String(item.start_time).slice(0, 5); groups[key] = [...(groups[key] || []), item]; return groups }, {}))

  return <div className={`app-shell dashboard-shell ${darkMode ? 'theme-dark' : 'theme-light'} ${isAdmin ? 'is-admin' : 'is-reception'}`}>
    <aside className="app-sidebar"><div className="sidebar-brand sidebar-brand-logo"><img src={studioLogo} alt="Studio Power Fit" /></div><div className="sidebar-section-title">{isAdmin ? 'GESTÃO' : 'ATENDIMENTO'}</div><nav className="sidebar-menu">{navItems.map((item) => <button key={item} className={`sidebar-item ${page === navigationPage(item) ? 'active' : ''}`} onClick={() => setPage(navigationPage(item))} type="button"><span className="sidebar-icon">{item === 'Alunos' ? '◉' : item === 'Professores' || item === 'Funcionários' ? '♟' : item === 'Auditoria' || item === 'Relatórios' ? '◷' : item === 'Financeiro' ? '▣' : item === 'Lista de espera' ? '◌' : item === 'Comunicação' ? '✉' : '⌂'}</span><span>{item}</span></button>)}</nav><div className="sidebar-bottom"><button className="sidebar-item" onClick={onLogout} type="button"><span className="sidebar-icon">⇥</span><span>Sair da conta</span></button></div></aside>
    <div className="app-main"><header className="app-header"><div><span className="header-kicker">STUDIO POWER FIT · DEMONSTRAÇÃO</span><h1>{title}</h1></div><div className="header-actions"><button className="header-theme-button" onClick={() => setDarkMode(!darkMode)} type="button">{darkMode ? '☀️' : '🌙'}</button><div className="header-user"><div className="user-avatar">{(profile.full_name || 'A')[0]}</div><div className="user-info"><strong>{profile.full_name}</strong><span>{profile.role}</span></div></div></div></header><main className="app-content">
      {isAdmin && page === 'Início' && <div className="demo-seed-toolbar"><div><strong>Apresentação com dados realistas</strong><span>Crie contas e históricos fictícios identificados como DEMO, sem alterar os registros reais.</span></div><button className="dashboard-primary-action" disabled={seedingDemo} onClick={createDemoData} type="button">{seedingDemo ? 'Criando demonstração…' : 'Criar dados da demo'}</button></div>}
      {isAdmin && page === 'Início' && notice && <div className="dashboard-notice demo-seed-notice">{notice}</div>}
      {!isAdmin && page === 'Início' && <section className="reception-dashboard"><div className="reception-welcome"><div><span className="placeholder-kicker">OPERAÇÃO DO DIA</span><h2>Bom trabalho,<br />Recepção.</h2><p>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p></div><button className="outline-action" onClick={loadReceptionPanel} type="button">Atualizar painel</button></div><div className="reception-stats"><article><small>AGENDADOS HOJE</small><strong>{receptionPanel.appointments.length}</strong><button onClick={() => setPage('Agenda')} type="button">Ver agenda</button></article><article><small>PRESENÇAS</small><strong>{receptionPanel.present}</strong><span>{receptionPanel.absent} falta(s)</span></article><article><small>PROFESSORES ATIVOS</small><strong>{receptionPanel.activeTeachers}</strong><span>em operação</span></article><article><small>INADIMPLENTES</small><strong>{receptionPanel.overdue}</strong><button onClick={() => setPage('Pagamentos')} type="button">Ver pagamentos</button></article><article><small>LISTA DE ESPERA</small><strong>{receptionPanel.waitlist}</strong><span>aguardando vaga</span></article></div><div className="reception-grid"><section className="reception-card"><div className="panel-heading"><div><span className="placeholder-kicker">PRÓXIMOS HORÁRIOS</span><h3>Agenda de hoje</h3></div><button className="outline-action" onClick={() => setPage('Agenda')} type="button">Abrir</button></div>{receptionSlots.length ? receptionSlots.slice(0, 5).map((slot) => <div className="slot-row" key={slot[0].start_time}><strong>{String(slot[0].start_time).slice(0, 5)}</strong><span>{slot.length} aluno(s) confirmado(s)</span><b>{slot.length >= 8 ? 'LOTADO' : 'COM VAGAS'}</b></div>) : <p>Nenhum horário confirmado para hoje.</p>}</section><section className="reception-card"><span className="placeholder-kicker">ALERTAS</span><h3>Atenção agora</h3><div className="reception-alert"><b>💳 Pagamentos pendentes</b><span>{receptionPanel.overdue} aluno(s) precisam de acompanhamento.</span><button onClick={() => setPage('Pagamentos')} type="button">Ver</button></div><div className="reception-alert"><b>📋 Lista de espera</b><span>{receptionPanel.waitlist} aluno(s) aguardando vaga.</span><button onClick={() => setPage('Agenda')} type="button">Ver</button></div></section><section className="reception-card birthdays"><span className="placeholder-kicker">ANIVERSARIANTES</span><h3>Hoje</h3>{receptionPanel.birthdays.length ? receptionPanel.birthdays.map((person) => <div className="birthday-row" key={person.full_name}><span>🎂</span><div><b>{person.full_name}</b><small>{person.notification_phone || person.phone || 'Sem telefone'}</small></div></div>) : <p>Nenhum aniversariante hoje.</p>}</section></div></section>}
      {page === 'Agenda' && <section className="students-page live-data-page"><div className="panel-heading"><div><span className="placeholder-kicker">PRÓXIMOS ATENDIMENTOS</span><h2>Agenda</h2></div><button className="outline-action" onClick={loadAgenda} type="button">Atualizar</button></div><div className="students-table-wrap"><table className="students-table"><thead><tr><th>Aluno</th><th>Data</th><th>Horário</th><th>Status</th></tr></thead><tbody>{appointments.length ? appointments.map((item) => <tr key={item.id}><td>{item.student?.full_name || 'Aluno'}</td><td>{new Date(`${item.appointment_date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td>{String(item.start_time).slice(0, 5)}</td><td><span className="status-pill is-active">{item.status}</span></td></tr>) : <tr><td colSpan="4">Não há atendimentos futuros cadastrados.</td></tr>}</tbody></table></div></section>}
      {page === 'Pagamentos' && <section className="students-page live-data-page"><div className="panel-heading"><div><span className="placeholder-kicker">CONTROLE FINANCEIRO</span><h2>Pagamentos</h2></div><button className="outline-action" onClick={loadPayments} type="button">Atualizar</button></div><div className="students-table-wrap"><table className="students-table"><thead><tr><th>Aluno</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>{payments.length ? payments.map((item) => <tr key={item.id}><td>{item.student?.full_name || 'Aluno'}</td><td>{new Date(`${item.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td>{Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td><span className={`status-pill ${item.status === 'IDENTIFICADO' ? 'is-active' : ''}`}>{item.status.replaceAll('_', ' ')}</span></td></tr>) : <tr><td colSpan="4">Nenhum pagamento registrado.</td></tr>}</tbody></table></div></section>}
      {page === 'Início' && <section className="dashboard-executive"><div className="executive-hero"><div><span className="placeholder-kicker">VISÃO EXECUTIVA</span><h2>Saúde do Studio<br />em tempo real.</h2><p>Acompanhe os indicadores que importam para a operação.</p></div><button className="outline-action" onClick={loadHealth} type="button">Atualizar indicadores</button></div><div className="metric-grid executive-metrics"><article className="metric-card accent-card"><small>ALUNOS ATIVOS</small><strong>{health.activeStudents}</strong><span>{health.inactiveStudents} inativos ou suspensos</span></article><article className="metric-card"><small>RECEITA DO MÊS</small><strong>{health.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><span>Pagamentos identificados</span></article><article className="metric-card"><small>INADIMPLÊNCIA</small><strong>{health.overdue}</strong><span>Pagamentos em atraso</span></article><article className="metric-card"><small>AGENDA DE HOJE</small><strong>{health.todayAppointments}</strong><span>Atendimentos confirmados</span></article><article className="metric-card"><small>EQUIPE ATIVA</small><strong>{health.activeEmployees}</strong><span>Funcionários em operação</span></article></div><div className="executive-alerts"><div><span className="placeholder-kicker">ATENÇÃO DO DIA</span><h3>{health.overdue ? `${health.overdue} pagamento(s) precisam de acompanhamento.` : 'Nenhum pagamento em atraso hoje.'}</h3></div><button className="dashboard-primary-action" onClick={() => setPage('Auditoria')} type="button">Abrir auditoria</button></div></section>}
      {page === 'Auditoria' && <section className="students-page audit-page"><div className="panel-heading"><div><span className="placeholder-kicker">CONTROLE DO GESTOR</span><h2>Auditoria</h2></div><button className="outline-action" onClick={loadAudit} type="button">Atualizar</button></div><p className="audit-description">Ações realizadas por recepção e professores.</p><div className="students-table-wrap"><table className="students-table"><thead><tr><th>Responsável</th><th>Perfil</th><th>Ação</th><th>Módulo</th><th>Quando</th></tr></thead><tbody>{auditLogs.length === 0 ? <tr><td colSpan="5">Ainda não há ações registradas desses perfis.</td></tr> : auditLogs.map((item) => <tr key={item.id}><td>{item.person?.full_name || 'Usuário removido'}</td><td>{item.person?.role === 'RECEPCAO' ? 'Recepção' : 'Professor'}</td><td>{item.action}</td><td>{item.module}</td><td>{new Date(item.created_at).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div></section>}
      {page === 'Início' ? <section className="dashboard-hero"><div><span className="placeholder-kicker">PAINEL ADMINISTRATIVO</span><h2>Controle o Studio<br/>em um só lugar.</h2><p>{students.length} alunos e {employees.length} funcionários na demonstração.</p></div></section> : ['Alunos','Funcionários'].includes(page) ? <section className="students-page"><div className="panel-heading"><div><span className="placeholder-kicker">{page === 'Alunos' ? 'CADASTRO E ACOMPANHAMENTO' : 'EQUIPE E ACESSOS'}</span><h2>{page}</h2></div><button className="dashboard-primary-action" onClick={() => openForm(page === 'Alunos' ? 'ALUNO' : 'RECEPCAO')} type="button">+ Novo {page === 'Alunos' ? 'aluno' : 'funcionário'}</button></div>{notice && <div className="dashboard-notice">{notice}</div>}<div className="students-table-wrap"><table className="students-table"><thead><tr><th>{page === 'Alunos' ? 'Aluno' : 'Funcionário'}</th><th>{page === 'Alunos' ? 'Status' : 'Cargo'}</th><th>{page === 'Alunos' ? 'Contato' : 'Perfil'}</th><th>Ações</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="4">Ainda não há registros.</td></tr> : rows.map((item) => <tr key={item.id}><td><strong>{item.profile?.full_name}</strong><span>{item.profile?.email}</span></td><td>{page === 'Alunos' ? <span className={`status-pill ${item.status === 'ATIVO' ? 'is-active' : ''}`}>{item.status}</span> : item.position}</td><td>{page === 'Alunos' ? item.profile?.phone || 'Não informado' : item.profile?.role}</td><td><button className="outline-action" onClick={() => page === 'Alunos' ? setEditingStudent(item) : setEditingEmployee({ ...item, profile: { ...item.profile } })} type="button">Editar</button></td></tr>)}</tbody></table></div></section> : <section className={`page-placeholder ${page === 'Auditoria' ? 'audit-placeholder' : ''}`}><span className="placeholder-kicker">EM CONSTRUÇÃO</span><h2>{page}</h2></section>}
    </main></div>
    {form && <div className="modal-backdrop"><form className="student-modal" onSubmit={createAccount}><div className="panel-heading"><h3>Novo acesso</h3><button className="modal-close" onClick={() => setForm(null)} type="button">×</button></div><label>Nome completo<input value={form.full_name} onChange={(e) => setForm({...form,full_name:e.target.value})} required/></label><label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})} required/></label><label>Telefone<input value={form.phone} onChange={(e) => setForm({...form,phone:e.target.value})}/></label><label>Senha inicial<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({...form,password:e.target.value})} required/></label>{form.role === 'ALUNO' && <><label>CPF<input value={form.cpf} onChange={(e) => setForm({...form,cpf:e.target.value})} required/></label><label>Telefone para avisos<input value={form.notification_phone} onChange={(e) => setForm({...form,notification_phone:e.target.value})}/></label><label>CEP<input value={form.address_zip_code} onChange={(e) => setForm({...form,address_zip_code:e.target.value})}/></label><label>Endereço<input value={form.address_street} onChange={(e) => setForm({...form,address_street:e.target.value})}/></label><label>Número<input value={form.address_number} onChange={(e) => setForm({...form,address_number:e.target.value})}/></label><label>Complemento<input value={form.address_complement} onChange={(e) => setForm({...form,address_complement:e.target.value})}/></label><label>Bairro<input value={form.address_district} onChange={(e) => setForm({...form,address_district:e.target.value})}/></label><label>Cidade<input value={form.address_city} onChange={(e) => setForm({...form,address_city:e.target.value})}/></label><label>Estado<input value={form.address_state} onChange={(e) => setForm({...form,address_state:e.target.value})}/></label><label>Pagamento<select value={form.payment_plan} onChange={(e) => setForm({...form,payment_plan:e.target.value})}><option value="MENSALISTA">Mensalista</option><option value="TOTALPASS">TotalPass</option><option value="WELLHUB">Wellhub</option></select></label></>}{form.role !== 'ALUNO' && <><label>CPF<input value={form.cpf} onChange={(e) => setForm({...form,cpf:e.target.value})}/></label><label>Data de admissão<input type="date" value={form.hire_date} onChange={(e) => setForm({...form,hire_date:e.target.value})}/></label><label>CEP<input value={form.address_zip_code} onChange={(e) => setForm({...form,address_zip_code:e.target.value})}/></label><label>Endereço<input value={form.address_street} onChange={(e) => setForm({...form,address_street:e.target.value})}/></label><label>Número<input value={form.address_number} onChange={(e) => setForm({...form,address_number:e.target.value})}/></label><label>Complemento<input value={form.address_complement} onChange={(e) => setForm({...form,address_complement:e.target.value})}/></label><label>Bairro<input value={form.address_district} onChange={(e) => setForm({...form,address_district:e.target.value})}/></label><label>Cidade<input value={form.address_city} onChange={(e) => setForm({...form,address_city:e.target.value})}/></label><label>Estado<input value={form.address_state} onChange={(e) => setForm({...form,address_state:e.target.value})}/></label><label>Perfil<select value={form.role} onChange={(e) => setForm({...form,role:e.target.value})}><option value="RECEPCAO">Recepção</option><option value="PROFESSOR">Professor</option></select></label><label>Cargo<input value={form.position} onChange={(e) => setForm({...form,position:e.target.value})} required/></label><label>Tipo de vínculo<input value={form.employment_type} onChange={(e) => setForm({...form,employment_type:e.target.value})}/></label><label>Observações<input value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})}/></label></>}<button className="dashboard-primary-action full-action" type="submit">Criar acesso</button></form></div>}
    {editingStudent && <div className="modal-backdrop"><form className="student-modal" onSubmit={saveStudentStatus}><div className="panel-heading"><h3>Editar aluno</h3><button className="modal-close" onClick={() => setEditingStudent(null)} type="button">×</button></div><p>{editingStudent.profile?.full_name}</p><label>Status<select value={editingStudent.status} onChange={(e) => setEditingStudent({...editingStudent,status:e.target.value})}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option><option value="SUSPENSO">Suspenso</option><option value="CANCELADO">Cancelado</option></select></label><button className="dashboard-primary-action full-action" type="submit">Salvar alteração</button></form></div>}
    {editingEmployee && <div className="modal-backdrop"><form className="student-modal employee-modal" onSubmit={saveEmployee}><div className="panel-heading"><h3>Editar funcionário</h3><button className="modal-close" onClick={() => setEditingEmployee(null)} type="button">×</button></div>{[['full_name','Nome completo'],['email','E-mail'],['phone','Telefone'],['cpf','CPF'],['birth_date','Data de nascimento'],['address_zip_code','CEP'],['address_street','Rua'],['address_number','Número'],['address_complement','Complemento'],['address_district','Bairro'],['address_city','Cidade'],['address_state','Estado']].map(([field,label]) => <label key={field}>{label}<input type={field === 'birth_date' ? 'date' : field === 'email' ? 'email' : 'text'} value={editingEmployee.profile[field] || ''} onChange={(e) => setEditingEmployee({...editingEmployee, profile: {...editingEmployee.profile, [field]: e.target.value}})} /></label>)}<label>Cargo<input value={editingEmployee.position || ''} onChange={(e) => setEditingEmployee({...editingEmployee,position:e.target.value})} required /></label><label>Data de admissão<input type="date" value={editingEmployee.hire_date || ''} onChange={(e) => setEditingEmployee({...editingEmployee,hire_date:e.target.value})} /></label><label>Tipo de vínculo<input value={editingEmployee.employment_type || ''} onChange={(e) => setEditingEmployee({...editingEmployee,employment_type:e.target.value})} /></label><label>Observações<input value={editingEmployee.notes || ''} onChange={(e) => setEditingEmployee({...editingEmployee,notes:e.target.value})} /></label><button className="dashboard-primary-action full-action" type="submit">Salvar dados</button><label>Nova senha<input type="password" minLength="8" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><button className="outline-action full-action" type="button" onClick={resetEmployeePassword}>Redefinir senha</button><button className="outline-action full-action" type="button" onClick={deleteEmployee}>Excluir conta</button></form></div>}
  </div>
}

export default AppShell
