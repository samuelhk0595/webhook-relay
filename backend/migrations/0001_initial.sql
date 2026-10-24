CREATE TABLE admin (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
CREATE TABLE sessions (hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE tokens (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, prefix TEXT NOT NULL, hash TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL, last_used_at TEXT, expires_at TEXT, revoked_at TEXT
);
CREATE TABLE namespaces (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('active','archived')), secret_hash TEXT, created_at TEXT NOT NULL
);
CREATE TABLE destinations (
 id TEXT PRIMARY KEY, namespace_id TEXT NOT NULL REFERENCES namespaces(id), name TEXT NOT NULL,
 url TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
 max_retries INTEGER, retry_interval_seconds INTEGER NOT NULL, timeout_seconds INTEGER NOT NULL,
 created_at TEXT NOT NULL, last_error TEXT, last_error_at TEXT
);
CREATE TABLE events (
 id TEXT PRIMARY KEY, namespace_id TEXT NOT NULL REFERENCES namespaces(id), method TEXT NOT NULL,
 original_query TEXT NOT NULL, headers TEXT NOT NULL, content_type TEXT, body BLOB,
 body_size INTEGER NOT NULL, received_at TEXT NOT NULL
);
CREATE TABLE deliveries (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 destination_id TEXT NOT NULL REFERENCES destinations(id), state TEXT NOT NULL
 CHECK(state IN ('pending','in_flight','retry_scheduled','succeeded','failed','cancelled')),
 cycle INTEGER NOT NULL, replay_of TEXT REFERENCES deliveries(id), attempts_started INTEGER NOT NULL DEFAULT 0,
 max_retries INTEGER, retry_interval_seconds INTEGER NOT NULL, timeout_seconds INTEGER NOT NULL,
 next_attempt_at TEXT, completed_at TEXT, last_error TEXT, created_at TEXT NOT NULL
);
CREATE TABLE attempts (
 id TEXT PRIMARY KEY, delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
 number INTEGER NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, url TEXT NOT NULL,
 outcome TEXT NOT NULL CHECK(outcome IN ('in_flight','succeeded','failed','interrupted')),
 status_code INTEGER, duration_ms INTEGER, error_category TEXT, error_message TEXT, response_excerpt TEXT,
 UNIQUE(delivery_id, number)
);
CREATE TABLE idempotency (key TEXT PRIMARY KEY, request_hash TEXT NOT NULL, response TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE metrics (
 minute TEXT NOT NULL, namespace_id TEXT NOT NULL REFERENCES namespaces(id),
 destination_id TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL,
 PRIMARY KEY(minute,namespace_id,destination_id,kind)
);
CREATE INDEX queue_due ON deliveries(state,next_attempt_at,destination_id);
CREATE INDEX deliveries_destination ON deliveries(destination_id,state);
CREATE INDEX deliveries_event ON deliveries(event_id,created_at,id);
CREATE INDEX events_time ON events(namespace_id,received_at,id);
CREATE INDEX events_global_time ON events(received_at,id);
CREATE INDEX attempts_delivery ON attempts(delivery_id,started_at,id);
CREATE INDEX metrics_time ON metrics(minute,kind);
