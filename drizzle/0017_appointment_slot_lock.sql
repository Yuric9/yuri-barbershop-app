CREATE TABLE IF NOT EXISTS appointment_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  resource_key TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  appointment_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS appointment_slots_unique ON appointment_slots (date, time, resource_key);

CREATE TRIGGER IF NOT EXISTS prevent_overlapping_appointments
BEFORE INSERT ON appointments
WHEN NEW.status <> 'Cancelado'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM appointments existing
    LEFT JOIN services existing_service ON existing_service.id = existing.service_id
    LEFT JOIN services new_service ON new_service.id = NEW.service_id
    WHERE existing.date = NEW.date
      AND existing.status <> 'Cancelado'
      AND (NEW.collaborator_id IS NULL OR existing.collaborator_id IS NULL OR existing.collaborator_id = NEW.collaborator_id)
      AND ((CAST(substr(NEW.time, 1, 2) AS INTEGER) * 60 + CAST(substr(NEW.time, 4, 2) AS INTEGER)) < (CAST(substr(existing.time, 1, 2) AS INTEGER) * 60 + CAST(substr(existing.time, 4, 2) AS INTEGER) + COALESCE(existing_service.duration_min, 30)))
      AND ((CAST(substr(existing.time, 1, 2) AS INTEGER) * 60 + CAST(substr(existing.time, 4, 2) AS INTEGER)) < (CAST(substr(NEW.time, 1, 2) AS INTEGER) * 60 + CAST(substr(NEW.time, 4, 2) AS INTEGER) + COALESCE(new_service.duration_min, 30)))
  ) THEN RAISE(ABORT, 'appointment_overlap') END;
END;
