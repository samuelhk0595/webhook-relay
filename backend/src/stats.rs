use crate::{
    App, Error, Result,
    api::{Params, filter, page, paginate, parse_time},
    models::*,
    stamp,
};
use axum::{
    Json,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Duration, Timelike, Utc};
use sqlx::{QueryBuilder, Row};
use std::collections::BTreeMap;

fn period(p: &Params) -> Result<(Period, DateTime<Utc>, DateTime<Utc>, i64)> {
    let end = Utc::now()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap();
    let parse = |key: &str, default: DateTime<Utc>| -> Result<DateTime<Utc>> {
        match p.get(key) {
            Some(v) => Ok(DateTime::parse_from_rfc3339(&parse_time(v, key)?)
                .unwrap()
                .with_timezone(&Utc)
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap()),
            None => Ok(default),
        }
    };
    let from = parse("from", end - Duration::hours(24))?;
    let to = parse("to", end)?;
    if to <= from || to - from > Duration::days(366) {
        return Err(Error::invalid(
            "to",
            "Use intervalo positivo de até 366 dias.",
        ));
    }
    let seconds = if to - from > Duration::days(60) {
        86400
    } else if to - from > Duration::hours(6) {
        3600
    } else {
        60
    };
    Ok((
        Period {
            from: stamp(from),
            to: stamp(to),
            granularity: if seconds == 86400 {
                "day"
            } else if seconds == 3600 {
                "hour"
            } else {
                "minute"
            }
            .into(),
        },
        from,
        to,
        seconds,
    ))
}
async fn totals(app: &App, p: &Params, period: &Period) -> Result<BTreeMap<String, i64>> {
    let mut q = QueryBuilder::new("SELECT kind,SUM(count) AS count FROM metrics WHERE minute>=");
    q.push_bind(period.from.clone())
        .push(" AND minute<")
        .push_bind(period.to.clone());
    filter(&mut q, p, "namespace_id", "namespace_id");
    if let Some(dest) = p.get("destination_id") {
        q.push(" AND (kind='received' OR destination_id=")
            .push_bind(dest.clone())
            .push(")");
    }
    q.push(" GROUP BY kind");
    let mut counts = BTreeMap::new();
    for row in q.build().fetch_all(&app.pool).await? {
        counts.insert(row.get("kind"), row.get("count"));
    }
    Ok(counts)
}
async fn queue(app: &App, p: &Params) -> Result<Queue> {
    let mut q = QueryBuilder::new(
        "SELECT d.state,t.status,d.created_at FROM deliveries d JOIN destinations t ON t.id=d.destination_id JOIN events e ON e.id=d.event_id WHERE d.state IN ('pending','retry_scheduled','in_flight')",
    );
    filter(&mut q, p, "namespace_id", "e.namespace_id");
    filter(&mut q, p, "destination_id", "d.destination_id");
    let mut queue = Queue::default();
    let mut oldest: Option<String> = None;
    for row in q.build().fetch_all(&app.pool).await? {
        let state: &str = row.get("state");
        match state {
            "pending" => queue.pending += 1,
            "retry_scheduled" => queue.retry_scheduled += 1,
            _ => queue.in_flight += 1,
        };
        if state != "in_flight" && row.get::<String, _>("status") == "paused" {
            queue.paused += 1;
        }
        let created: String = row.get("created_at");
        if oldest.as_ref().is_none_or(|v| v > &created) {
            oldest = Some(created);
        }
    }
    queue.oldest_pending_age_seconds = oldest
        .and_then(|v| DateTime::parse_from_rfc3339(&v).ok())
        .map(|v| (Utc::now() - v.with_timezone(&Utc)).num_seconds().max(0));
    Ok(queue)
}
pub async fn handle(app: &App, endpoint: &str, p: &Params) -> Result<Response> {
    let (period, from, to, seconds) = period(p)?;
    match endpoint {
        "summary" => {
            let counts = totals(app, p, &period).await?;
            let count = |key: &str| *counts.get(key).unwrap_or(&0);
            let failed = count("attempt_failed");
            let finalized = failed + count("attempt_succeeded");
            let queue = queue(app, p).await?;
            Ok(Json(Summary {
                period,
                received: count("received"),
                delivered: count("delivered"),
                permanent_failed: count("permanent_failed"),
                failed_attempts: failed,
                finalized_attempts: finalized,
                failure_rate: (finalized > 0).then(|| failed as f64 / finalized as f64),
                queue,
            })
            .into_response())
        }
        "timeseries" => {
            let mut buckets = BTreeMap::<i64, SeriesPoint>::new();
            let mut t = from.timestamp() / seconds * seconds;
            while t < to.timestamp() {
                buckets.insert(
                    t,
                    SeriesPoint {
                        timestamp: stamp(DateTime::from_timestamp(t, 0).unwrap()),
                        ..Default::default()
                    },
                );
                t += seconds;
            }
            let mut q = QueryBuilder::new(
                "SELECT minute,kind,destination_id,count FROM metrics WHERE minute>=",
            );
            q.push_bind(period.from.clone())
                .push(" AND minute<")
                .push_bind(period.to.clone());
            filter(&mut q, p, "namespace_id", "namespace_id");
            if let Some(dest) = p.get("destination_id") {
                q.push(" AND (kind='received' OR destination_id=")
                    .push_bind(dest.clone())
                    .push(")");
            }
            for row in q.build().fetch_all(&app.pool).await? {
                let minute: DateTime<Utc> = row.get::<String, _>("minute").parse().unwrap();
                let key = minute.timestamp() / seconds * seconds;
                let point = buckets.get_mut(&key).unwrap();
                let n: i64 = row.get("count");
                match row.get::<&str, _>("kind") {
                    "received" => point.received += n,
                    "delivered" => point.delivered += n,
                    "attempt_failed" => point.failed_attempts += n,
                    _ => {}
                }
            }
            Ok(Json(Timeseries {
                period,
                points: buckets.into_values().collect(),
            })
            .into_response())
        }
        "destinations" => {
            let mut q = QueryBuilder::new(
                "SELECT t.id AS destination_id,t.name AS destination_name,n.name AS namespace_name,t.status,t.last_error,t.last_error_at,",
            );
            for (kind, alias) in [
                ("delivered", "delivered"),
                ("permanent_failed", "permanent_failed"),
            ] {
                q.push("COALESCE((SELECT SUM(count) FROM metrics m WHERE m.destination_id=t.id AND m.kind=").push_bind(kind).push(" AND m.minute>=").push_bind(period.from.clone()).push(" AND m.minute<").push_bind(period.to.clone()).push(format!("),0) AS {alias},"));
            }
            for state in ["pending", "retry_scheduled", "in_flight"] {
                q.push(format!("(SELECT COUNT(*) FROM deliveries d WHERE d.destination_id=t.id AND d.state='{state}') AS {state},"));
            }
            // Keep a harmless extra selected column to avoid trailing-comma special cases.
            q.push("t.id FROM destinations t JOIN namespaces n ON n.id=t.namespace_id WHERE 1=1");
            filter(&mut q, p, "namespace_id", "t.namespace_id");
            filter(&mut q, p, "destination_id", "t.id");
            paginate(&mut q, p, "t.id", false)?;
            let items = q
                .build_query_as::<DestinationStats>()
                .fetch_all(&app.pool)
                .await?;
            Ok(Json(page(items, p, "__id_only")?).into_response())
        }
        _ => Err(Error::missing()),
    }
}
