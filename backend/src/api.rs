use crate::{App, Error, Result, auth, db, id, models::*, now, stamp, worker};
use axum::{
    Json, Router,
    body::to_bytes,
    extract::{Path, Request, State},
    http::{HeaderMap, Method, StatusCode, header},
    middleware,
    response::{IntoResponse, Redirect, Response},
    routing::{any, get, post},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::{Value, json};
use sqlx::{QueryBuilder, Row, Sqlite};
use std::collections::{HashMap, HashSet};
use tower_http::services::{ServeDir, ServeFile};

pub type Params = HashMap<String, String>;
pub const NS_SELECT: &str = "SELECT n.id,n.name,n.slug,n.status,n.created_at,n.secret_hash IS NOT NULL AS has_ingress_secret,? || '/' || n.slug AS ingress_url,(SELECT COUNT(*) FROM destinations d WHERE d.namespace_id=n.id AND d.status!='archived') AS destination_count FROM namespaces n WHERE 1=1";
pub const DEST_SELECT: &str = "SELECT id,namespace_id,name,url,status,max_retries,retry_interval_seconds,timeout_seconds,created_at FROM destinations WHERE 1=1";
pub const EVENT_SELECT: &str = "SELECT e.id,e.namespace_id,n.name AS namespace_name,e.method,e.original_query,e.content_type,e.body_size,e.received_at,e.body IS NOT NULL AS payload_available,(SELECT COUNT(*) FROM deliveries d WHERE d.event_id=e.id) AS delivery_count,(SELECT COUNT(*) FROM deliveries d WHERE d.event_id=e.id AND d.state='succeeded') AS succeeded_count,(SELECT COUNT(*) FROM deliveries d WHERE d.event_id=e.id AND d.state='failed') AS failed_count,(SELECT COUNT(*) FROM deliveries d WHERE d.event_id=e.id AND d.state IN ('pending','retry_scheduled','in_flight')) AS pending_count FROM events e JOIN namespaces n ON n.id=e.namespace_id WHERE 1=1";
pub const DELIVERY_SELECT: &str = "SELECT d.id,d.event_id,d.destination_id,t.name AS destination_name,d.state,d.cycle,d.replay_of,d.attempts_started,d.max_retries,d.retry_interval_seconds,d.timeout_seconds,d.next_attempt_at,d.completed_at,d.last_error FROM deliveries d JOIN destinations t ON t.id=d.destination_id WHERE 1=1";
pub const TOKEN_SELECT: &str =
    "SELECT id,name,prefix,created_at,last_used_at,expires_at,revoked_at FROM tokens WHERE 1=1";
pub const ATTEMPT_SELECT: &str = "SELECT id,number,started_at,finished_at,url,outcome,status_code,duration_ms,error_category,error_message,response_excerpt FROM attempts WHERE 1=1";

pub fn router(app: App) -> Router {
    let admin = Router::new()
        .route("/{*path}", any(admin_dispatch))
        .route_layer(middleware::from_fn_with_state(app.clone(), auth::guard));
    let dist = app.config.admin_dist.clone();
    Router::new()
        .route("/healthz", get(|| async { StatusCode::NO_CONTENT }))
        .route("/readyz", get(ready))
        .route("/api/v1/auth/login", post(login))
        .nest("/api/v1", admin)
        .route("/admin", get(|| async { Redirect::permanent("/admin/") }))
        .nest_service(
            "/admin/",
            ServeDir::new(&dist).not_found_service(ServeFile::new(dist.join("index.html"))),
        )
        .route("/{namespace}", any(ingress))
        .fallback(|| async { Error::missing() })
        .layer(middleware::from_fn(security_headers))
        .with_state(app)
}
async fn security_headers(request: Request, next: middleware::Next) -> Response {
    let admin =
        request.uri().path().starts_with("/admin") || request.uri().path().starts_with("/api/");
    let mut response =
        match tokio::time::timeout(std::time::Duration::from_secs(30), next.run(request)).await {
            Ok(response) => response,
            Err(_) => Error::new(
                StatusCode::REQUEST_TIMEOUT,
                "request_timeout",
                "Tempo limite de entrada excedido.",
            )
            .into_response(),
        };
    response
        .headers_mut()
        .insert("x-content-type-options", "nosniff".parse().unwrap());
    response
        .headers_mut()
        .insert("referrer-policy", "no-referrer".parse().unwrap());
    if admin {
        response
            .headers_mut()
            .insert("cache-control", "no-store".parse().unwrap());
        response
            .headers_mut()
            .insert("x-frame-options", "DENY".parse().unwrap());
        response.headers_mut().insert("content-security-policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'".parse().unwrap());
    }
    response
}
async fn ready(State(app): State<App>) -> StatusCode {
    if sqlx::query("SELECT 1 FROM admin LIMIT 1")
        .fetch_optional(&app.pool)
        .await
        .is_ok_and(|r| r.is_some())
    {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}
async fn login(State(app): State<App>, request: Request) -> Result<Response> {
    let (parts, body) = request.into_parts();
    let bytes = to_bytes(body, 8192)
        .await
        .map_err(|_| Error::invalid("body", "Corpo inválido ou muito grande."))?;
    let input =
        serde_json::from_slice(&bytes).map_err(|_| Error::invalid("body", "JSON inválido."))?;
    let (session, cookie) = auth::login(&app, &parts.headers, input).await?;
    Ok(([(header::SET_COOKIE, cookie)], Json(session)).into_response())
}
pub fn params(query: Option<&str>) -> Params {
    url::form_urlencoded::parse(query.unwrap_or("").as_bytes())
        .into_owned()
        .collect()
}
fn result<T: Serialize>(value: T) -> Result<Response> {
    Ok(Json(value).into_response())
}
fn created<T: Serialize>(value: T) -> Result<Response> {
    Ok((StatusCode::CREATED, Json(value)).into_response())
}
fn parse_body(bytes: &[u8]) -> Result<Value> {
    let v: Value =
        serde_json::from_slice(bytes).map_err(|_| Error::invalid("body", "JSON inválido."))?;
    if !v.is_object() {
        return Err(Error::invalid("body", "Objeto JSON obrigatório."));
    }
    Ok(v)
}
pub fn limit(p: &Params) -> Result<usize> {
    let n = p
        .get("limit")
        .map(|s| s.parse::<usize>())
        .transpose()
        .map_err(|_| Error::invalid("limit", "Use 1–100."))?
        .unwrap_or(25);
    if !(1..=100).contains(&n) {
        return Err(Error::invalid("limit", "Use 1–100."));
    }
    Ok(n)
}
pub fn paginate(
    q: &mut QueryBuilder<'_, Sqlite>,
    p: &Params,
    column: &str,
    descending: bool,
) -> Result<()> {
    if let Some(cursor) = p.get("cursor") {
        let cursor = URL_SAFE_NO_PAD
            .decode(cursor)
            .ok()
            .and_then(|v| String::from_utf8(v).ok())
            .ok_or_else(|| Error::invalid("cursor", "Cursor inválido."))?;
        q.push(format!(
            " AND {column} {} ",
            if descending { "<" } else { ">" }
        ))
        .push_bind(cursor);
    }
    q.push(format!(
        " ORDER BY {column} {} LIMIT ",
        if descending { "DESC" } else { "ASC" }
    ))
    .push_bind((limit(p)? + 1) as i64);
    Ok(())
}
pub fn page<T: Serialize>(mut items: Vec<T>, p: &Params, timestamp: &str) -> Result<Page<T>> {
    let max = limit(p)?;
    let more = items.len() > max;
    items.truncate(max);
    let next_cursor = if more {
        items.last().map(|item| {
            let v = serde_json::to_value(item).unwrap();
            URL_SAFE_NO_PAD.encode(format!(
                "{}{}",
                v[timestamp].as_str().unwrap_or(""),
                v["id"]
                    .as_str()
                    .or(v["destination_id"].as_str())
                    .unwrap_or("")
            ))
        })
    } else {
        None
    };
    Ok(Page { items, next_cursor })
}
pub fn filter(q: &mut QueryBuilder<'_, Sqlite>, p: &Params, key: &str, column: &str) {
    if let Some(value) = p.get(key) {
        q.push(format!(" AND {column}=")).push_bind(value.clone());
    }
}
fn text(v: &Value, key: &str, max: usize) -> Result<String> {
    let value = v.get(key).and_then(Value::as_str).unwrap_or("").trim();
    if value.is_empty() || value.chars().count() > max {
        return Err(Error::invalid(
            key,
            "Valor obrigatório ou tamanho inválido.",
        ));
    }
    Ok(value.to_owned())
}
fn secret_hash(v: &Value) -> Result<Option<String>> {
    if v.is_null() {
        return Ok(None);
    }
    let s = v
        .as_str()
        .ok_or_else(|| Error::invalid("ingress_secret", "Use texto ou null."))?;
    if !(16..=256).contains(&s.len()) {
        return Err(Error::invalid("ingress_secret", "Use 16–256 bytes."));
    }
    Ok(Some(auth::hash(s)))
}
pub fn validate_url(app: &App, value: &str) -> Result<()> {
    let invalid = || {
        Error::invalid(
            "url",
            "Use URL absoluta HTTP/HTTPS, sem credenciais, fragmento ou loop para o relay.",
        )
    };
    if value.len() > 4096 {
        return Err(invalid());
    }
    let url = url::Url::parse(value).map_err(|_| invalid())?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err(invalid());
    }
    let own = url::Url::parse(&app.config.public_url).unwrap();
    if url.host_str() == own.host_str()
        && url.port_or_known_default() == own.port_or_known_default()
    {
        return Err(invalid());
    }
    // Also reject obvious aliases for the listening socket.
    if let Ok(listen) = app.config.listen.parse::<std::net::SocketAddr>() {
        let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
        if local && url.port_or_known_default() == Some(listen.port()) {
            return Err(invalid());
        }
    }
    Ok(())
}
fn policy(v: &Value) -> Result<(Option<i64>, i64, i64)> {
    let max = match v.get("max_retries") {
        None => Some(288),
        Some(Value::Null) => None,
        Some(n) => Some(
            n.as_i64()
                .filter(|n| (0..=1_000_000).contains(n))
                .ok_or_else(|| Error::invalid("max_retries", "Use 0–1000000 ou null."))?,
        ),
    };
    let number = |key: &str, default, min, max| -> Result<i64> {
        match v.get(key) {
            None => Ok(default),
            Some(n) => n
                .as_i64()
                .filter(|n| (*n >= min) && (*n <= max))
                .ok_or_else(|| Error::invalid(key, "Número fora dos limites.")),
        }
    };
    Ok((
        max,
        number("retry_interval_seconds", 300, 1, 604800)?,
        number("timeout_seconds", 15, 1, 300)?,
    ))
}
async fn namespace(app: &App, key: &str) -> Result<Namespace> {
    Ok(sqlx::query_as(&format!("{NS_SELECT} AND n.id=?"))
        .bind(&app.config.public_url)
        .bind(key)
        .fetch_one(&app.pool)
        .await?)
}
async fn destination(app: &App, key: &str) -> Result<Destination> {
    Ok(sqlx::query_as(&format!("{DEST_SELECT} AND id=?"))
        .bind(key)
        .fetch_one(&app.pool)
        .await?)
}
async fn event(app: &App, key: &str) -> Result<WebhookEvent> {
    Ok(sqlx::query_as(&format!("{EVENT_SELECT} AND e.id=?"))
        .bind(key)
        .fetch_one(&app.pool)
        .await?)
}
async fn admin_dispatch(
    State(app): State<App>,
    Path(path): Path<String>,
    request: Request,
) -> Result<Response> {
    let (parts, body) = request.into_parts();
    let p = params(parts.uri.query());
    let headers = parts.headers;
    let method = parts.method;
    let bytes = to_bytes(body, 65536).await.map_err(|_| {
        Error::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "body_limit",
            "Corpo muito grande.",
        )
    })?;
    let segments: Vec<&str> = path.trim_matches('/').split('/').collect();
    let a = segments.first().copied().unwrap_or("");
    let key = segments.get(1).copied().unwrap_or("");
    let sub = segments.get(2).copied().unwrap_or("");
    if path == "auth/me" && method == Method::GET {
        return result(auth::authenticate(&app, &headers, false).await?);
    }
    if path == "auth/logout" && method == Method::POST {
        if let Some(cookie) = auth::cookie_value(&headers) {
            sqlx::query("DELETE FROM sessions WHERE hash=?")
                .bind(auth::hash(&cookie))
                .execute(&app.pool)
                .await?;
        }
        return Ok((
            StatusCode::NO_CONTENT,
            [(
                header::SET_COOKIE,
                format!(
                    "{}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0{}",
                    auth::COOKIE,
                    if app.config.secure_cookie {
                        "; Secure"
                    } else {
                        ""
                    }
                ),
            )],
        )
            .into_response());
    }
    if path == "openapi.json" && method == Method::GET {
        return result(crate::openapi::document());
    }
    if a == "stats" && method == Method::GET {
        return crate::stats::handle(&app, key, &p).await;
    }
    match (a, method.as_str(), key, sub) {
        ("namespaces", "GET", "", "") => {
            let mut q = QueryBuilder::new(
                "SELECT n.id,n.name,n.slug,n.status,n.created_at,n.secret_hash IS NOT NULL AS has_ingress_secret,",
            );
            q.push_bind(app.config.public_url.clone()).push(" || '/' || n.slug AS ingress_url,(SELECT COUNT(*) FROM destinations d WHERE d.namespace_id=n.id AND d.status!='archived') AS destination_count FROM namespaces n WHERE 1=1");
            filter(&mut q, &p, "status", "n.status");
            paginate(&mut q, &p, "n.created_at || n.id", false)?;
            result(page(
                q.build_query_as::<Namespace>().fetch_all(&app.pool).await?,
                &p,
                "created_at",
            )?)
        }
        ("namespaces", "GET", _, "") => result(namespace(&app, key).await?),
        ("namespaces", "POST", "", "") => {
            let v = parse_body(&bytes)?;
            let name = text(&v, "name", 120)?;
            let slug = text(&v, "slug", 64)?.to_ascii_lowercase();
            if !slug
                .bytes()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
                || matches!(slug.as_str(), "api" | "admin" | "healthz" | "readyz")
            {
                return Err(Error::invalid("slug", "Slug inválido ou reservado."));
            }
            let secret = secret_hash(v.get("ingress_secret").unwrap_or(&Value::Null))?;
            let id = id();
            sqlx::query("INSERT INTO namespaces(id,name,slug,status,secret_hash,created_at) VALUES(?,?,?,'active',?,?)").bind(&id).bind(name).bind(slug).bind(secret).bind(now()).execute(&app.pool).await?;
            created(namespace(&app, &id).await?)
        }
        ("namespaces", "PATCH", _, "") => {
            let old = namespace(&app, key).await?;
            let v = parse_body(&bytes)?;
            if v.get("slug").is_some() {
                return Err(Error::invalid("slug", "Slug imutável."));
            }
            let name = if v.get("name").is_some() {
                text(&v, "name", 120)?
            } else {
                old.name
            };
            let status = match v.get("status") {
                None => old.status,
                Some(s) if s == "archived" => "archived".into(),
                _ => return Err(Error::invalid("status", "Use archived.")),
            };
            let mut tx = app.pool.begin().await?;
            sqlx::query("UPDATE namespaces SET name=?,status=? WHERE id=?")
                .bind(name)
                .bind(status)
                .bind(key)
                .execute(&mut *tx)
                .await?;
            if let Some(secret) = v.get("ingress_secret") {
                sqlx::query("UPDATE namespaces SET secret_hash=? WHERE id=?")
                    .bind(secret_hash(secret)?)
                    .bind(key)
                    .execute(&mut *tx)
                    .await?;
            }
            tx.commit().await?;
            result(namespace(&app, key).await?)
        }
        ("destinations", "GET", "", "") | ("namespaces", "GET", _, "destinations") => {
            let mut p = p;
            if a == "namespaces" {
                namespace(&app, key).await?;
                p.insert("namespace_id".into(), key.into());
            }
            let mut q = QueryBuilder::new(DEST_SELECT);
            filter(&mut q, &p, "namespace_id", "namespace_id");
            filter(&mut q, &p, "status", "status");
            paginate(&mut q, &p, "created_at || id", false)?;
            result(page(
                q.build_query_as::<Destination>()
                    .fetch_all(&app.pool)
                    .await?,
                &p,
                "created_at",
            )?)
        }
        ("destinations", "GET", _, "") => result(destination(&app, key).await?),
        ("namespaces", "POST", _, "destinations") => {
            let ns = namespace(&app, key).await?;
            if ns.status == "archived" {
                return Err(Error::invalid("namespace_id", "Namespace arquivado."));
            }
            let v = parse_body(&bytes)?;
            let name = text(&v, "name", 120)?;
            let url = text(&v, "url", 4096)?;
            validate_url(&app, &url)?;
            let (max, interval, timeout) = policy(&v)?;
            let id = id();
            sqlx::query("INSERT INTO destinations(id,namespace_id,name,url,status,max_retries,retry_interval_seconds,timeout_seconds,created_at) VALUES(?,?,?,?,'active',?,?,?,?)").bind(&id).bind(key).bind(name).bind(url).bind(max).bind(interval).bind(timeout).bind(now()).execute(&app.pool).await?;
            created(destination(&app, &id).await?)
        }
        ("destinations", "PATCH", _, "") => {
            let old = destination(&app, key).await?;
            let v = parse_body(&bytes)?;
            if old.status == "archived" {
                return Err(Error::invalid("status", "Destino arquivado é imutável."));
            }
            let mut full = serde_json::to_value(&old).unwrap();
            for (k, val) in v.as_object().unwrap() {
                full[k] = val.clone();
            }
            let name = text(&full, "name", 120)?;
            let url = text(&full, "url", 4096)?;
            validate_url(&app, &url)?;
            let (max, interval, timeout) = policy(&full)?;
            let status = full["status"].as_str().unwrap_or("");
            if !matches!(status, "active" | "paused" | "archived") {
                return Err(Error::invalid("status", "Estado inválido."));
            }
            let mut tx = app.pool.begin().await?;
            sqlx::query("UPDATE destinations SET name=?,url=?,status=?,max_retries=?,retry_interval_seconds=?,timeout_seconds=? WHERE id=?").bind(name).bind(url).bind(status).bind(max).bind(interval).bind(timeout).bind(key).execute(&mut *tx).await?;
            if status == "archived" {
                sqlx::query("UPDATE deliveries SET state='cancelled',completed_at=?,next_attempt_at=NULL WHERE destination_id=? AND state IN ('pending','retry_scheduled')").bind(now()).bind(key).execute(&mut *tx).await?;
            }
            tx.commit().await?;
            result(destination(&app, key).await?)
        }
        ("events", "GET", "", "") => {
            let mut q = QueryBuilder::new(EVENT_SELECT);
            filter(&mut q, &p, "namespace_id", "e.namespace_id");
            if let Some(from) = p.get("from") {
                q.push(" AND e.received_at>=")
                    .push_bind(parse_time(from, "from")?);
            }
            if let Some(to) = p.get("to") {
                q.push(" AND e.received_at<")
                    .push_bind(parse_time(to, "to")?);
            }
            if p.contains_key("destination_id") || p.contains_key("state") {
                q.push(" AND EXISTS(SELECT 1 FROM deliveries f WHERE f.event_id=e.id");
                filter(&mut q, &p, "destination_id", "f.destination_id");
                filter(&mut q, &p, "state", "f.state");
                q.push(")");
            }
            paginate(&mut q, &p, "e.received_at || e.id", true)?;
            result(page(
                q.build_query_as::<WebhookEvent>()
                    .fetch_all(&app.pool)
                    .await?,
                &p,
                "received_at",
            )?)
        }
        ("events", "GET", _, "") => {
            let event = event(&app, key).await?;
            let raw: String = sqlx::query_scalar("SELECT headers FROM events WHERE id=?")
                .bind(key)
                .fetch_one(&app.pool)
                .await?;
            let stored: Vec<(String, Vec<u8>)> = serde_json::from_str(&raw).unwrap_or_default();
            let headers = stored
                .into_iter()
                .map(|(name, value)| {
                    let redacted = sensitive(&name);
                    Header {
                        name,
                        value: if redacted {
                            "••••••••".into()
                        } else {
                            String::from_utf8_lossy(&value).into_owned()
                        },
                        redacted,
                    }
                })
                .collect();
            let deliveries = sqlx::query_as(&format!(
                "{DELIVERY_SELECT} AND d.event_id=? ORDER BY d.created_at,d.id"
            ))
            .bind(key)
            .fetch_all(&app.pool)
            .await?;
            result(EventDetail {
                event,
                headers,
                deliveries,
            })
        }
        ("events", "GET", _, "payload") => {
            let body: Option<Vec<u8>> = sqlx::query_scalar("SELECT body FROM events WHERE id=?")
                .bind(key)
                .fetch_one(&app.pool)
                .await?;
            let mut body = body.ok_or_else(|| {
                Error::new(
                    StatusCode::GONE,
                    "payload_expired",
                    "Payload removido pela retenção.",
                )
            })?;
            let mut truncated = false;
            if let Some(preview) = p.get("preview_bytes") {
                let size = preview
                    .parse::<usize>()
                    .ok()
                    .filter(|n| (1..=65536).contains(n))
                    .ok_or_else(|| Error::invalid("preview_bytes", "Use 1–65536."))?;
                truncated = body.len() > size;
                body.truncate(size);
            }
            Ok((
                [
                    (header::CONTENT_TYPE, "application/octet-stream".to_owned()),
                    (
                        header::CONTENT_DISPOSITION,
                        "attachment; filename=\"payload.bin\"".to_owned(),
                    ),
                    (
                        header::HeaderName::from_static("x-payload-truncated"),
                        truncated.to_string(),
                    ),
                ],
                body,
            )
                .into_response())
        }
        ("events", "POST", _, "replays") => replay(&app, key, &headers, parse_body(&bytes)?).await,
        ("deliveries", "GET", _, "attempts") => {
            let _: String = sqlx::query_scalar("SELECT id FROM deliveries WHERE id=?")
                .bind(key)
                .fetch_one(&app.pool)
                .await?;
            let mut q = QueryBuilder::new(ATTEMPT_SELECT);
            q.push(" AND delivery_id=").push_bind(key.to_owned());
            paginate(&mut q, &p, "started_at || id", false)?;
            result(page(
                q.build_query_as::<Attempt>().fetch_all(&app.pool).await?,
                &p,
                "started_at",
            )?)
        }
        ("deliveries", "GET", "", "") => {
            let mut q = QueryBuilder::new(DELIVERY_SELECT);
            filter(&mut q, &p, "destination_id", "d.destination_id");
            filter(&mut q, &p, "state", "d.state");
            // Cursor is by stable ID for this agent-facing endpoint (UI uses event detail).
            paginate(&mut q, &p, "d.id", false)?;
            result(page(
                q.build_query_as::<Delivery>().fetch_all(&app.pool).await?,
                &p,
                "__id_only",
            )?)
        }
        ("tokens", "GET", "", "") => {
            let mut q = QueryBuilder::new(TOKEN_SELECT);
            paginate(&mut q, &p, "created_at || id", false)?;
            result(page(
                q.build_query_as::<Token>().fetch_all(&app.pool).await?,
                &p,
                "created_at",
            )?)
        }
        ("tokens", "POST", "", "") => {
            let v = parse_body(&bytes)?;
            let name = text(&v, "name", 120)?;
            let expires = match v.get("expires_at") {
                None | Some(Value::Null) => None,
                Some(Value::String(s)) => Some(parse_time(s, "expires_at")?),
                _ => return Err(Error::invalid("expires_at", "Data inválida.")),
            };
            if expires.as_ref().is_some_and(|s| s <= &now()) {
                return Err(Error::invalid("expires_at", "Use uma data futura."));
            }
            let id = id();
            let secret = format!("wf_{}", auth::secret());
            sqlx::query(
                "INSERT INTO tokens(id,name,prefix,hash,created_at,expires_at) VALUES(?,?,?,?,?,?)",
            )
            .bind(&id)
            .bind(name)
            .bind(&secret[..11])
            .bind(auth::hash(&secret))
            .bind(now())
            .bind(expires)
            .execute(&app.pool)
            .await?;
            let token = sqlx::query_as(&format!("{TOKEN_SELECT} AND id=?"))
                .bind(id)
                .fetch_one(&app.pool)
                .await?;
            created(CreatedToken { token, secret })
        }
        ("tokens", "DELETE", _, "") => {
            let n = sqlx::query("UPDATE tokens SET revoked_at=COALESCE(revoked_at,?) WHERE id=?")
                .bind(now())
                .bind(key)
                .execute(&app.pool)
                .await?
                .rows_affected();
            if n == 0 {
                return Err(Error::missing());
            }
            Ok(StatusCode::NO_CONTENT.into_response())
        }
        _ => Err(Error::missing()),
    }
}
pub fn parse_time(value: &str, field: &str) -> Result<String> {
    DateTime::parse_from_rfc3339(value)
        .map(|d| stamp(d.with_timezone(&Utc)))
        .map_err(|_| Error::invalid(field, "Use data RFC3339."))
}
pub fn sensitive(name: &str) -> bool {
    let n = name.to_ascii_lowercase();
    n.contains("signature")
        || n.contains("secret")
        || n.contains("token")
        || n.contains("authorization")
        || n == "cookie"
        || n == "set-cookie"
        || n.contains("api-key")
}
async fn replay(app: &App, event_id: &str, headers: &HeaderMap, v: Value) -> Result<Response> {
    let key = headers
        .get("idempotency-key")
        .and_then(|v| v.to_str().ok())
        .filter(|v| !v.is_empty() && v.len() <= 200)
        .ok_or_else(|| {
            Error::invalid(
                "idempotency_key",
                "Idempotency-Key obrigatório (até 200 bytes).",
            )
        })?;
    let input: ReplayInput = serde_json::from_value(v)
        .map_err(|_| Error::invalid("destination_ids", "Selecione destinos."))?;
    if input.destination_ids.is_empty()
        || input.destination_ids.len() > 100
        || input.destination_ids.iter().collect::<HashSet<_>>().len() != input.destination_ids.len()
    {
        return Err(Error::invalid(
            "destination_ids",
            "Seleção vazia, repetida ou maior que 100.",
        ));
    }
    let mut ids = input.destination_ids;
    ids.sort();
    let request_hash = auth::hash(&json!([event_id, ids]).to_string());
    let mut tx = app.pool.begin().await?;
    let existing: Option<(String, String)> =
        sqlx::query_as("SELECT request_hash,response FROM idempotency WHERE key=?")
            .bind(key)
            .fetch_optional(&mut *tx)
            .await?;
    if let Some((hash, response)) = existing {
        if hash != request_hash {
            return Err(Error::new(
                StatusCode::CONFLICT,
                "idempotency_conflict",
                "Chave já usada com outro pedido.",
            ));
        }
        tx.commit().await?;
        return created(serde_json::from_str::<ReplayResult>(&response).unwrap());
    }
    let (ns, available): (String, bool) =
        sqlx::query_as("SELECT namespace_id,body IS NOT NULL FROM events WHERE id=?")
            .bind(event_id)
            .fetch_one(&mut *tx)
            .await?;
    if !available {
        return Err(Error::new(
            StatusCode::GONE,
            "payload_expired",
            "Payload removido.",
        ));
    }
    let mut delivery_ids = Vec::new();
    for dest in ids {
        let valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM destinations WHERE id=? AND namespace_id=? AND status!='archived')").bind(&dest).bind(&ns).fetch_one(&mut *tx).await?;
        if !valid {
            return Err(Error::invalid(
                "destination_ids",
                "Destino inválido ou arquivado.",
            ));
        }
        delivery_ids.push(db::new_delivery(&mut tx, event_id, &dest).await?);
    }
    let response = ReplayResult { delivery_ids };
    sqlx::query("INSERT INTO idempotency(key,request_hash,response,created_at) VALUES(?,?,?,?)")
        .bind(key)
        .bind(request_hash)
        .bind(serde_json::to_string(&response).unwrap())
        .bind(now())
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    created(response)
}
async fn ingress(
    State(app): State<App>,
    Path(slug): Path<String>,
    request: Request,
) -> Result<Response> {
    if !matches!(
        *request.method(),
        Method::POST | Method::PUT | Method::PATCH | Method::DELETE | Method::GET | Method::HEAD
    ) {
        return Err(Error::new(
            StatusCode::METHOD_NOT_ALLOWED,
            "method",
            "Método não suportado.",
        ));
    }
    let _permit = app.ingress.clone().try_acquire_owned().map_err(|_| {
        Error::new(
            StatusCode::TOO_MANY_REQUESTS,
            "ingress_busy",
            "Muitas entradas simultâneas.",
        )
    })?;
    if request
        .headers()
        .iter()
        .map(|(n, v)| n.as_str().len() + v.len())
        .sum::<usize>()
        > app.config.max_headers
    {
        return Err(Error::new(
            StatusCode::REQUEST_HEADER_FIELDS_TOO_LARGE,
            "header_limit",
            "Headers muito grandes.",
        ));
    }
    let (parts, body) = request.into_parts();
    let body = to_bytes(body, app.config.max_body).await.map_err(|_| {
        Error::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "payload_limit",
            "Payload muito grande.",
        )
    })?;
    let mut tx = app.pool.begin().await?;
    let row = sqlx::query("SELECT id,secret_hash FROM namespaces WHERE slug=? AND status='active'")
        .bind(slug)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(Error::missing)?;
    let ns: String = row.get("id");
    if let Some(expected) = row.get::<Option<String>, _>("secret_hash") {
        let value = parts
            .headers
            .get("x-webhook-secret")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if !auth::equal(&expected, &auth::hash(value)) {
            return Err(auth::unauthorized());
        }
    }
    let event_id = id();
    let mut forwarding_headers = parts.headers.clone();
    if let Some((scheme, credential)) = parts
        .headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split_once(' '))
        && scheme.eq_ignore_ascii_case("bearer")
    {
        // Match actual own credentials, not an arbitrary provider's Bearer prefix.
        // Revoked/expired token hashes remain recognizable and are removed too.
        let own: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM tokens WHERE hash=?)")
            .bind(auth::hash(credential.trim()))
            .fetch_one(&mut *tx)
            .await?;
        if own {
            forwarding_headers.remove("authorization");
        }
    }
    let filtered = worker::forwarded_headers(&forwarding_headers);
    sqlx::query("INSERT INTO events(id,namespace_id,method,original_query,headers,content_type,body,body_size,received_at) VALUES(?,?,?,?,?,?,?,?,?)")
        .bind(&event_id).bind(&ns).bind(parts.method.as_str()).bind(parts.uri.query().unwrap_or("")).bind(serde_json::to_string(&filtered).unwrap()).bind(parts.headers.get("content-type").and_then(|v|v.to_str().ok())).bind(body.as_ref()).bind(body.len() as i64).bind(now()).execute(&mut *tx).await?;
    let destinations: Vec<String> = sqlx::query_scalar(
        "SELECT id FROM destinations WHERE namespace_id=? AND status!='archived'",
    )
    .bind(&ns)
    .fetch_all(&mut *tx)
    .await?;
    for dest in destinations {
        db::new_delivery(&mut tx, &event_id, &dest).await?;
    }
    db::metric(&mut tx, &ns, "", "received").await?;
    tx.commit().await?;
    Ok((StatusCode::ACCEPTED, Json(json!({"event_id":event_id}))).into_response())
}
