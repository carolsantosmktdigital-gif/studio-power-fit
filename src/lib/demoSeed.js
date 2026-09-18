const DEMO_PASSWORD = '12345678'
const DEMO_DOMAIN = 'example.com'
export const DEMO_BATCH_ID = 'studio-power-fit-demo-operacao-v2'
const DEMO_BATCH_MARKER = `[DEMO_BATCH:${DEMO_BATCH_ID}]`

const people = [
  { key: 'ana', full_name: '[DEMO] Ana Martins', role: 'ALUNO', phone: '(11) 99101-1001', cpf: '90000000001', birth_date: '1994-09-16', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'bruno', full_name: '[DEMO] Bruno Costa', role: 'ALUNO', phone: '(11) 99101-1002', cpf: '90000000002', birth_date: '1989-03-12', payment_plan: 'WELLHUB', status: 'ATIVO' },
  { key: 'camila', full_name: '[DEMO] Camila Rocha', role: 'ALUNO', phone: '(11) 99101-1003', cpf: '90000000003', birth_date: '1997-07-21', payment_plan: 'TOTALPASS', status: 'ATIVO' },
  { key: 'diego', full_name: '[DEMO] Diego Alves', role: 'ALUNO', phone: '(11) 99101-1004', cpf: '90000000004', birth_date: '1986-11-08', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'elisa', full_name: '[DEMO] Elisa Nunes', role: 'ALUNO', phone: '(11) 99101-1005', cpf: '90000000005', birth_date: '1992-01-25', payment_plan: 'MENSALISTA', status: 'SUSPENSO' },
  { key: 'felipe', full_name: '[DEMO] Felipe Moraes', role: 'ALUNO', phone: '(11) 99101-1006', cpf: '90000000006', birth_date: '2000-05-14', payment_plan: 'WELLHUB', status: 'ATIVO' },
  { key: 'gabriela', full_name: '[DEMO] Gabriela Lima', role: 'ALUNO', phone: '(11) 99101-1007', cpf: '90000000007', birth_date: '1995-12-02', payment_plan: 'TOTALPASS', status: 'ATIVO' },
  { key: 'hugo', full_name: '[DEMO] Hugo Ribeiro', role: 'ALUNO', phone: '(11) 99101-1008', cpf: '90000000008', birth_date: '1988-04-19', payment_plan: 'MENSALISTA', status: 'INATIVO' },
  { key: 'isabela', full_name: '[DEMO] Isabela Freitas', role: 'ALUNO', phone: '(11) 99101-1009', cpf: '90000000009', birth_date: '1998-02-18', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'joao', full_name: '[DEMO] João Azevedo', role: 'ALUNO', phone: '(11) 99101-1010', cpf: '90000000010', birth_date: '1987-06-04', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'karina', full_name: '[DEMO] Karina Duarte', role: 'ALUNO', phone: '(11) 99101-1011', cpf: '90000000011', birth_date: '1993-10-11', payment_plan: 'WELLHUB', status: 'ATIVO' },
  { key: 'lucas', full_name: '[DEMO] Lucas Ferreira', role: 'ALUNO', phone: '(11) 99101-1012', cpf: '90000000012', birth_date: '1991-07-26', payment_plan: 'TOTALPASS', status: 'ATIVO' },
  { key: 'marcela', full_name: '[DEMO] Marcela Rezende', role: 'ALUNO', phone: '(11) 99101-1013', cpf: '90000000013', birth_date: '1996-05-09', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'nicolas', full_name: '[DEMO] Nicolas Barros', role: 'ALUNO', phone: '(11) 99101-1014', cpf: '90000000014', birth_date: '1985-01-30', payment_plan: 'MENSALISTA', status: 'SUSPENSO' },
  { key: 'olivia', full_name: '[DEMO] Olivia Mendes', role: 'ALUNO', phone: '(11) 99101-1015', cpf: '90000000015', birth_date: '1999-08-23', payment_plan: 'WELLHUB', status: 'ATIVO' },
  { key: 'paulo', full_name: '[DEMO] Paulo Henrique', role: 'ALUNO', phone: '(11) 99101-1016', cpf: '90000000016', birth_date: '1984-12-15', payment_plan: 'TOTALPASS', status: 'ATIVO' },
  { key: 'raquel', full_name: '[DEMO] Raquel Teixeira', role: 'ALUNO', phone: '(11) 99101-1017', cpf: '90000000017', birth_date: '1990-04-02', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'samuel', full_name: '[DEMO] Samuel Cardoso', role: 'ALUNO', phone: '(11) 99101-1018', cpf: '90000000018', birth_date: '1997-09-29', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'tatiana', full_name: '[DEMO] Tatiana Moura', role: 'ALUNO', phone: '(11) 99101-1019', cpf: '90000000019', birth_date: '1992-03-17', payment_plan: 'WELLHUB', status: 'ATIVO' },
  { key: 'victor', full_name: '[DEMO] Victor Martins', role: 'ALUNO', phone: '(11) 99101-1020', cpf: '90000000020', birth_date: '1989-11-06', payment_plan: 'TOTALPASS', status: 'ATIVO' },
  { key: 'yasmin', full_name: '[DEMO] Yasmin Monteiro', role: 'ALUNO', phone: '(11) 99101-1021', cpf: '90000000021', birth_date: '2001-06-22', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'andre', full_name: '[DEMO] André Pires', role: 'ALUNO', phone: '(11) 99101-1022', cpf: '90000000022', birth_date: '1983-02-13', payment_plan: 'MENSALISTA', status: 'CANCELADO' },
  { key: 'beatriz', full_name: '[DEMO] Beatriz Tavares', role: 'ALUNO', phone: '(11) 99101-1023', cpf: '90000000023', birth_date: '1995-05-31', payment_plan: 'WELLHUB', status: 'ATIVO' },
  { key: 'caio', full_name: '[DEMO] Caio Santana', role: 'ALUNO', phone: '(11) 99101-1024', cpf: '90000000024', birth_date: '1988-09-07', payment_plan: 'MENSALISTA', status: 'ATIVO' },
  { key: 'marina', full_name: '[DEMO] Marina Lopes', role: 'RECEPCAO', phone: '(11) 99101-2001', cpf: '90000000101', birth_date: '1993-06-10', position: 'Recepcionista', employment_type: 'CLT', hire_date: '2025-02-03' },
  { key: 'rafael', full_name: '[DEMO] Rafael Souza', role: 'PROFESSOR', phone: '(11) 99101-3001', cpf: '90000000201', birth_date: '1990-08-17', position: 'Professor(a)', employment_type: 'PJ', hire_date: '2024-08-05' },
  { key: 'juliana', full_name: '[DEMO] Juliana Campos', role: 'PROFESSOR', phone: '(11) 99101-3002', cpf: '90000000202', birth_date: '1991-10-28', position: 'Professor(a)', employment_type: 'PJ', hire_date: '2025-01-13' },
].map((person) => ({ ...person, email: `demo.powerfit+${person.key}@${DEMO_DOMAIN}` }))

