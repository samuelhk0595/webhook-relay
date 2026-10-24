use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<String>,
}
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Session {
    pub id: String,
    pub username: String,
    pub csrf_token: String,
}
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Namespace {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub ingress_url: String,
    pub status: String,
    pub has_ingress_secret: bool,
    pub destination_count: i64,
    pub created_at: String,
}
#[derive(Serialize, Deserialize, ToSchema, sqlx::FromRow)]
pub struct Destination {
    pub id: String,
    pub namespace_id: String,
    pub name: String,
    pub url: String,
    pub status: String,
    pub max_retries: Option<i64>,
    pub retry_interval_seconds: i64,
    pub timeout_seconds: i64,
    pub created_at: String,
}
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct WebhookEvent {
    pub id: String,
    pub namespace_id: String,
    pub namespace_name: String,
    pub method: String,
    pub original_query: String,
    pub content_type: Option<String>,
    pub body_size: i64,
    pub received_at: String,
    pub payload_available: bool,
    pub delivery_count: i64,
    pub succeeded_count: i64,
    pub failed_count: i64,
    pub pending_count: i64,
}
#[derive(Serialize, ToSchema)]
pub struct Header {
    pub name: String,
    pub value: String,
    pub redacted: bool,
}
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Delivery {
    pub id: String,
    pub event_id: String,
    pub destination_id: String,
    pub destination_name: String,
    pub state: String,
    pub cycle: i64,
    pub replay_of: Option<String>,
    pub attempts_started: i64,
    pub max_retries: Option<i64>,
    pub retry_interval_seconds: i64,
    pub timeout_seconds: i64,
    pub next_attempt_at: Option<String>,
    pub completed_at: Option<String>,
    pub last_error: Option<String>,
}
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Attempt {
    pub id: String,
    pub number: i64,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub url: String,
    pub outcome: String,
    pub status_code: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error_category: Option<String>,
    pub error_message: Option<String>,
    pub response_excerpt: Option<String>,
}
#[derive(Serialize, ToSchema)]
pub struct EventDetail {
    pub event: WebhookEvent,
    pub headers: Vec<Header>,
    pub deliveries: Vec<Delivery>,
}
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Token {
    pub id: String,
    pub name: String,
    pub prefix: String,
    pub created_at: String,
    pub last_used_at: Option<String>,
    pub expires_at: Option<String>,
    pub revoked_at: Option<String>,
}
#[derive(Serialize, ToSchema)]
pub struct CreatedToken {
    pub token: Token,
    pub secret: String,
}
#[derive(Serialize, ToSchema)]
pub struct Period {
    pub from: String,
    pub to: String,
    pub granularity: String,
}
#[derive(Default, Serialize, ToSchema)]
pub struct Queue {
    pub pending: i64,
    pub retry_scheduled: i64,
    pub in_flight: i64,
    pub paused: i64,
    pub oldest_pending_age_seconds: Option<i64>,
}
#[derive(Serialize, ToSchema)]
pub struct Summary {
    pub period: Period,
    pub received: i64,
    pub delivered: i64,
    pub permanent_failed: i64,
    pub failed_attempts: i64,
    pub finalized_attempts: i64,
    pub failure_rate: Option<f64>,
    pub queue: Queue,
}
#[derive(Default, Serialize, ToSchema)]
pub struct SeriesPoint {
    pub timestamp: String,
    pub received: i64,
    pub delivered: i64,
    pub failed_attempts: i64,
}
#[derive(Serialize, ToSchema)]
pub struct Timeseries {
    pub period: Period,
    pub points: Vec<SeriesPoint>,
}
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct DestinationStats {
    pub destination_id: String,
    pub destination_name: String,
    pub namespace_name: String,
    pub status: String,
    pub delivered: i64,
    pub pending: i64,
    pub retry_scheduled: i64,
    pub in_flight: i64,
    pub permanent_failed: i64,
    pub last_error: Option<String>,
    pub last_error_at: Option<String>,
}

#[derive(Deserialize, ToSchema)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}
#[derive(Deserialize, ToSchema)]
pub struct NamespaceInput {
    pub name: String,
    pub slug: String,
    pub ingress_secret: Option<String>,
}
#[derive(Deserialize, ToSchema)]
pub struct DestinationInput {
    pub name: String,
    pub url: String,
    #[schema(nullable = true, minimum = 0, maximum = 1000000, default = 288)]
    pub max_retries: Option<i64>,
    #[schema(minimum = 1, maximum = 604800, default = 300)]
    pub retry_interval_seconds: i64,
    #[schema(minimum = 1, maximum = 300, default = 15)]
    pub timeout_seconds: i64,
}
#[derive(Deserialize, ToSchema)]
pub struct TokenInput {
    pub name: String,
    pub expires_at: Option<String>,
}
#[derive(Deserialize, ToSchema)]
pub struct ReplayInput {
    pub destination_ids: Vec<String>,
}
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ReplayResult {
    pub delivery_ids: Vec<String>,
}
#[derive(Serialize, ToSchema)]
pub struct ApiProblem {
    pub error: Problem,
}
#[derive(Serialize, ToSchema)]
pub struct Problem {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<std::collections::BTreeMap<String, String>>,
}
