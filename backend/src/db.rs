use crate::{Result, now, stamp};
use chrono::{Timelike, Utc};
use sqlx::{
    Connection, SqliteConnection, SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
};
use std::{path::Path, time::Duration};

pub async fn connect(path: &Path) -> anyhow::Result<SqlitePool> {
    if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
        std::fs::create_dir_all(parent)?;
    }
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Full)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(10));
    // One connection serializes short DB transactions; HTTP always runs outside them.
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;
    sqlx::migrate!().run(&pool).await?;
    Ok(pool)
}
pub async fn metric(conn: &mut SqliteConnection, ns: &str, dest: &str, kind: &str) -> Result<()> {
    let minute = stamp(
        Utc::now()
            .with_second(0)
            .unwrap()
            .with_nanosecond(0)
            .unwrap(),
    );
    sqlx::query("INSERT INTO metrics(minute,namespace_id,destination_id,kind,count) VALUES(?,?,?,?,1) ON CONFLICT DO UPDATE SET count=count+1")
        .bind(minute).bind(ns).bind(dest).bind(kind).execute(conn).await?;
    Ok(())
}
pub async fn new_delivery(conn: &mut SqliteConnection, event: &str, dest: &str) -> Result<String> {
    let id = crate::id();
    let t = now();
    sqlx::query("INSERT INTO deliveries(id,event_id,destination_id,state,cycle,replay_of,max_retries,retry_interval_seconds,timeout_seconds,next_attempt_at,created_at) SELECT ?,?,d.id,'pending',COALESCE((SELECT MAX(cycle) FROM deliveries WHERE event_id=? AND destination_id=d.id),0)+1,(SELECT id FROM deliveries WHERE event_id=? AND destination_id=d.id ORDER BY cycle DESC LIMIT 1),d.max_retries,d.retry_interval_seconds,d.timeout_seconds,?,? FROM destinations d WHERE d.id=?")
        .bind(&id).bind(event).bind(event).bind(event).bind(&t).bind(&t).bind(dest).execute(conn).await?;
    Ok(id)
}

/// Remove retained bytes/headers and terminal attempt diagnostics in small batches.
/// Event/delivery tombstones and aggregates remain available for historical metrics.
pub async fn cleanup(app: &crate::App) -> Result<u64> {
    let normal = stamp(Utc::now() - chrono::Duration::days(app.config.retention_days));
    let failed = stamp(Utc::now() - chrono::Duration::days(app.config.failed_retention_days));
    let mut tx = app.pool.begin().await?;
    let ids: Vec<String> = sqlx::query_scalar("SELECT e.id FROM events e WHERE e.body IS NOT NULL AND e.received_at < ? AND NOT EXISTS(SELECT 1 FROM deliveries d WHERE d.event_id=e.id AND d.state IN ('pending','retry_scheduled','in_flight')) AND COALESCE((SELECT MAX(COALESCE(d.completed_at,d.created_at)) FROM deliveries d WHERE d.event_id=e.id),e.received_at) < CASE WHEN EXISTS(SELECT 1 FROM deliveries d WHERE d.event_id=e.id AND d.state='failed') THEN ? ELSE ? END LIMIT 100")
        .bind(&normal).bind(&failed).bind(&normal).fetch_all(&mut *tx).await?;
    for id in &ids {
        sqlx::query("DELETE FROM attempts WHERE delivery_id IN (SELECT id FROM deliveries WHERE event_id=?)").bind(id).execute(&mut *tx).await?;
        sqlx::query("UPDATE events SET body=NULL,headers='[]' WHERE id=?")
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }
    sqlx::query("DELETE FROM sessions WHERE expires_at < ?")
        .bind(now())
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(ids.len() as u64)
}

pub async fn backup(database: &Path, destination: &Path) -> anyhow::Result<()> {
    anyhow::ensure!(!destination.exists(), "Backup destination already exists");
    let mut conn = SqliteConnection::connect_with(
        &SqliteConnectOptions::new()
            .filename(database)
            .create_if_missing(false),
    )
    .await?;
    sqlx::query("VACUUM INTO ?")
        .bind(destination.to_string_lossy().as_ref())
        .execute(&mut conn)
        .await?;
    conn.close().await?;
    Ok(())
}