const isoDate = (date) => date.toISOString().slice(0, 10)
const relativeDate = (days) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}
const currentMonthDate = (day) => {
  const now = new Date()
  return isoDate(new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), 12))
}
const monthDate = (monthOffset, day) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, 12)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return isoDate(date)
}
const upcomingBirthday = (days, age) => {
  const birthday = new Date()
  birthday.setHours(12, 0, 0, 0)
  birthday.setDate(birthday.getDate() + days)
  birthday.setFullYear(birthday.getFullYear() - age)
  return isoDate(birthday)
}

const createAccount = async (supabase, person) => {
  const { data, error } = await supabase.functions.invoke('dynamic-function', {
    body: {
      ...person,
      password: DEMO_PASSWORD,
      notification_phone: person.phone,
      address_zip_code: '01310-100',
      address_street: 'Avenida Paulista',
      address_number: String(100 + people.indexOf(person)),
      address_complement: DEMO_BATCH_MARKER,
      address_district: 'Bela Vista',
      address_city: 'São Paulo',
      address_state: 'SP',
      notes: `${DEMO_BATCH_MARKER} Registro fictício criado para apresentação da plataforma.`,
    },
  })
  if (error || data?.error) throw new Error(data?.error || error?.message || `Falha ao criar ${person.full_name}.`)
}

const insertRows = async (supabase, table, rows, uniqueFields, warnings) => {
  if (!rows.length) return 0
  const studentIds = [...new Set(rows.map((row) => row.student_id).filter(Boolean))]
  let query = supabase.from(table).select('*')
  if (studentIds.length) query = query.in('student_id', studentIds)
  const { data: existing, error: readError } = await query
  if (readError) {
    warnings.push(`${table}: ${readError.message}`)
    return 0
  }
  const signature = (row) => uniqueFields.map((field) => String(row[field] ?? '')).join('|')
  const existingKeys = new Set((existing ?? []).map(signature))
  const missing = rows.filter((row) => !existingKeys.has(signature(row)))
  if (!missing.length) return 0
  const { error } = await supabase.from(table).insert(missing)
  if (error) {
    warnings.push(`${table}: ${error.message}`)
    return 0
  }
  return missing.length
}

