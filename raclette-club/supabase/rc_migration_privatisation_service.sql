-- Migration : privatisation d'un ou plusieurs services complets (5 bulles) par un seul client,
-- avec un seul lien de paiement. À exécuter une fois dans Supabase > SQL Editor > Run.

alter table rc_bookings add column if not exists group_id uuid;
alter table rc_bookings add column if not exists exclusive boolean not null default false;
create index if not exists rc_bookings_group_idx on rc_bookings(group_id);

-- Une bulle portant une réservation "exclusive" compte comme pleine, quel que soit le nombre de convives.
create or replace view rc_slot_usage as
select
  s.id as slot_id, s.date, s.service, s.bubble, s.capacity, s.status,
  u.used,
  (s.capacity - u.used)::int as free
from rc_slots s
cross join lateral (
  select (case when coalesce(bool_or(b.exclusive), false)
               then greatest(coalesce(sum(b.seats), 0), s.capacity)
               else coalesce(sum(b.seats), 0) end)::int as used
  from rc_bookings b
  where b.slot_id = s.id
    and (b.status in ('paid','manual') or (b.status = 'hold' and b.expires_at > now()))
) u;

-- Pose un groupe de réservations : toutes les bulles de chaque service demandé, même date.
-- Exige que chaque bulle soit ouverte et vide. Le montant total est porté par la première ligne.
create or replace function rc_hold_group(
  p_date date, p_services text[], p_adults int, p_kids int,
  p_name text, p_email text, p_phone text, p_notes text,
  p_amount_cents int, p_hold_minutes int default 1440,
  p_source text default 'admin', p_status text default 'hold'
)
returns setof rc_bookings
language plpgsql as $$
declare
  v_group  uuid := gen_random_uuid();
  v_n      int;
  v_total  int := p_adults + p_kids;
  v_i      int := 0;
  v_busy   int;
  v_slot   rc_slots%rowtype;
  v_seats  int; v_ad int; v_kd int;
  v_rem_ad int := p_adults;
begin
  if p_services is null or array_length(p_services, 1) is null then
    raise exception 'NO_SERVICE';
  end if;

  update rc_bookings set status = 'expired'
   where status = 'hold' and expires_at <= now();

  perform 1 from rc_slots where date = p_date and service = any(p_services) for update;

  select count(*) into v_n from rc_slots where date = p_date and service = any(p_services);
  if v_n <> 5 * array_length(p_services, 1) then
    raise exception 'NO_CAPACITY';
  end if;
  if v_total < v_n then raise exception 'TOO_FEW'; end if;
  if v_total > 10 * v_n then raise exception 'TOO_MANY'; end if;

  select count(*) into v_busy
  from rc_slot_usage u
  where u.date = p_date and u.service = any(p_services)
    and (u.status <> 'open' or u.used > 0);
  if v_busy > 0 then
    raise exception 'NO_CAPACITY';
  end if;

  for v_slot in
    select s.* from rc_slots s
    where s.date = p_date and s.service = any(p_services)
    order by s.service, s.bubble
  loop
    v_i := v_i + 1;
    v_seats := v_total / v_n + case when v_i <= v_total % v_n then 1 else 0 end;
    v_ad := least(v_rem_ad, v_seats);
    v_kd := v_seats - v_ad;
    v_rem_ad := v_rem_ad - v_ad;

    return query
      insert into rc_bookings (slot_id, date, service, bubble, adults, kids, seats,
        name, email, phone, notes, amount_cents, status, source, expires_at, paid_at, group_id, exclusive)
      values (v_slot.id, p_date, v_slot.service, v_slot.bubble, v_ad, v_kd, v_seats,
        p_name, nullif(p_email, ''), nullif(p_phone, ''), nullif(p_notes, ''),
        case when v_i = 1 then p_amount_cents else 0 end,
        p_status, p_source,
        case when p_status = 'hold' then now() + make_interval(mins => p_hold_minutes) else null end,
        case when p_status = 'manual' then now() else null end,
        v_group, true)
      returning *;
  end loop;
end $$;
