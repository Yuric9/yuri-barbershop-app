DROP TRIGGER IF EXISTS prevent_overlapping_appointments_insert;
DROP TRIGGER IF EXISTS prevent_overlapping_appointments_update;

CREATE TRIGGER prevent_overlapping_appointments_insert
BEFORE INSERT ON appointments
WHEN NEW.status <> 'Cancelado'
AND EXISTS (
  SELECT 1
  FROM appointments AS a
  LEFT JOIN services AS s ON s.id = a.service_id
  WHERE a.date = NEW.date
    AND a.status <> 'Cancelado'
    AND (NEW.collaborator_id IS NULL OR a.collaborator_id IS NULL OR a.collaborator_id = NEW.collaborator_id)
    AND (CAST(substr(a.time, 1, 2) AS INTEGER) * 60 + CAST(substr(a.time, 4, 2) AS INTEGER))
      < (CAST(substr(NEW.time, 1, 2) AS INTEGER) * 60 + CAST(substr(NEW.time, 4, 2) AS INTEGER)
        + COALESCE((SELECT duration_min FROM services WHERE id = NEW.service_id), 30))
    AND (CAST(substr(NEW.time, 1, 2) AS INTEGER) * 60 + CAST(substr(NEW.time, 4, 2) AS INTEGER))
      < (CAST(substr(a.time, 1, 2) AS INTEGER) * 60 + CAST(substr(a.time, 4, 2) AS INTEGER)
        + COALESCE(s.duration_min, 30))
)
BEGIN
  SELECT RAISE(ABORT, 'appointment_overlap');
END;

CREATE TRIGGER prevent_overlapping_appointments_update
BEFORE UPDATE OF date, time, status, service_id, collaborator_id ON appointments
WHEN NEW.status <> 'Cancelado'
AND EXISTS (
  SELECT 1
  FROM appointments AS a
  LEFT JOIN services AS s ON s.id = a.service_id
  WHERE a.id <> OLD.id
    AND a.date = NEW.date
    AND a.status <> 'Cancelado'
    AND (NEW.collaborator_id IS NULL OR a.collaborator_id IS NULL OR a.collaborator_id = NEW.collaborator_id)
    AND (CAST(substr(a.time, 1, 2) AS INTEGER) * 60 + CAST(substr(a.time, 4, 2) AS INTEGER))
      < (CAST(substr(NEW.time, 1, 2) AS INTEGER) * 60 + CAST(substr(NEW.time, 4, 2) AS INTEGER)
        + COALESCE((SELECT duration_min FROM services WHERE id = NEW.service_id), 30))
    AND (CAST(substr(NEW.time, 1, 2) AS INTEGER) * 60 + CAST(substr(NEW.time, 4, 2) AS INTEGER))
      < (CAST(substr(a.time, 1, 2) AS INTEGER) * 60 + CAST(substr(a.time, 4, 2) AS INTEGER)
        + COALESCE(s.duration_min, 30))
)
BEGIN
  SELECT RAISE(ABORT, 'appointment_overlap');
END;
