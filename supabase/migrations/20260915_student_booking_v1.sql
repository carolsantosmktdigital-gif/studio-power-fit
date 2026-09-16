-- Studio Power Fit
-- Perfil ALUNO: janela de agendamento da V1
-- Regras cobertas:
-- 1) Hoje / amanhã / depois de amanhã
-- 2) Capacidade = professores disponíveis x 4
-- 3) 1 agendamento CONFIRMADO por aluno por dia
-- 4) Total da lista de espera sem expor dados de outros alunos
-- 5) Horários de 06:00 a 20:00 para sessões de 1h

begin;

-- Impede dois agendamentos confirmados do mesmo aluno no mesmo dia.
-- Primeiro interrompe com mensagem clara caso já existam duplicidades históricas.
do $$
begin
  if exists (
    select 1
    from public.appointments
    where status = 'CONFIRMADO'
    group by student_id, appointment_date
    having count(*) > 1
  ) then
    raise exception
      'Existem alunos com mais de um agendamento CONFIRMADO no mesmo dia. Regularize os dados antes de aplicar a regra de 1 treino por dia.';
  end if;
end;
$$;

create unique index if not exists ux_appointments_student_active_day
on public.appointments(student_id, appointment_date)
where status = 'CONFIRMADO';

-- Retorna toda a janela de agendamento do aluno em uma única chamada.
-- Não expõe professor nem dados de outros alunos.
create or replace function public.get_student_booking_slots(
  p_start_date date default current_date
)
returns table (
  appointment_date date,
  start_time time,
  capacity integer,
  occupied integer,
  available integer,
  waitlist_count integer,
  is_past boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with dates as (
    select (p_start_date + offs)::date as appointment_date
    from generate_series(0, 2) as offs
  ),
  times as (
    select make_time(hour_value, 0, 0) as start_time
    from generate_series(6, 20) as hour_value
  )
  select
    d.appointment_date,
    t.start_time,
    public.get_slot_capacity(d.appointment_date, t.start_time)::integer as capacity,
    public.get_slot_occupancy(d.appointment_date, t.start_time)::integer as occupied,
    public.get_slot_available(d.appointment_date, t.start_time)::integer as available,
    (
      select count(*)::integer
      from public.waitlist w
      where w.appointment_date = d.appointment_date
        and w.start_time = t.start_time
        and w.status in ('AGUARDANDO', 'CONVOCADO')
    ) as waitlist_count,
    (
      (d.appointment_date + t.start_time)
      <= (now() at time zone 'America/Sao_Paulo')
    ) as is_past
  from dates d
  cross join times t
  order by d.appointment_date, t.start_time;
$$;

revoke all on function public.get_student_booking_slots(date) from public;
grant execute on function public.get_student_booking_slots(date) to authenticated;

commit;
