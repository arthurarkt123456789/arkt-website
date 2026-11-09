-- ============================================================
-- La Meulerie Raclette Club : schéma de réservation
-- À coller tel quel dans Supabase > SQL Editor > Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Créneaux : 1 ligne par (date, service, bulle) ----------
create table if not exists rc_slots (
  id          bigserial primary key,
  date        date not null,
  service     text not null check (service in ('12:00','14:00','19:00','21:00')),
  bubble      smallint not null check (bubble between 1 and 5),
  capacity    smallint not null default 8,
  status      text not null default 'open' check (status in ('open','blocked')),
  unique (date, service, bubble)
);

-- ---------- Réservations ----------
create table if not exists rc_bookings (
  id                    uuid primary key default gen_random_uuid(),
  slot_id               bigint not null references rc_slots(id),
  date                  date not null,
  service               text not null,
  bubble                smallint not null,
  adults                smallint not null default 0 check (adults >= 0),
  kids                  smallint not null default 0 check (kids >= 0),
  seats                 smallint not null check (seats between 1 and 8),
  name                  text not null,
  email                 text,
  phone                 text,
  notes                 text,
  amount_cents          integer not null default 0,
  status                text not null check (status in ('hold','paid','manual','cancelled','expired')),
  source                text not null default 'web' check (source in ('web','admin')),
  stripe_session_id     text unique,
  stripe_payment_intent text,
  refund_id             text,
  cancel_token          text not null default encode(gen_random_bytes(16),'hex'),
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz,
  cancelled_at          timestamptz
);

create index if not exists rc_bookings_slot_idx on rc_bookings(slot_id);
create index if not exists rc_bookings_date_idx on rc_bookings(date);
create index if not exists rc_bookings_email_idx on rc_bookings(email);

-- ---------- Génération des créneaux : 27/11 -> 30/12/2026 ----------
-- Exceptions : 24/12 soir (19h, 21h) et 25/12 toute la journée.
insert into rc_slots (date, service, bubble)
select d::date, s, b
from generate_series('2026-11-27'::date, '2026-12-30'::date, interval '1 day') d
cross join unnest(array['12:00','14:00','19:00','21:00']) s
cross join generate_series(1,5) b
where not (d::date = '2026-12-25')
  and not (d::date = '2026-12-24' and s in ('19:00','21:00'))
on conflict do nothing;

-- ---------- Places occupées par créneau (holds actifs + payés + manuels) ----------
create or replace view rc_slot_usage as
select
  s.id as slot_id, s.date, s.service, s.bubble, s.capacity, s.status,
  coalesce(sum(b.seats) filter (
    where b.status in ('paid','manual')
       or (b.status = 'hold' and b.expires_at > now())
  ), 0)::int as used,
  s.capacity - coalesce(sum(b.seats) filter (
    where b.status in ('paid','manual')
       or (b.status = 'hold' and b.expires_at > now())
  ), 0)::int as free
from rc_slots s
left join rc_bookings b on b.slot_id = s.id
group by s.id;

-- ---------- Disponibilité d'une journée (appelée par le front) ----------
-- Retourne, par service : places libres totales, plus grand groupe plaçable,
-- nombre de bulles ouvertes.
create or replace function rc_availability(p_date date)
returns table (service text, free_total int, max_group int, open_bubbles int, empty_bubbles int)
language sql stable as $$
  select
    u.service,
    coalesce(sum(u.free) filter (where u.status = 'open'), 0)::int as free_total,
    coalesce(max(u.free) filter (where u.status = 'open'), 0)::int as max_group,
    count(*) filter (where u.status = 'open')::int as open_bubbles,
    count(*) filter (where u.status = 'open' and u.free = u.capacity)::int as empty_bubbles
  from rc_slot_usage u
  where u.date = p_date
  group by u.service
  order by u.service;
$$;

-- ---------- Disponibilité sur toute la période (pour colorer le calendrier) ----------
create or replace function rc_availability_range(p_from date, p_to date)
returns table (date date, free_total int, max_group int, used_total int)
language sql stable as $$
  select u.date,
    coalesce(sum(u.free) filter (where u.status = 'open'), 0)::int,
    coalesce(max(u.free) filter (where u.status = 'open'), 0)::int,
    coalesce(sum(u.used), 0)::int
  from rc_slot_usage u
  where u.date between p_from and p_to
  group by u.date
  order by u.date;
$$;

-- ---------- Pose d'un hold (transactionnel, verrouille les 5 bulles du service) ----------
-- Choisit la bulle ouverte la plus remplie pouvant accueillir le groupe.
-- 8 places = bulle vide obligatoire (privatisation).
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
  if v_seats < 1 or v_seats > 8 then
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
    and u.free >= v_seats
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

-- ---------- Vue admin d'une journée ----------
create or replace function rc_day(p_date date)
returns json language sql stable as $$
  select json_build_object(
    'slots', (select coalesce(json_agg(row_to_json(u) order by u.service, u.bubble), '[]'::json)
              from rc_slot_usage u where u.date = p_date),
    'bookings', (select coalesce(json_agg(row_to_json(b) order by b.service, b.bubble, b.created_at), '[]'::json)
                 from rc_bookings b
                 where b.date = p_date
                   and (b.status in ('paid','manual','cancelled')
                        or (b.status = 'hold' and b.expires_at > now())))
  );
$$;

-- ---------- Sécurité : tout passe par les fonctions Netlify (clé service) ----------
alter table rc_slots    enable row level security;
alter table rc_bookings enable row level security;
-- Aucune policy : anon et authenticated n'ont aucun accès direct.
