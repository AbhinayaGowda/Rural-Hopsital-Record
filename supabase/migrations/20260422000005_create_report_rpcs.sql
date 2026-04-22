-- ============================================================
-- Wave 3.5: Report RPCs
-- ============================================================

create or replace function public.rpc_report_households_by_location()
returns table (district text, village text, total bigint, active bigint, migrated bigint, dissolved bigint)
language sql stable security definer set search_path = public as $$
  select
    coalesce(d.name, h.district, 'Unclassified') as district,
    coalesce(v.name, h.village,  'Unclassified') as village,
    count(*) as total,
    count(*) filter (where h.status = 'active')    as active,
    count(*) filter (where h.status = 'migrated')  as migrated,
    count(*) filter (where h.status = 'dissolved') as dissolved
  from households h
  left join districts d on d.id = h.district_id
  left join villages  v on v.id = h.village_id
  group by 1, 2 order by total desc;
$$;

create or replace function public.rpc_report_member_demographics()
returns table (age_band text, male bigint, female bigint, other bigint, total bigint)
language sql stable security definer set search_path = public as $$
  with banded as (
    select
      case
        when date_of_birth is null                                  then 'Unknown'
        when extract(year from age(date_of_birth)) < 5              then '0–4'
        when extract(year from age(date_of_birth)) < 15             then '5–14'
        when extract(year from age(date_of_birth)) < 25             then '15–24'
        when extract(year from age(date_of_birth)) < 35             then '25–34'
        when extract(year from age(date_of_birth)) < 50             then '35–49'
        when extract(year from age(date_of_birth)) < 65             then '50–64'
        else '65+'
      end as age_band,
      gender
    from members where status not in ('deceased','migrated')
  )
  select age_band,
    count(*) filter (where gender = 'M') as male,
    count(*) filter (where gender = 'F') as female,
    count(*) filter (where gender = 'O' or gender is null) as other,
    count(*) as total
  from banded group by age_band
  order by case age_band
    when '0–4' then 1 when '5–14' then 2 when '15–24' then 3
    when '25–34' then 4 when '35–49' then 5 when '50–64' then 6
    when '65+' then 7 else 8 end;
$$;

create or replace function public.rpc_report_pregnancies_by_risk()
returns table (risk_level text, status text, total bigint)
language sql stable security definer set search_path = public as $$
  select risk_level, status, count(*) as total
  from pregnancies group by risk_level, status order by risk_level, status;
$$;

create or replace function public.rpc_report_vaccination_coverage()
returns table (vaccine_code text, vaccine_name text, completed bigint, pending bigint, missed bigint, coverage_pct numeric)
language sql stable security definer set search_path = public as $$
  select v.vaccine_code, coalesce(vc.name, v.vaccine_code) as vaccine_name,
    count(*) filter (where v.status = 'completed') as completed,
    count(*) filter (where v.status = 'pending')   as pending,
    count(*) filter (where v.status = 'missed')    as missed,
    round(count(*) filter (where v.status = 'completed') * 100.0 / nullif(count(*),0), 1) as coverage_pct
  from vaccinations v left join vaccine_catalog vc on vc.code = v.vaccine_code
  group by v.vaccine_code, vc.name order by completed desc;
$$;

create or replace function public.rpc_report_disease_prevalence(p_days int default 30)
returns table (disease_name text, condition_code text, category text, case_count bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(mc.name, dh.disease_name) as disease_name,
    mc.code as condition_code, mc.category as category, count(*) as case_count
  from disease_history dh left join medical_conditions mc on mc.id = dh.condition_id
  where dh.created_at >= now() - (p_days || ' days')::interval
  group by 1,2,3 order by case_count desc limit 20;
$$;

create or replace function public.rpc_report_deaths_migrations(p_days int default 30)
returns table (event_type text, count bigint)
language sql stable security definer set search_path = public as $$
  select 'deaths' as event_type, count(*) from members
    where status = 'deceased' and deceased_date >= current_date - p_days
  union all
  select 'member_migrations', count(*) from members
    where status = 'migrated' and migrated_date >= current_date - p_days
  union all
  select 'household_migrations', count(*) from households
    where status = 'migrated' and migrated_at >= now() - (p_days || ' days')::interval;
$$;
