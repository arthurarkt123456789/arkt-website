-- Migration : fin de l'événement le 24/12 à 14h (supprime les créneaux du 25 au 30/12)
-- Les réservations éventuelles sur ces dates sont supprimées avec leurs créneaux.
delete from rc_bookings where date > '2026-12-24';
delete from rc_slots where date > '2026-12-24';
