-- Studio Power Fit
-- Plano financeiro do aluno, usado por gestão, relatórios e área do aluno.

begin;

alter table public.students
  add column if not exists payment_plan text;

-- Aproveita o histórico existente para classificar cada aluno antes de
-- aplicar o padrão. A cobrança mais recente é a fonte da migração inicial.
with latest_payment as (
  select distinct on (student_id)
    student_id,
    case
      when upper(coalesce(payment_type, '')) = 'WELLHUB' then 'WELLHUB'
      when upper(coalesce(payment_type, '')) = 'TOTALPASS' then 'TOTALPASS'
      else 'MENSALISTA'
    end as payment_plan
  from public.payments
  where student_id is not null
  order by student_id, due_date desc
)
update public.students as student
set payment_plan = latest_payment.payment_plan
from latest_payment
where student.id = latest_payment.student_id
  and student.payment_plan is null;

update public.students
set payment_plan = 'MENSALISTA'
where payment_plan is null;

alter table public.students
  alter column payment_plan set default 'MENSALISTA',
  alter column payment_plan set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_payment_plan_check'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_payment_plan_check
      check (payment_plan in ('MENSALISTA', 'WELLHUB', 'TOTALPASS'));
  end if;
end;
$$;

create index if not exists idx_students_payment_plan
  on public.students(payment_plan);

comment on column public.students.payment_plan is
  'Plano financeiro atual do aluno: MENSALISTA, WELLHUB ou TOTALPASS.';

commit;
