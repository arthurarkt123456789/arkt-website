-- Migration : facturation Pennylane des réservations manuelles.
alter table rc_bookings add column if not exists pennylane_customer_id bigint;
alter table rc_bookings add column if not exists pennylane_invoice_id bigint;
alter table rc_bookings add column if not exists pennylane_invoice_number text;
alter table rc_bookings add column if not exists pennylane_status text;
alter table rc_bookings add column if not exists pennylane_invoiced_at timestamptz;
alter table rc_bookings add column if not exists pennylane_sent_at timestamptz;
notify pgrst, 'reload schema';
