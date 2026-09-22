-- Recurring weekly work hours for Studio Power Fit employees.
-- employee_schedules remains reserved for date-specific shifts/exceptions.

create table if not exists public.employee_work_hours (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time without time zone not null,
  end_time time without time zone not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint employee_work_hours_valid_period check (start_time < end_time),
  constraint employee_work_hours_employee_weekday_unique unique (employee_id, weekday)
);

create index if not exists employee_work_hours_employee_id_idx
  on public.employee_work_hours(employee_id);

alter table public.employee_work_hours enable row level security;

drop policy if exists "employee_work_hours_authenticated_select" on public.employee_work_hours;
create policy "employee_work_hours_authenticated_select"
  on public.employee_work_hours for select
  to authenticated
  using (true);

drop policy if exists "employee_work_hours_authenticated_insert" on public.employee_work_hours;
create policy "employee_work_hours_authenticated_insert"
  on public.employee_work_hours for insert
  to authenticated
  with check (true);

drop policy if exists "employee_work_hours_authenticated_update" on public.employee_work_hours;
create policy "employee_work_hours_authenticated_update"
  on public.employee_work_hours for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "employee_work_hours_authenticated_delete" on public.employee_work_hours;
create policy "employee_work_hours_authenticated_delete"
  on public.employee_work_hours for delete
  to authenticated
  using (true);
