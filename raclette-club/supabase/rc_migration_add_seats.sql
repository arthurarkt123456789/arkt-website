-- Migration : ajout de participants à une réservation existante (complément payé via lien).
alter table rc_bookings add column if not exists parent_id uuid references rc_bookings(id);
create index if not exists rc_bookings_parent_idx on rc_bookings(parent_id);

-- Crée un complément dans la même bulle que la réservation d'origine.
-- Règle : la famille (origine + compléments actifs) peut aller jusqu'à 8 avec d'autres convives dans la bulle,
-- et jusqu'à 10 si la bulle n'est occupée que par cette famille (elle devient alors exclusive).
create or replace function rc_add_seats(
  p_booking_id uuid, p_adults int, p_kids int, p_amount_cents int, p_hold_minutes int default 1440
)
returns rc_bookings
language plpgsql as $$
declare
  v_parent rc_bookings%rowtype;
  v_slot   rc_slots%rowtype;
  v_seats  int := p_adults + p_kids;
  v_family int; v_others int; v_new rc_bookings%rowtype;
begin
  if v_seats < 1 then raise exception 'NO_SEATS'; end if;
  select * into v_parent from rc_bookings where id = p_booking_id;
  if not found or v_parent.status not in ('paid','manual') then raise exception 'NOT_ACTIVE'; end if;
  if v_parent.group_id is not null then raise exception 'IS_GROUP'; end if;

  update rc_bookings set status = 'expired' where status = 'hold' and expires_at <= now();
  select * into v_slot from rc_slots where id = v_parent.slot_id for update;
  if v_slot.status <> 'open' then raise exception 'NO_CAPACITY'; end if;

  select coalesce(sum(seats),0) into v_family from rc_bookings b
   where b.slot_id = v_slot.id and (b.id = p_booking_id or b.parent_id = p_booking_id)
     and (b.status in ('paid','manual') or (b.status = 'hold' and b.expires_at > now()));
  select coalesce(sum(seats),0) into v_others from rc_bookings b
   where b.slot_id = v_slot.id and b.id <> p_booking_id and coalesce(b.parent_id, '00000000-0000-0000-0000-000000000000'::uuid) <> p_booking_id
     and (b.status in ('paid','manual') or (b.status = 'hold' and b.expires_at > now()));

  if v_family + v_seats > 10 then raise exception 'TOO_MANY'; end if;
  if v_others > 0 and v_family + v_others + v_seats > v_slot.capacity then raise exception 'NO_CAPACITY'; end if;

  insert into rc_bookings (slot_id, date, service, bubble, adults, kids, seats, name, email, phone, notes,
    amount_cents, status, source, expires_at, parent_id, exclusive)
  values (v_slot.id, v_parent.date, v_parent.service, v_parent.bubble, p_adults, p_kids, v_seats,
    v_parent.name, v_parent.email, v_parent.phone, 'Complément de la réservation ' || upper(left(v_parent.id::text, 8)),
    p_amount_cents, 'hold', 'admin', now() + make_interval(mins => p_hold_minutes), p_booking_id,
    (v_family + v_seats >= 8))
  returning * into v_new;

  -- À 8 et plus, la bulle devient exclusive à cette famille
  if v_family + v_seats >= 8 then
    update rc_bookings set exclusive = true where id = p_booking_id or parent_id = p_booking_id;
  end if;
  return v_new;
end $$;
notify pgrst, 'reload schema';
