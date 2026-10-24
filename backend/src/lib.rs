pub mod api;
pub mod auth;
pub mod config;
pub mod db;
pub mod models;
pub mod openapi;
pub mod stats;
pub mod worker;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::{SecondsFormat, Utc};
use sqlx::SqlitePool;
use std::sync::{Arc, Mutex};
use tokio::sync::Semaphore;

#[derive(Clone)]
pub struct App {
    pub pool: SqlitePool,
    pub config: Arc<config::Config>,
    pub client: reqwest::Client,
    pub ingress: Arc<Semaphore>,
    pub login_limit: Arc<Mutex<(std::time::Instant, u32)>>,
}
impl App {
    pub async fn new(config: config::Config) -> anyhow::Result<Self> {
        let pool = db::connect(&config.database).await?;
        Ok(Self {
            pool,
            ingress: Arc::new(Semaphore::new(config.ingress_concurrency)),
            config: Arc::new(config),
            client: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .no_proxy()
                .build()?,
            login_limit: Arc::new(Mutex::new((std::time::Instant::now(), 0))),
        })
    }
}
pub fn now() -> String {
    stamp(Utc::now())
}
pub fn stamp(t: chrono::DateTime<Utc>) -> String {
    t.to_rfc3339_opts(SecondsFormat::Millis, true)
}
pub fn id() -> String {
    uuid::Uuid::new_v4().to_string()
}
pub type Result<T> = std::result::Result<T, Error>;
#[derive(Debug)]
pub struct Error(
    pub StatusCode,
    pub String,
    pub String,
    pub Option<std::collections::BTreeMap<String, String>>,
);
impl Error {
    pub fn new(status: StatusCode, code: &str, message: &str) -> Self {
        Self(status, code.into(), message.into(), None)
    }
    pub fn invalid(field: &str, message: &str) -> Self {
        Self(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation".into(),
            "Verifique os campos indicados.".into(),
            Some([(field.into(), message.into())].into()),
        )
    }
    pub fn missing() -> Self {
        Self::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "Recurso não encontrado.",
        )
    }
}
impl From<sqlx::Error> for Error {
    fn from(e: sqlx::Error) -> Self {
        if let sqlx::Error::Database(ref d) = e
            && d.is_unique_violation()
        {
            return Self::new(StatusCode::CONFLICT, "conflict", "Recurso já existente.");
        }
        if matches!(e, sqlx::Error::RowNotFound) {
            return Self::missing();
        }
        tracing::error!(error = %e, "database operation failed");
        Self::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "storage_unavailable",
            "Armazenamento indisponível.",
        )
    }
}
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        (
            self.0,
            Json(models::ApiProblem {
                error: models::Problem {
                    code: self.1,
                    message: self.2,
                    fields: self.3,
                },
            }),
        )
            .into_response()
    }
}
