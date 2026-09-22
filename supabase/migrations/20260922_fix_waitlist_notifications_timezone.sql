CREATE OR REPLACE FUNCTION public.create_appointment(p_student_id uuid, p_date date, p_start_time time without time zone, p_source appointment_source DEFAULT 'ALUNO'::appointment_source)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_end_time time;
  v_capacity integer;
  v_occupancy integer;
  v_teacher_id uuid;
  v_role public.user_role;
begin
  select role into v_role
  from public.profiles
  where id = auth.uid();

  if p_source = 'ALUNO' then
    if public.get_student_id_for_user(auth.uid()) <> p_student_id then
      raise exception 'Aluno não pode agendar para outro aluno.';
    end if;
  else
    if not public.has_permission('appointments.create') then
      raise exception 'Usuário sem permissão para agendar em nome de aluno.';
    end if;
  end if;

  if not exists (
    select 1 from public.students
    where id = p_student_id and status = 'ATIVO'
  ) then
    raise exception 'Aluno não está ativo.';
  end if;

  if public.student_is_overdue(p_student_id) then
    raise exception 'Aluno inadimplente. Novo agendamento bloqueado.';
  end if;

  v_end_time := p_start_time + interval '1 hour';

  if (p_date + p_start_time) <= (now() at time zone 'America/Sao_Paulo') then
    raise exception 'Não é possível criar agendamento para horário passado.';
  end if;

  if p_start_time < time '06:00' or v_end_time > time '21:00' then
    raise exception 'Horário fora do funcionamento da academia.';
  end if;

  if exists (
    select 1
    from public.appointments
    where student_id = p_student_id
      and appointment_date = p_date
      and start_time = p_start_time
      and status = 'CONFIRMADO'
  ) then
    raise exception 'Aluno já possui agendamento neste horário.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_date::text || '|' || p_start_time::text,
      0
    )
  );

  v_capacity := public.get_slot_capacity(p_date,p_start_time,v_end_time);

  if v_capacity <= 0 then
    raise exception 'Não há professores disponíveis neste horário.';
  end if;

  v_occupancy := public.get_slot_occupancy(p_date,p_start_time);

  if v_occupancy >= v_capacity then
    raise exception 'Horário lotado. Aluno deve entrar na lista de espera.';
  end if;

  select t.id
  into v_teacher_id
  from public.teachers t
  where t.status = 'ATIVO'
    and public.teacher_is_available_for_slot(t.id,p_date,p_start_time,v_end_time)
    and public.teacher_is_working_exception_free(t.id,p_date,p_start_time,v_end_time)
  order by
    (
      select count(*)
      from public.appointments hist
      where hist.teacher_id = t.id
        and hist.student_id = p_student_id
        and hist.status in ('CONFIRMADO','REALIZADO')
    ) desc,
    public.teacher_slot_occupancy(t.id,p_date,p_start_time) asc,
    t.id
  limit 1;

  if v_teacher_id is null then
    raise exception 'Não foi possível atribuir professor ao agendamento.';
  end if;

  insert into public.appointments (
    student_id,
    teacher_id,
    appointment_date,
    start_time,
    end_time,
    status,
    source
  )
  values (
    p_student_id,
    v_teacher_id,
    p_date,
    p_start_time,
    v_end_time,
    'CONFIRMADO',
    p_source
  )
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.leave_waitlist(p_waitlist_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_student_id uuid;
  v_date date;
  v_time time;
  v_position integer;
begin
  select student_id, appointment_date, start_time, position
  into v_student_id, v_date, v_time, v_position
  from public.waitlist
  where id = p_waitlist_id
    and status in ('AGUARDANDO','CONVOCADO');

  if v_student_id is null then
    raise exception 'Registro de lista de espera não encontrado ou não está aguardando.';
  end if;

  if public.get_student_id_for_user(auth.uid()) <> v_student_id
     and not public.has_permission('waitlist.manage') then
    raise exception 'Sem permissão.';
  end if;

  update public.waitlist
  set status = 'REMOVIDO',
      resolved_at = now()
  where id = p_waitlist_id;

  update public.waitlist w
  set position = w.position - 1
  where w.appointment_date = v_date
    and w.start_time = v_time
    and w.status in ('AGUARDANDO','CONVOCADO')
    and w.position > v_position;

  return true;
end;
$function$;

-- An internal notifier shared by schedule changes and cancellations.
create or replace function public.notify_open_waitlist_slots()
returns void language plpgsql security definer set search_path=public as $$
declare w record;
begin
  perform pg_advisory_xact_lock(hashtextextended('waitlist-open-slot-notifications',0));
  for w in
    select distinct on (appointment_date,start_time) id,appointment_date,start_time
    from public.waitlist
    where status in ('AGUARDANDO','CONVOCADO')
      and (appointment_date+start_time) > (now() at time zone 'America/Sao_Paulo')
      and public.get_slot_available(appointment_date,start_time)>0
    order by appointment_date,start_time,position,created_at,id
  loop
    insert into public.notifications(user_id,type,title,message,reference_type,reference_id)
    select p.id,'VAGA_LIBERADA','Vaga disponível para lista de espera',
      'Há vaga às '||to_char(w.start_time,'HH24:MI')||' de '||
      to_char(w.appointment_date,'DD/MM/YYYY')||'. Consulte a lista de espera.',
      'WAITLIST',w.id
    from public.profiles p
    where p.role='RECEPCAO' and p.active
      and not exists (
        select 1 from public.notifications n
        where n.user_id=p.id and n.type='VAGA_LIBERADA'
          and n.reference_type='WAITLIST' and n.reference_id=w.id and n.read_at is null
      );
  end loop;
end $$;
revoke all on function public.notify_open_waitlist_slots() from public,anon,authenticated;

create or replace function public.notify_waitlist_after_capacity_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.notify_open_waitlist_slots();
  return null;
end $$;
revoke all on function public.notify_waitlist_after_capacity_change() from public,anon,authenticated;

create trigger trg_work_hours_waitlist_notice
after insert or update or delete on public.employee_work_hours
for each statement execute function public.notify_waitlist_after_capacity_change();
create trigger trg_teachers_waitlist_notice
after insert or update or delete on public.teachers
for each statement execute function public.notify_waitlist_after_capacity_change();
create trigger trg_employee_schedules_waitlist_notice
after insert or update or delete on public.employee_schedules
for each statement execute function public.notify_waitlist_after_capacity_change();
create trigger trg_employees_waitlist_notice
after update on public.employees
for each statement execute function public.notify_waitlist_after_capacity_change();
create trigger trg_gym_settings_waitlist_notice
after update on public.gym_settings
for each statement execute function public.notify_waitlist_after_capacity_change();

select public.notify_open_waitlist_slots();
notify pgrst,'reload schema';
