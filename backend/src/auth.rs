use crate::{App, Error, Result, id, models::Session, now, stamp};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{Duration, Utc};
use rand::RngCore;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

pub const COOKIE: &str = "wf_session";
pub fn secret() -> String {
    let mut b = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut b);
    URL_SAFE_NO_PAD.encode(b)
}
pub fn hash(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}
pub fn equal(a: &str, b: &str) -> bool {
    bool::from(a.as_bytes().ct_eq(b.as_bytes()))
}
pub fn unauthorized() -> Error {
    Error::new(
        StatusCode::UNAUTHORIZED,
        "unauthorized",
        "Autenticação necessária. Entre novamente.",
    )
}
pub fn cookie_value(headers: &HeaderMap) -> Option<String> {
    headers
        .get_all("cookie")
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|s| s.split(';'))
        .find_map(|s| {
            s.trim()
                .strip_prefix(&format!("{COOKIE}="))
                .map(str::to_owned)
        })
}
pub fn origin(app: &App, headers: &HeaderMap) -> Result<()> {
    if headers.get("sec-fetch-site").and_then(|v| v.to_str().ok()) == Some("cross-site") {
        return Err(Error::new(
            StatusCode::FORBIDDEN,
            "origin",
            "Origem não permitida.",
        ));
    }
    if let Some(origin) = headers.get("origin") {
        let value = origin.to_str().unwrap_or("");
        let dev = std::env::var("DEV_ORIGIN").unwrap_or_default();
        if value != app.config.public_url && (dev.is_empty() || value != dev) {
            return Err(Error::new(
                StatusCode::FORBIDDEN,
                "origin",
                "Origem não permitida.",
            ));
        }
    }
    Ok(())
}
pub async fn authenticate(app: &App, headers: &HeaderMap, mutation: bool) -> Result<Session> {
    if let Some(auth) = headers.get("authorization") {
        let value = auth
            .to_str()
            .unwrap_or("")
            .strip_prefix("Bearer ")
            .ok_or_else(unauthorized)?;
        let token: Option<String> = sqlx::query_scalar("UPDATE tokens SET last_used_at=? WHERE hash=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?) RETURNING id")
            .bind(now()).bind(hash(value)).bind(now()).fetch_optional(&app.pool).await?;
        if token.is_none() {
            return Err(unauthorized());
        }
        let (id, username): (String, String) =
            sqlx::query_as("SELECT id,username FROM admin LIMIT 1")
                .fetch_one(&app.pool)
                .await?;
        return Ok(Session {
            id,
            username,
            csrf_token: String::new(),
        });
    }
    let value = cookie_value(headers).ok_or_else(unauthorized)?;
    let row:Option<(String,String,String)>=sqlx::query_as("SELECT a.id,a.username,s.csrf FROM sessions s CROSS JOIN admin a WHERE s.hash=? AND s.expires_at>?")
        .bind(hash(&value)).bind(now()).fetch_optional(&app.pool).await?;
    let (id, username, csrf_token) = row.ok_or_else(unauthorized)?;
    if mutation {
        origin(app, headers)?;
        if !equal(
            &csrf_token,
            headers
                .get("x-csrf-token")
                .and_then(|v| v.to_str().ok())
                .unwrap_or(""),
        ) {
            return Err(Error::new(
                StatusCode::FORBIDDEN,
                "csrf",
                "Token CSRF inválido. Atualize a página.",
            ));
        }
    }
    Ok(Session {
        id,
        username,
        csrf_token,
    })
}
pub async fn guard(State(app): State<App>, request: Request, next: Next) -> Result<Response> {
    authenticate(
        &app,
        request.headers(),
        !matches!(
            *request.method(),
            axum::http::Method::GET | axum::http::Method::HEAD
        ),
    )
    .await?;
    Ok(next.run(request).await)
}
pub async fn bootstrap(app: &App, username: String, password: String) -> anyhow::Result<()> {
    anyhow::ensure!(
        !username.trim().is_empty()
            && username.len() <= 128
            && password.len() >= 12
            && password.len() <= 1024,
        "Username required and password must contain 12–1024 bytes"
    );
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM admin")
        .fetch_one(&app.pool)
        .await?;
    if count > 0 {
        return Ok(());
    }
    let password_hash = tokio::task::spawn_blocking(move || {
        Argon2::default()
            .hash_password(
                password.as_bytes(),
                &SaltString::generate(&mut rand::rngs::OsRng),
            )
            .map(|h| h.to_string())
            .map_err(|_| anyhow::anyhow!("Password hashing failed"))
    })
    .await??;
    sqlx::query("INSERT INTO admin(id,username,password_hash) VALUES(?,?,?)")
        .bind(id())
        .bind(username.trim())
        .bind(password_hash)
        .execute(&app.pool)
        .await?;
    Ok(())
}

