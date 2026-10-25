CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_story TEXT NOT NULL DEFAULT 'HU-01',
    requirement TEXT NOT NULL DEFAULT 'RF01',
    sensor_id TEXT NOT NULL,
    sector TEXT NOT NULL,
    smoke_level INTEGER NOT NULL CHECK (smoke_level BETWEEN 0 AND 100),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    message TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    dispatched_at TEXT,
    dispatched_unit TEXT
);
