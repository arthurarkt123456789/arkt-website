-- Migration : privatisation jusqu'à 10 personnes (à exécuter une fois sur la base existante)
alter table rc_bookings drop constraint if exists rc_bookings_seats_check;
alter table rc_bookings add constraint rc_bookings_seats_check check (seats between 1 and 10);

create or replace function rc_availability(p_date date)
returns table (service text, free_total int, max_group int, open_bubbles int, empty_bubbles int)
language sql stable as $$
  select
    u.service,
    coalesce(sum(greatest(u.free, 0)) filter (where u.status = 'open'), 0)::int as free_total,
    case when count(*) filter (where u.status = 'open' and u.used = 0) > 0 then 10
         else coalesce(max(u.free) filter (where u.status = 'open'), 0) end::int as max_group,
    count(*) filter (where u.status = 'open')::int as open_bubbles,
    count(*) filter (where u.status = 'open' and u.used = 0)::int as empty_bubbles
  from rc_slot_usage u
  where u.date = p_date
  group by u.service
  order by u.service;
$$;

create or replace function rc_availability_range(p_from date, p_to date)
returns table (date date, free_total int, max_group int, used_total int)
language sql stable as $$
  select u.date,
    coalesce(sum(greatest(u.free, 0)) filter (where u.status = 'open'), 0)::int,
    case when count(*) filter (where u.status = 'open' and u.used = 0) > 0 then 10
         else coalesce(max(u.free) filter (where u.status = 'open'), 0) end::int,
    coalesce(sum(u.used), 0)::int
  from rc_slot_usage u
  where u.date between p_from and p_to
  group by u.date
  order by u.date;
$$;

create or replace function rc_hold(
  p_date date, p_service text, p_adults int, p_kids int,
  p_name text, p_email text, p_phone text, p_notes text,
  p_amount_cents int, p_hold_minutes int default 30,
  p_source text default 'web', p_status text default 'hold'
)
returns rc_bookings
language plpgsql as $$
declare
  v_seats int := p_adults + p_kids;
  v_slot  rc_slots%rowtype;
  v_row   rc_bookings;
begin
  if v_seats < 1 or v_seats > 10 then
    raise exception 'SEATS_OUT_OF_RANGE';
  end if;

  -- Expire les holds périmés (pas de cron nécessaire)
  update rc_bookings set status = 'expired'
   where status = 'hold' and expires_at <= now();

  -- Verrouille les bulles du service
  perform 1 from rc_slots where date = p_date and service = p_service for update;

  select s.* into v_slot
  from rc_slots s
  join rc_slot_usage u on u.slot_id = s.id
  where s.date = p_date and s.service = p_service and s.status = 'open'
    and ((v_seats >= 8 and u.used = 0) or (v_seats < 8 and u.free >= v_seats))
  order by u.free asc, s.bubble asc
  limit 1;

  if v_slot.id is null then
    raise exception 'NO_CAPACITY';
  end if;

  insert into rc_bookings (slot_id, date, service, bubble, adults, kids, seats,
    name, email, phone, notes, amount_cents, status, source, expires_at, paid_at)
  values (v_slot.id, p_date, p_service, v_slot.bubble, p_adults, p_kids, v_seats,
    p_name, nullif(p_email,''), nullif(p_phone,''), nullif(p_notes,''), p_amount_cents,
    p_status, p_source,
    case when p_status = 'hold' then now() + make_interval(mins => p_hold_minutes) else null end,
    case when p_status = 'manual' then now() else null end)
  returning * into v_row;

  return v_row;
end $$;

