import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const profileFields = (body: Record<string, unknown>) => ({
  full_name: String(body.full_name || '').trim(),
  email: String(body.email || '').trim().toLowerCase(),
  phone: String(body.phone || '').trim() || null,
  notification_phone: String(body.notification_phone || '').trim() || null,
  cpf: String(body.cpf || '').trim() || null,
  birth_date: body.birth_date || null,
  address_zip_code: String(body.address_zip_code || '').trim() || null,
  address_street: String(body.address_street || '').trim() || null,
  address_number: String(body.address_number || '').trim() || null,
  address_complement: String(body.address_complement || '').trim() || null,
  address_district: String(body.address_district || '').trim() || null,
  address_city: String(body.address_city || '').trim() || null,
  address_state: String(body.address_state || '').trim().toUpperCase() || null,
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return Response.json({ error: 'Sessão não encontrada.' }, { status: 401, headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const adminClient = createClient(url, serviceKey)
  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return Response.json({ error: 'Sessão inválida.' }, { status: 401, headers: corsHeaders })

  const body = await request.json()
  const action = String(body.action || 'create')
  const userId = String(body.user_id || body.profile_id || '')
  const requestedRole = String(body.role || 'ALUNO')
  const { data: callerProfile } = await callerClient.from('profiles').select('role, active').eq('id', caller.id).single()
  const callerRole = String(callerProfile?.role || '').toUpperCase()
  const receptionCreatesStudent = callerRole === 'RECEPCAO' && action === 'create' && requestedRole === 'ALUNO'
  if (callerProfile?.active === false || (callerRole !== 'ADMIN' && !receptionCreatesStudent)) {
    return Response.json({ error: 'Você não tem permissão para realizar esta ação.' }, { status: 403, headers: corsHeaders })
  }

  if (action === 'delete') {
    if (!userId || userId === caller.id) return Response.json({ error: 'Não é permitido excluir a própria conta.' }, { status: 400, headers: corsHeaders })
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
    return Response.json({ message: 'Conta excluída.' }, { headers: corsHeaders })
  }

  if (action === 'reset_password') {
    const password = String(body.password || '')
    if (!userId || password.length < 8) return Response.json({ error: 'Informe uma nova senha com ao menos 8 caracteres.' }, { status: 400, headers: corsHeaders })
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
    await adminClient.from('profiles').update({ must_change_password: true }).eq('id', userId)
    return Response.json({ message: 'Senha redefinida.' }, { headers: corsHeaders })
  }

  const fields = profileFields(body)
  if (!fields.full_name || !fields.email) return Response.json({ error: 'Preencha nome e e-mail.' }, { status: 400, headers: corsHeaders })

  if (action === 'update') {
    if (!userId) return Response.json({ error: 'Usuário não encontrado.' }, { status: 400, headers: corsHeaders })
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, { email: fields.email, user_metadata: { full_name: fields.full_name, phone: fields.phone } })
    if (authError) return Response.json({ error: authError.message }, { status: 400, headers: corsHeaders })
    const { error: profileError } = await adminClient.from('profiles').update(fields).eq('id', userId)
    if (profileError) return Response.json({ error: profileError.message }, { status: 400, headers: corsHeaders })
    if (body.employee_id) {
      const { error } = await adminClient.from('employees').update({ position: body.position, hire_date: body.hire_date || null, employment_type: body.employment_type || null, notes: body.notes || null, status: body.status || 'ATIVO' }).eq('id', body.employee_id)
      if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
    }
    return Response.json({ message: 'Dados atualizados.' }, { headers: corsHeaders })
  }

  const password = String(body.password || '')
  const role = requestedRole
  if (password.length < 8 || !['ALUNO', 'RECEPCAO', 'PROFESSOR'].includes(role)) return Response.json({ error: 'Preencha senha de ao menos 8 caracteres e perfil.' }, { status: 400, headers: corsHeaders })
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email: fields.email, password, email_confirm: true, user_metadata: { full_name: fields.full_name, phone: fields.phone } })
  if (createError || !created.user) return Response.json({ error: createError?.message || 'Não foi possível criar a conta.' }, { status: 400, headers: corsHeaders })

  const profileId = created.user.id
  const { error: profileError } = await adminClient.from('profiles').update({ ...fields, role, active: true, must_change_password: true }).eq('id', profileId)
  if (profileError) return Response.json({ error: profileError.message }, { status: 400, headers: corsHeaders })
  if (role === 'ALUNO') {
    const { error } = await adminClient.from('students').insert({ profile_id: profileId, status: 'ATIVO', payment_plan: body.payment_plan || 'MENSALISTA' })
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
  } else {
    const { data: employee, error } = await adminClient.from('employees').insert({ profile_id: profileId, position: body.position || role, hire_date: body.hire_date || null, employment_type: body.employment_type || null, notes: body.notes || null, status: 'ATIVO' }).select('id').single()
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders })
    if (role === 'PROFESSOR') {
      const { error: teacherError } = await adminClient.from('teachers').insert({ profile_id: profileId, status: 'ATIVO' })
      if (teacherError) return Response.json({ error: teacherError.message }, { status: 400, headers: corsHeaders })
    }
  }
  return Response.json({ id: profileId, message: 'Acesso criado com sucesso.' }, { headers: corsHeaders })
})
