CREATE TABLE IF NOT EXISTS appointment_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  resource_key TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  appointment_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_slots_unique
ON appointment_slots (date, time, resource_key);
