-- Super-admin only RPC that exposes pg_stat_statements safely. We don't
-- create a general exec_sql (too broad an attack surface); this returns
-- ranked slow queries and nothing else.

create or replace function public.fn_db_slow_queries(p_limit int default 10, p_min_mean_ms numeric default 5)
returns table(
  query text,
  calls bigint,
  total_exec_ms double precision,
  mean_exec_ms double precision,
  rows bigint
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  return query
    select
      regexp_replace(coalesce(s.query, ''), '\s+', ' ', 'g') as query,
      s.calls,
      s.total_exec_time as total_exec_ms,
      s.mean_exec_time as mean_exec_ms,
      s.rows
    from extensions.pg_stat_statements s
    where s.mean_exec_time >= coalesce(p_min_mean_ms, 0)
      and s.query is not null
      and s.query not like '%pg_stat_statements%'
    order by s.mean_exec_time desc
    limit greatest(1, least(p_limit, 50));
end
$$;

revoke execute on function public.fn_db_slow_queries(int, numeric) from public, anon;
grant execute on function public.fn_db_slow_queries(int, numeric) to authenticated;

comment on function public.fn_db_slow_queries is
  'Returns top slow queries from pg_stat_statements. Super-admin only (checked inside).';
;
