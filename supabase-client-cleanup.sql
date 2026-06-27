-- FITFYT one-time client data cleanup
-- Run once in Supabase SQL Editor before handing the system to the client.
-- Keeps EMP001/Test Employee and removes old demo/verification transactions.

begin;

do $$
begin
  if to_regclass('public.attendance_records') is not null then
    execute 'delete from public.attendance_records';
  end if;
  if to_regclass('public.payments') is not null then
    execute 'delete from public.payments';
  end if;
  if to_regclass('public.payroll') is not null then
    execute 'delete from public.payroll';
  end if;
  if to_regclass('public.payroll_records') is not null then
    execute 'delete from public.payroll_records';
  end if;
  if to_regclass('public.hikvision_people') is not null then
    execute $sql$
      delete from public.hikvision_people
      where upper(employee_number) <> 'EMP001'
    $sql$;
  end if;
  if to_regclass('public.members') is not null then
    execute $sql$
      delete from public.members
      where upper(id) <> 'EMP001'
        and lower(trim(name)) <> 'test employee'
    $sql$;
    execute $sql$
      update public.members
      set amount_paid = 0,
          total_amount = 0,
          plan = '12 Months Transformation',
          updated_at = now()
      where upper(id) = 'EMP001'
         or lower(trim(name)) = 'test employee'
    $sql$;
  end if;
  if to_regclass('public.staff') is not null then
    execute $sql$
      delete from public.staff where id in ('s1', 's2', 's3', 's4', 's5', 's6')
    $sql$;
  end if;
  if to_regclass('public.leads') is not null then
    execute $sql$
      delete from public.leads where id in ('l1', 'l2', 'l3', 'l4', 'l5')
    $sql$;
  end if;
  if to_regclass('public.branches') is not null then
    execute $sql$
      delete from public.branches where id = 'b2'
    $sql$;
  end if;
end
$$;

commit;