export async function seedDemoData(supabase) {
  const warnings = []
  let createdAccounts = 0

  for (const person of people) {
    const { data: existing, error } = await supabase.from('profiles').select('id').eq('email', person.email).maybeSingle()
    if (error) throw new Error(`Não foi possível verificar ${person.full_name}: ${error.message}`)
    if (!existing) {
      await createAccount(supabase, person)
      createdAccounts += 1
    }
  }

  const studentPeople = people.filter((person) => person.role === 'ALUNO')
  const configuredByEmail = new Map(studentPeople.map((person) => [person.email, person]))
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, birth_date, phone, role')
    .eq('role', 'ALUNO')
    .ilike('full_name', '[DEMO]%')
    .order('full_name')
  if (profileError) throw new Error(profileError.message)
  if (!(profiles ?? []).length) throw new Error('Nenhum aluno identificado como DEMO foi encontrado.')
  const profileByEmail = new Map((profiles ?? []).map((profile) => [profile.email, profile.id]))
  let supportsStudentPaymentPlan = true
  let { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, profile_id, status, payment_plan')
    .in('profile_id', (profiles ?? []).map((profile) => profile.id))
  if (studentError && /payment_plan|schema cache|column/i.test(studentError.message || '')) {
    supportsStudentPaymentPlan = false
    const fallback = await supabase
      .from('students')
      .select('id, profile_id, status')
      .in('profile_id', (profiles ?? []).map((profile) => profile.id))
    students = fallback.data
    studentError = fallback.error
  }
  if (studentError) throw new Error(studentError.message)
  const studentByProfile = new Map((students ?? []).map((student) => [student.profile_id, student.id]))
  const studentByKey = new Map(studentPeople.map((person) => [person.key, studentByProfile.get(profileByEmail.get(person.email))]))
  const demoStudents = (profiles ?? []).map((profile, index) => {
    const configured = configuredByEmail.get(profile.email)
    return {
      ...configured,
      key: configured?.key || `student-${index + 1}`,
      full_name: profile.full_name,
      profile_id: profile.id,
      student_id: studentByProfile.get(profile.id),
      payment_plan: ['MENSALISTA', 'WELLHUB', 'TOTALPASS'][index % 3],
    }
  }).filter((student) => student.student_id)
  if (!demoStudents.length) throw new Error('Os perfis DEMO ainda não possuem cadastros de aluno vinculados.')

  for (const person of demoStudents) {
    const studentUpdate = supportsStudentPaymentPlan
      ? { status: 'ATIVO', payment_plan: person.payment_plan }
      : { status: 'ATIVO' }
    const { error } = await supabase.from('students').update(studentUpdate).eq('id', person.student_id)
    if (error) warnings.push(`aluno ${person.full_name}: ${error.message}`)
  }

  const birthdayOffsets = [1, 3, 5, 8, 12, 16]
  for (const [index, person] of demoStudents.slice(0, birthdayOffsets.length).entries()) {
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: upcomingBirthday(birthdayOffsets[index], 24 + (index * 3)) })
      .eq('id', person.profile_id)
    if (error) warnings.push(`aniversário ${person.full_name}: ${error.message}`)
  }

  const paymentAmount = (person) => person.payment_plan === 'WELLHUB' ? 154.8 : person.payment_plan === 'TOTALPASS' ? 139.5 : 189.9
  const paymentType = (person) => person.payment_plan === 'MENSALISTA' ? 'MENSALIDADE' : person.payment_plan
  const paymentRows = []
  Array.from({ length: 24 }, (_, index) => index - 24).forEach((monthOffset) => {
    demoStudents.forEach((person, index) => {
      const dueDate = monthDate(monthOffset, 5 + (index % 4) * 5)
      const isLongOverdue = person.key === 'hugo' && monthOffset === -1
      paymentRows.push({
        student_id: person.student_id,
        amount: paymentAmount(person),
        due_date: dueDate,
        status: isLongOverdue ? 'PENDENTE' : 'IDENTIFICADO',
        payment_date: isLongOverdue ? null : monthDate(monthOffset, 4 + (index % 4) * 5 + (index % 3)),
        payment_type: paymentType(person),
      })
    })
  })
  const currentScenarios = [
    ['ana', -11, 'IDENTIFICADO', 0], ['bruno', -8, 'IDENTIFICADO', 0], ['camila', -5, 'IDENTIFICADO', 0], ['isabela', -3, 'IDENTIFICADO', 0],
    ['karina', -12, 'IDENTIFICADO', -10], ['lucas', -10, 'IDENTIFICADO', -9], ['marcela', -9, 'IDENTIFICADO', -8], ['olivia', -8, 'IDENTIFICADO', -7],
    ['paulo', -7, 'IDENTIFICADO', -6], ['tatiana', -6, 'IDENTIFICADO', -5], ['victor', -5, 'IDENTIFICADO', -4], ['yasmin', -4, 'IDENTIFICADO', -3],
    ['beatriz', -3, 'IDENTIFICADO', -2], ['caio', -2, 'IDENTIFICADO', -1], ['joao', 0, 'PENDENTE', null], ['raquel', 0, 'PENDENTE', null],
    ['felipe', 2, 'PENDENTE', null], ['gabriela', 4, 'PENDENTE', null], ['samuel', 6, 'PENDENTE', null], ['nicolas', -38, 'PENDENTE', null],
    ['diego', -1, 'PENDENTE', null], ['elisa', -8, 'PENDENTE', null], ['andre', 10, 'CANCELADO', null],
  ]
  currentScenarios.forEach(([key, dueOffset, status, paymentOffset]) => {
    const person = demoStudents.find((item) => item.key === key)
    if (!person) return
    paymentRows.push({
      student_id: person.student_id,
      amount: paymentAmount(person),
      due_date: relativeDate(dueOffset),
      status,
      payment_date: paymentOffset === null ? null : relativeDate(paymentOffset),
      payment_type: paymentType(person),
    })
  })

  const assessmentRows = [
    ['ana', -110, 72.8], ['ana', -55, 70.6], ['ana', -3, 68.9], ['bruno', -95, 91.2], ['bruno', -12, 88.7],
    ['camila', -70, 64.4], ['camila', -8, 63.1], ['diego', -60, 82.5], ['diego', -5, 81.3],
    ['felipe', -45, 76.1], ['felipe', -4, 77], ['gabriela', -80, 69.3], ['gabriela', -6, 66.8],
  ].map(([key, days, weight_kg]) => ({ student_id: studentByKey.get(key), assessment_date: relativeDate(days), weight_kg })).filter((row) => row.student_id)

  const attendanceRows = []
  const attendancePlan = {
    ana: { present: 10, absent: 1 }, bruno: { present: 8, absent: 1 }, camila: { present: 12, absent: 0 },
    diego: { present: 6, absent: 2 }, elisa: { present: 3, absent: 2 }, felipe: { present: 7, absent: 1 },
    gabriela: { present: 11, absent: 1 }, hugo: { present: 1, absent: 3 },
    isabela: { present: 9, absent: 1 }, joao: { present: 7, absent: 1 }, karina: { present: 10, absent: 0 },
    lucas: { present: 8, absent: 1 }, marcela: { present: 11, absent: 1 }, nicolas: { present: 4, absent: 3 },
    olivia: { present: 9, absent: 0 }, paulo: { present: 8, absent: 2 }, raquel: { present: 10, absent: 1 },
    samuel: { present: 7, absent: 2 }, tatiana: { present: 12, absent: 0 }, victor: { present: 9, absent: 1 },
    yasmin: { present: 10, absent: 0 }, andre: { present: 2, absent: 4 }, beatriz: { present: 8, absent: 1 }, caio: { present: 11, absent: 1 },
  }
  Object.entries(attendancePlan).forEach(([key, totals]) => {
    const statuses = [...Array(totals.present).fill('PRESENTE'), ...Array(totals.absent).fill('AUSENTE')]
    statuses.forEach((status, index) => attendanceRows.push({
      student_id: studentByKey.get(key),
      attendance_date: currentMonthDate(Math.max(1, new Date().getDate() - index)),
      status,
    }))
  })

  const staggeredTimes = ['07:00:00', '08:00:00', '09:00:00', '12:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00']
  const appointmentRows = demoStudents.map((person, index) => {
    if (index < 8) return { student_id: person.student_id, appointment_date: relativeDate(0), start_time: '18:00:00', status: 'CONFIRMADO' }
    const queueIndex = index - 8
    return {
      student_id: person.student_id,
      appointment_date: relativeDate(1 + (queueIndex % 2)),
      start_time: staggeredTimes[Math.floor(queueIndex / 2) % staggeredTimes.length],
      status: 'CONFIRMADO',
    }
  })
  const waitlistRows = demoStudents.slice(8, 14).map((person, index) => ({
    student_id: person.student_id,
    appointment_date: relativeDate(0),
    start_time: '18:00:00',
    position: index + 1,
    status: 'AGUARDANDO',
  }))

  const inserted = {}
  inserted.payments = await insertRows(supabase, 'payments', paymentRows, ['student_id', 'due_date'], warnings)
  inserted.assessments = await insertRows(supabase, 'physical_assessments', assessmentRows, ['student_id', 'assessment_date'], warnings)
  inserted.attendance = await insertRows(supabase, 'attendance', attendanceRows, ['student_id', 'attendance_date'], warnings)
  inserted.appointments = await insertRows(supabase, 'appointments', appointmentRows, ['student_id', 'appointment_date'], warnings)
  inserted.waitlist = await insertRows(supabase, 'waitlist', waitlistRows, ['student_id', 'appointment_date', 'start_time'], warnings)

  return { createdAccounts, totalAccounts: people.length, totalStudents: demoStudents.length, inserted, warnings }
}
