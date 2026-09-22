-- Connect the Admin weekly hours to student booking capacity and assignment.
create or replace function public.teacher_has_booking_hours(
  p_teacher_id uuid, p_date date, p_start_time time, p_end_time time
) returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.teachers t
    where t.id = p_teacher_id and t.status = 'ATIVO'
    and (
      exists (
        select 1 from public.employees e
        join public.employee_work_hours h on h.employee_id = e.id
        where e.profile_id = t.profile_id and e.status = 'ATIVO'
          and h.active and h.weekday = extract(dow from p_date)::smallint
          and p_start_time >= h.start_time and p_end_time <= h.end_time
      )
      or (
        not exists (select 1 from public.employees e where e.profile_id = t.profile_id)
        and exists (
          select 1 from public.teacher_availability a
          where a.teacher_id = t.id and a.active
            and a.weekday = extract(dow from p_date)::smallint
            and p_start_time >= a.start_time and p_end_time <= a.end_time
        )
      )
    )
  );
$$;
revoke all on function public.teacher_has_booking_hours(uuid,date,time,time) from public, anon, authenticated;

create or replace function public.get_slot_capacity(
  p_date date, p_start_time time, p_end_time time default null
) returns integer language sql stable security definer set search_path = public
as $$
  select count(*)::integer * coalesce(
    (select capacity_per_teacher from public.gym_settings limit 1), 4)
  from public.teachers t
  where public.teacher_has_booking_hours(t.id,p_date,p_start_time,
    coalesce(p_end_time,(p_start_time + interval '1 hour')::time))
    and public.teacher_is_working_exception_free(t.id,p_date,p_start_time,
    coalesce(p_end_time,(p_start_time + interval '1 hour')::time));
$$;

create or replace function public.teacher_is_available_for_slot(
  p_teacher_id uuid, p_date date, p_start_time time, p_end_time time
) returns boolean language sql stable security definer set search_path = public
as $$
  select public.teacher_has_booking_hours(p_teacher_id,p_date,p_start_time,p_end_time)
    and public.teacher_is_working_exception_free(p_teacher_id,p_date,p_start_time,p_end_time)
    and public.teacher_slot_occupancy(p_teacher_id,p_date,p_start_time)
      < coalesce((select capacity_per_teacher from public.gym_settings limit 1),4);
$$;

create or replace function public.get_student_booking_slots(
  p_start_date date default current_date
) returns table (
  appointment_date date, start_time time, capacity integer, occupied integer,
  available integer, waitlist_count integer, is_past boolean
) language sql stable security definer set search_path = public
as $$
  with dates as (
    select (p_start_date + offs)::date as appointment_date
    from generate_series(0,2) as offs
  ), times as (
    select make_time(h,0,0) as start_time from generate_series(6,20) as h
  )
  select d.appointment_date,t.start_time,
    public.get_slot_capacity(d.appointment_date,t.start_time),
    public.get_slot_occupancy(d.appointment_date,t.start_time),
    public.get_slot_available(d.appointment_date,t.start_time),
    (select count(*)::integer from public.waitlist w
      where w.appointment_date=d.appointment_date and w.start_time=t.start_time
        and w.status in ('AGUARDANDO','CONVOCADO')),
    (d.appointment_date+t.start_time) <= (now() at time zone 'America/Sao_Paulo')
  from dates d cross join times t
  order by d.appointment_date,t.start_time;
$$;
revoke all on function public.get_student_booking_slots(date) from public, anon;
grant execute on function public.get_student_booking_slots(date) to authenticated;
notify pgrst, 'reload schema';

