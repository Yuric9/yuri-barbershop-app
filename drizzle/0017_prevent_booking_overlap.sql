CREATE INDEX IF NOT EXISTS appointments_booking_lookup
ON appointments (date, time, collaborator_id, status);
