use crate::{App, Result, db, id, now, stamp};
use chrono::{Duration, Utc};
use sqlx::Row;
use std::time::Instant;
use tokio::task::JoinSet;
use tokio_util::sync::CancellationToken;

pub struct Work {
    pub attempt_id: String,
    pub delivery_id: String,
    pub event_id: String,
    pub destination_id: String,
    pub namespace_id: String,
    pub url: String,
    pub method: String,
    pub headers: Vec<(String, Vec<u8>)>,
    pub body: Vec<u8>,
    pub timeout: u64,
}
pub fn forwarded_headers(headers: &axum::http::HeaderMap) -> Vec<(String, Vec<u8>)> {
    let connection: Vec<String> = headers
        .get_all("connection")
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|v| {
            v.split(',')
                .map(|s| s.trim().to_ascii_lowercase())
                .collect::<Vec<_>>()
        })
        .collect();
    let mut result = Vec::new();
    for (name, value) in headers {
        let n = name.as_str();
        if matches!(
            n,
            "host"
                | "content-length"
                | "connection"
                | "keep-alive"
                | "proxy-authenticate"
                | "proxy-authorization"
                | "proxy-connection"
                | "te"
                | "trailer"
                | "transfer-encoding"
                | "upgrade"
                | "forwarded"
                | "x-real-ip"
                | "x-webhook-secret"
                | "x-wf-event-id"
                | "x-wf-delivery-id"
                | "x-csrf-token"
        ) || n.starts_with("x-forwarded-")
            || connection.iter().any(|v| v == n)
        {
            continue;
        }
        if n == "cookie" {
            if let Ok(v) = value.to_str() {
                let rest = v
                    .split(';')
                    .map(str::trim)
                    .filter(|v| !v.starts_with("wf_session="))
                    .collect::<Vec<_>>()
                    .join("; ");
                if !rest.is_empty() {
                    result.push((n.to_owned(), rest.into_bytes()));
                }
            }
        } else {
            result.push((n.to_owned(), value.as_bytes().to_vec()));
        }
    }
    result
}
pub fn combined_url(destination: &str, query: &str) -> String {
    if query.is_empty() {
        return destination.to_owned();
    }
    format!(
        "{destination}{}{query}",
        if destination.contains('?') {
            if destination.ends_with('?') { "" } else { "&" }
        } else {
            "?"
        }
    )
}
pub async fn claim(app: &App) -> Result<Option<Work>> {
    let mut tx = app.pool.begin().await?;
    let row=sqlx::query("SELECT d.*,t.url,e.namespace_id,e.method,e.original_query,e.headers,e.body FROM deliveries d JOIN destinations t ON t.id=d.destination_id JOIN events e ON e.id=d.event_id WHERE d.state IN ('pending','retry_scheduled') AND d.next_attempt_at<=? AND t.status='active' AND (SELECT COUNT(*) FROM deliveries busy WHERE busy.destination_id=d.destination_id AND busy.state='in_flight') < ? ORDER BY d.next_attempt_at,d.created_at,d.id LIMIT 1")
        .bind(now()).bind(app.config.per_destination as i64).fetch_optional(&mut *tx).await?;
    let Some(row) = row else {
        tx.commit().await?;
        return Ok(None);
    };
    let delivery_id: String = row.get("id");
    let attempt_id = id();
    let number: i64 = row.get::<i64, _>("attempts_started") + 1;
    let url = combined_url(row.get("url"), row.get("original_query"));
    let started = now();
    sqlx::query("UPDATE deliveries SET state='in_flight',attempts_started=?,next_attempt_at=NULL WHERE id=?").bind(number).bind(&delivery_id).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO attempts(id,delivery_id,number,started_at,url,outcome) VALUES(?,?,?,?,?,'in_flight')").bind(&attempt_id).bind(&delivery_id).bind(number).bind(&started).bind(&url).execute(&mut *tx).await?;
    let work = Work {
        attempt_id,
        delivery_id,
        event_id: row.get("event_id"),
        destination_id: row.get("destination_id"),
        namespace_id: row.get("namespace_id"),
        url,
        method: row.get("method"),
        headers: serde_json::from_str(row.get("headers")).unwrap_or_default(),
        body: row.get("body"),
        timeout: row.get::<i64, _>("timeout_seconds") as u64,
    };
    tx.commit().await?;
    Ok(Some(work))
}
#[derive(Clone)]
pub struct Outcome {
    pub success: bool,
    pub status: Option<i64>,
    pub duration: i64,
    pub category: Option<String>,
    pub message: Option<String>,
    pub excerpt: Option<String>,
}
pub async fn deliver(app: &App, work: &Work) -> Outcome {
    let started = Instant::now();
    let mut observed_status = None;
    let mut bytes = Vec::new();
    let operation = async {
        let mut request = app
            .client
            .request(
                work.method.parse().unwrap_or(reqwest::Method::POST),
                &work.url,
            )
            .body(work.body.clone());
        for (name, value) in &work.headers {
            request = request.header(name, value.as_slice());
        }
        let mut response = request
            .header("x-wf-event-id", &work.event_id)
            .header("x-wf-delivery-id", &work.delivery_id)
            .send()
            .await?;
        let status = response.status();
        observed_status = Some(status);
        // Diagnostics cannot turn an observed 2xx into an unknown/failed delivery.
        // The timeout bounds both headers and the limited diagnostic read.
        while bytes.len() < 4096 {
            match response.chunk().await {
                Ok(Some(chunk)) => {
                    bytes.extend_from_slice(&chunk[..chunk.len().min(4096 - bytes.len())])
                }
                _ => break,
            }
        }
        Ok::<_, reqwest::Error>(status)
    };
    let result =
        tokio::time::timeout(std::time::Duration::from_secs(work.timeout), operation).await;
    let duration = started.elapsed().as_millis() as i64;
    if let Some(status) = observed_status {
        let mut excerpt = String::from_utf8_lossy(&bytes).into_owned();
        if excerpt.len() > 4096 {
            let mut end = 4096;
            while !excerpt.is_char_boundary(end) {
                end -= 1;
            }
            excerpt.truncate(end);
        }
        return Outcome {
            success: status.is_success(),
            status: Some(i64::from(status.as_u16())),
            duration,
            category: (!status.is_success()).then(|| "http_status".into()),
            message: (!status.is_success()).then(|| format!("HTTP {}", status.as_u16())),
            excerpt: Some(excerpt),
        };
    }
    match result {
        Ok(Ok(_)) => unreachable!("HTTP response always records its status"),
        Ok(Err(_)) => Outcome {
            success: false,
            status: None,
            duration,
            category: Some("connection".into()),
            message: Some("Falha de conexão com o destino.".into()),
            excerpt: None,
        },
        Err(_) => Outcome {
            success: false,
            status: None,
            duration,
            category: Some("timeout".into()),
            message: Some("Tempo limite excedido.".into()),
            excerpt: None,
        },
    }
}
pub async fn finish(app: &App, work: &Work, out: Outcome) -> Result<()> {
    let mut tx = app.pool.begin().await?;
    let t = now();
    let changed=sqlx::query("UPDATE attempts SET outcome=?,finished_at=?,status_code=?,duration_ms=?,error_category=?,error_message=?,response_excerpt=? WHERE id=? AND outcome='in_flight'")
        .bind(if out.success{"succeeded"}else{"failed"}).bind(&t).bind(out.status).bind(out.duration).bind(out.category).bind(&out.message).bind(out.excerpt).bind(&work.attempt_id).execute(&mut *tx).await?.rows_affected();
    if changed == 0 {
        tx.commit().await?;
        return Ok(());
    }
    db::metric(
        &mut tx,
        &work.namespace_id,
        &work.destination_id,
        if out.success {
            "attempt_succeeded"
        } else {
            "attempt_failed"
        },
    )
    .await?;
    let (started,max,interval,status):(i64,Option<i64>,i64,String)=sqlx::query_as("SELECT d.attempts_started,d.max_retries,d.retry_interval_seconds,t.status FROM deliveries d JOIN destinations t ON t.id=d.destination_id WHERE d.id=?").bind(&work.delivery_id).fetch_one(&mut *tx).await?;
    let state = if out.success {
        "succeeded"
    } else if status == "archived" {
        "cancelled"
    } else if max.is_some_and(|m| started > m) {
        "failed"
    } else {
        "retry_scheduled"
    };
    let next =
        (state == "retry_scheduled").then(|| stamp(Utc::now() + Duration::seconds(interval)));
    sqlx::query("UPDATE deliveries SET state=?,next_attempt_at=?,completed_at=?,last_error=? WHERE id=? AND state='in_flight'").bind(state).bind(next).bind((state!="retry_scheduled").then_some(&t)).bind(&out.message).bind(&work.delivery_id).execute(&mut *tx).await?;
    if state == "succeeded" || state == "failed" {
        db::metric(
            &mut tx,
            &work.namespace_id,
            &work.destination_id,
            if state == "succeeded" {
                "delivered"
            } else {
                "permanent_failed"
            },
        )
        .await?;
    }
    if !out.success {
        sqlx::query("UPDATE destinations SET last_error=?,last_error_at=? WHERE id=?")
            .bind(&out.message)
            .bind(&t)
            .bind(&work.destination_id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    tracing::info!(event_id=%work.event_id,delivery_id=%work.delivery_id,outcome=state,"delivery finalized");
    Ok(())
}
pub async fn recover(app: &App) -> Result<()> {
    let mut tx = app.pool.begin().await?;
    let rows=sqlx::query("SELECT d.id,d.attempts_started,d.max_retries,d.retry_interval_seconds,d.destination_id,e.namespace_id,t.status FROM deliveries d JOIN events e ON e.id=d.event_id JOIN destinations t ON t.id=d.destination_id WHERE d.state='in_flight'").fetch_all(&mut *tx).await?;
    let t = now();
    for row in rows {
        let delivery: String = row.get("id");
        sqlx::query("UPDATE attempts SET outcome='interrupted',finished_at=?,error_category='interrupted',error_message='Processo interrompido; resultado desconhecido.' WHERE delivery_id=? AND outcome='in_flight'").bind(&t).bind(&delivery).execute(&mut *tx).await?;
        let exhausted = row
            .get::<Option<i64>, _>("max_retries")
            .is_some_and(|m| row.get::<i64, _>("attempts_started") > m);
        let state = if row.get::<String, _>("status") == "archived" {
            "cancelled"
        } else if exhausted {
            "failed"
        } else {
            "retry_scheduled"
        };
        sqlx::query("UPDATE deliveries SET state=?,next_attempt_at=?,completed_at=?,last_error='Tentativa interrompida; resultado desconhecido.' WHERE id=?")
            .bind(state).bind((state=="retry_scheduled").then(||stamp(Utc::now()+Duration::seconds(row.get("retry_interval_seconds"))))).bind((state!="retry_scheduled").then_some(&t)).bind(&delivery).execute(&mut *tx).await?;
        if state == "failed" {
            db::metric(
                &mut tx,
                row.get("namespace_id"),
                row.get("destination_id"),
                "permanent_failed",
            )
            .await?;
        }
    }
    tx.commit().await?;
    Ok(())
}
pub async fn run(app: App, stop: CancellationToken) {
    let mut tasks = JoinSet::new();
    let mut cleanup_at = Instant::now();
    loop {
        tokio::select! {
            _=stop.cancelled()=>break,
            Some(result)=tasks.join_next(),if !tasks.is_empty()=> {if let Err(e)=result {tracing::error!(error=%e,"worker task failed");}},
            _=tokio::time::sleep(std::time::Duration::from_millis(100))=>{}
        }
        while tasks.len() < app.config.concurrency && !stop.is_cancelled() {
            match claim(&app).await {
                Ok(Some(work)) => {
                    let app = app.clone();
                    tasks.spawn(async move {
                        let out = deliver(&app, &work).await;
                        if let Err(e) = finish(&app, &work, out).await {
                            tracing::error!(code=%e.1,"unable to finalize attempt; worker stopping"); // Force restart recovery instead of losing in-flight work.
                            std::process::exit(1);
                        }
                    });
                }
                Ok(None) => break,
                Err(e) => {
                    tracing::error!(code=%e.1,"claim failed");
                    break;
                }
            }
        }
        if cleanup_at.elapsed().as_secs() >= 3600 {
            if let Err(e) = db::cleanup(&app).await {
                tracing::error!(code=%e.1,"cleanup failed");
            }
            cleanup_at = Instant::now();
        }
    }
    if tokio::time::timeout(std::time::Duration::from_secs(30), async {
        while tasks.join_next().await.is_some() {}
    })
    .await
    .is_err()
    {
        tasks.abort_all();
        while tasks.join_next().await.is_some() {}
    }
}
