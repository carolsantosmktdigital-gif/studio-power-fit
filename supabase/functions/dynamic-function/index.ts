import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return Response.json(
      { error: 'Sessão não encontrada.' },
      { status: 401, headers: corsHeaders },
    )
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const adminClient = createClient(url, serviceKey)

  const { data: { user: caller } } = await callerClient.auth.getUser()

  if (!caller) {
    return Response.json(
      { error: 'Sessão inválida.' },
      { status: 401, headers: corsHeaders },
    )
  }

  const body = await request.json()
  const role = String(body.role || 'ALUNO')
  const action = String(body.action || 'create')

  const { data: callerProfile, error: profileLookupError } = await callerClient
    .from('profiles')
    .select('role, active')
    .eq('id', caller.id)
    .single()

  if (profileLookupError) {
    return Response.json(
      { error: `Não foi possível validar o perfil: ${profileLookupError.message}` },
      { status: 403, headers: corsHeaders },
    )
  }

  const callerRole = String(callerProfile?.role || '').toUpperCase()

  const receptionCreatesStudent =
    callerRole === 'RECEPCAO' &&
    action === 'create' &&
    role === 'ALUNO'

  if (
    callerProfile?.active === false ||
    (callerRole !== 'ADMIN' && !receptionCreatesStudent)
  ) {
    return Response.json(
      { error: 'Você não tem permissão para realizar esta ação.' },
      { status: 403, headers: corsHeaders },
    )
  }

  const fullName = String(body.full_name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const phone = String(body.phone || '').trim() || null
  const position = String(body.position || '').trim()

  if (
    !fullName ||
    !email ||
    password.length < 8 ||
    !['ALUNO', 'RECEPCAO', 'PROFESSOR'].includes(role)
  ) {
    return Response.json(
      { error: 'Preencha nome, e-mail, senha de ao menos 8 caracteres e perfil.' },
      { status: 400, headers: corsHeaders },
    )
  }

  // Validate the weekly schedule before creating an authentication account.
  const workSchedule = Array.isArray(body.work_schedule) ? body.work_schedule : []
  const scheduleRows = []
  for (const day of workSchedule) {
    if (day.active === false) continue
    const weekday = Number(day.weekday)
    for (const period of (Array.isArray(day.periods) ? day.periods : [])) {
      const start = String(period.start_time || '')
      const end = String(period.end_time || '')
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
          !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(start) ||
          !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(end) ||
          start.slice(0, 5) >= end.slice(0, 5)) {
        return Response.json({ error: 'Informe dias e horários válidos para o expediente.' },
          { status: 400, headers: corsHeaders })
      }
      scheduleRows.push({ weekday, start_time: start, end_time: end, active: true })
    }
  }
  if (role === 'PROFESSOR' && scheduleRows.length === 0) {
    return Response.json({ error: 'Informe pelo menos um período de expediente para o professor.' },
      { status: 400, headers: corsHeaders })
  }
  if (new Set(scheduleRows.map(row => row.weekday)).size !== scheduleRows.length) {
    return Response.json({ error: 'Informe um período por dia para o expediente.' },
      { status: 400, headers: corsHeaders })
  }

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    })

  if (createError || !created.user) {
    return Response.json(
      { error: createError?.message || 'Não foi possível criar a conta.' },
      { status: 400, headers: corsHeaders },
    )
  }

  const profileId = created.user.id

  const { error: finalizeError } = await adminClient.rpc(
    'complete_admin_created_account',
    {
      p_profile_id: profileId,
      p_role: role,
      p_position: position || null,
    },
  )

  if (finalizeError) {
    return Response.json(
      { error: finalizeError.message },
      { status: 400, headers: corsHeaders },
    )
  }

  if (role !== 'ALUNO' && scheduleRows.length) {
    const { data: employee, error: employeeError } = await adminClient
      .from('employees').select('id').eq('profile_id', profileId).single()
    if (employeeError || !employee) {
      return Response.json({ error: 'Conta criada, mas não foi possível localizar o funcionário para salvar o expediente.' },
        { status: 400, headers: corsHeaders })
    }
    const { error: hoursError } = await adminClient.from('employee_work_hours')
      .insert(scheduleRows.map(row => ({ ...row, employee_id: employee.id })))
    if (hoursError) {
      return Response.json({ error: 'Conta criada, mas o expediente não foi salvo. Edite o funcionário para concluir: ' + hoursError.message },
        { status: 400, headers: corsHeaders })
    }
  }

  return Response.json(
    { id: profileId, message: 'Acesso criado com sucesso.' },
    { headers: corsHeaders },
  )
})