/// Operator-only command, while the server is stopped. Never available through public HTTP.
pub async fn reset_password(app: &App, password: String) -> anyhow::Result<()> {
    anyhow::ensure!(
        (12..=1024).contains(&password.len()),
        "Password must contain 12–1024 bytes"
    );
    let password_hash = tokio::task::spawn_blocking(move || {
        Argon2::default()
            .hash_password(
                password.as_bytes(),
                &SaltString::generate(&mut rand::rngs::OsRng),
            )
            .map(|h| h.to_string())
            .map_err(|_| anyhow::anyhow!("Password hashing failed"))
    })
    .await??;
    let mut tx = app.pool.begin().await?;
    let updated = sqlx::query("UPDATE admin SET password_hash=?")
        .bind(password_hash)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    anyhow::ensure!(updated == 1, "No administrator provisioned");
    sqlx::query("DELETE FROM sessions")
        .execute(&mut *tx)
        .await?;
    sqlx::query("UPDATE tokens SET revoked_at=COALESCE(revoked_at,?)")
        .bind(now())
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}
pub async fn login(
    app: &App,
    headers: &HeaderMap,
    input: crate::models::LoginInput,
) -> Result<(Session, String)> {
    origin(app, headers)?;
    {
        let mut rate = app.login_limit.lock().unwrap();
        if rate.0.elapsed().as_secs() >= 60 {
            *rate = (std::time::Instant::now(), 0);
        }
        if rate.1 >= 10 {
            return Err(Error::new(
                StatusCode::TOO_MANY_REQUESTS,
                "rate_limit",
                "Aguarde um minuto antes de tentar novamente.",
            ));
        }
        rate.1 += 1;
    }
    if input.username.len() > 128 || input.password.len() > 1024 {
        return Err(unauthorized());
    }
    let (id, username, password_hash): (String, String, String) =
        sqlx::query_as("SELECT id,username,password_hash FROM admin LIMIT 1")
            .fetch_optional(&app.pool)
            .await?
            .ok_or_else(unauthorized)?;
    let password = input.password;
    let valid = tokio::task::spawn_blocking(move || {
        PasswordHash::new(&password_hash).is_ok_and(|h| {
            Argon2::default()
                .verify_password(password.as_bytes(), &h)
                .is_ok()
        })
    })
    .await
    .unwrap_or(false);
    if !valid || username != input.username {
        return Err(unauthorized());
    }
    let value = secret();
    let csrf_token = secret();
    sqlx::query("INSERT INTO sessions(hash,csrf,expires_at) VALUES(?,?,?)")
        .bind(hash(&value))
        .bind(&csrf_token)
        .bind(stamp(Utc::now() + Duration::hours(12)))
        .execute(&app.pool)
        .await?;
    let cookie = format!(
        "{COOKIE}={value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200{}",
        if app.config.secure_cookie {
            "; Secure"
        } else {
            ""
        }
    );
    Ok((
        Session {
            id,
            username,
            csrf_token,
        },
        cookie,
    ))
}
