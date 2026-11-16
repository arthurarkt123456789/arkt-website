-- Migration : suivi de l'encaissement des réservations manuelles (virement, facture, espèces…).
alter table rc_bookings add column if not exists manual_paid_at timestamptz;
