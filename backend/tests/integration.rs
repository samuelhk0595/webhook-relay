use axum::{
    Router,
    body::Bytes,
    extract::State,
    http::{HeaderMap, Method, StatusCode, Uri},
    response::IntoResponse,
    routing::any,
};
use chrono::{Duration, Utc};
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde_json::{Value, json};
use sha2::Sha256;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicUsize, Ordering},
};
use tempfile::TempDir;
use webhook_forwarder::{App, api, auth, config::Config, db, stamp, worker};

struct TestApp {
    app: App,
    base: String,
    cookie: String,
    csrf: String,
    server: tokio::task::JoinHandle<()>,
    _dir: TempDir,
}
impl Drop for TestApp {
    fn drop(&mut self) {
        self.server.abort();
    }
}
impl TestApp {
    async fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let config = Config {
            database: dir.path().join("test.db"),
            listen: listener.local_addr().unwrap().to_string(),
            public_url: base.clone(),
            admin_dist: dir.path().join("dist"),
            secure_cookie: false,
            max_body: 1024 * 1024,
            max_headers: 65536,
            ingress_concurrency: 8,
            concurrency: 4,
            per_destination: 1,
            retention_days: 7,
            failed_retention_days: 30,
        };
        let app = App::new(config).await.unwrap();
        auth::bootstrap(&app, "admin".into(), "local-test-password-123".into())
            .await
            .unwrap();
        let router = api::router(app.clone());
        let server = tokio::spawn(async move {
            axum::serve(listener, router).await.unwrap();
        });
        let res = Client::new()
            .post(format!("{base}/api/v1/auth/login"))
            .json(&json!({"username":"admin","password":"local-test-password-123"}))
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), 200);
        let cookie = res.headers()["set-cookie"]
            .to_str()
            .unwrap()
            .split(';')
            .next()
            .unwrap()
            .to_owned();
        let csrf = res.json::<Value>().await.unwrap()["csrf_token"]
            .as_str()
            .unwrap()
            .to_owned();
        Self {
            app,
            base,
            cookie,
            csrf,
            server,
            _dir: dir,
        }
    }
    fn request(&self, method: Method, path: &str) -> reqwest::RequestBuilder {
        Client::new()
            .request(method, format!("{}/api/v1{path}", self.base))
            .header("cookie", &self.cookie)
            .header("x-csrf-token", &self.csrf)
    }
    async fn post(&self, path: &str, value: Value) -> Value {
        let response = self
            .request(Method::POST, path)
            .json(&value)
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), 201, "{}", response.text().await.unwrap());
        response.json().await.unwrap()
    }
    async fn get(&self, path: &str) -> Value {
        let response = self.request(Method::GET, path).send().await.unwrap();
        assert_eq!(response.status(), 200);
        response.json().await.unwrap()
    }
    async fn patch(&self, path: &str, value: Value) {
        let res = self
            .request(Method::PATCH, path)
            .json(&value)
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), 200, "{}", res.text().await.unwrap());
    }
    async fn namespace(&self) -> String {
        self.post("/namespaces", json!({"name":"Casa","slug":"casa"}))
            .await["id"]
            .as_str()
            .unwrap()
            .into()
    }
    async fn destination(&self, ns: &str, url: &str, max: Value) -> String {
        self.post(&format!("/namespaces/{ns}/destinations"),json!({"name":"PC","url":url,"max_retries":max,"retry_interval_seconds":1,"timeout_seconds":1})).await["id"].as_str().unwrap().into()
    }
    async fn ingress(&self, body: Vec<u8>) -> Value {
        let res = Client::new()
            .post(format!("{}/casa", self.base))
            .body(body)
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), 202);
        res.json().await.unwrap()
    }
    async fn tick(&self) -> bool {
        if let Some(work) = worker::claim(&self.app).await.unwrap() {
            let result = worker::deliver(&self.app, &work).await;
            worker::finish(&self.app, &work, result).await.unwrap();
            true
        } else {
            false
        }
    }
    async fn due(&self) {
        sqlx::query("UPDATE deliveries SET next_attempt_at='2000-01-01T00:00:00.000Z' WHERE state='retry_scheduled'").execute(&self.app.pool).await.unwrap();
    }
    async fn summary(&self) -> Value {
        let from = stamp(Utc::now() - Duration::minutes(1));
        let to = stamp(Utc::now() + Duration::minutes(1));
        self.get(&format!("/stats/summary?from={from}&to={to}"))
            .await
    }
}
#[derive(Clone)]
struct ReceiverState {
    calls: Arc<AtomicUsize>,
    requests: Arc<Mutex<Vec<Captured>>>,
    failures: usize,
    status: u16,
    delay: bool,
}
struct Captured {
    body: Bytes,
    headers: HeaderMap,
    method: Method,
    uri: Uri,
}
struct Receiver {
    url: String,
    state: ReceiverState,
    task: tokio::task::JoinHandle<()>,
}
impl Drop for Receiver {
    fn drop(&mut self) {
        self.task.abort();
    }
}
impl Receiver {
    async fn new(failures: usize, status: u16, delay: bool) -> Self {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/hook?fixed=1", listener.local_addr().unwrap());
        let state = ReceiverState {
            calls: Arc::new(AtomicUsize::new(0)),
            requests: Arc::new(Mutex::new(Vec::new())),
            failures,
            status,
            delay,
        };
        async fn receive(
            State(state): State<ReceiverState>,
            method: Method,
            uri: Uri,
            headers: HeaderMap,
            body: Bytes,
        ) -> axum::response::Response {
            state.requests.lock().unwrap().push(Captured {
                body,
                headers,
                method,
                uri,
            });
            let number = state.calls.fetch_add(1, Ordering::SeqCst);
            if state.delay {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
            (
                StatusCode::from_u16(if number < state.failures {
                    503
                } else {
                    state.status
                })
                .unwrap(),
                [("location", "/redirected")],
                "diagnóstico",
            )
                .into_response()
        }
        let router = Router::new()
            .fallback(any(receive))
            .with_state(state.clone());
        let task = tokio::spawn(async move {
            axum::serve(listener, router).await.unwrap();
        });
        Self { url, state, task }
    }
    fn calls(&self) -> usize {
        self.state.calls.load(Ordering::SeqCst)
    }
}

#[tokio::test]
async fn fanout_preserves_binary_hmac_headers_and_independent_retries() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let a = Receiver::new(0, 204, false).await;
    let b = Receiver::new(2, 200, false).await;
    let c = Receiver::new(0, 201, false).await;
    t.destination(&ns, &a.url, json!(0)).await;
    t.destination(&ns, &b.url, json!(3)).await;
    t.destination(&ns, &c.url, json!(0)).await;
    let bytes = b"{ \"z\": 1, \"a\": 2 }\n\x00\xff".to_vec();
    let mut mac = Hmac::<Sha256>::new_from_slice(b"test-hmac-key").unwrap();
    mac.update(&bytes);
    let signature = format!("sha256={:x}", mac.finalize().into_bytes());
    let res = Client::new()
        .put(format!("{}/casa?a=%2f&a=2", t.base))
        .header("x-hub-signature-256", &signature)
        .header("authorization", "Bearer wf_provider_credential")
        .header("x-repeat", "one")
        .header("x-repeat", "two")
        .header("connection", "x-drop")
        .header("x-drop", "remove")
        .header("x-forwarded-for", "untrusted")
        .header("cookie", "wf_session=secret; provider=keep")
        .header("content-type", "application/octet-stream")
        .body(bytes.clone())
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 202);
    let event = res.json::<Value>().await.unwrap()["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    // ACK already committed event + three deliveries, before a worker can execute.
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM deliveries WHERE event_id=?")
        .bind(&event)
        .fetch_one(&t.app.pool)
        .await
        .unwrap();
    assert_eq!(count, 3);
    while t.tick().await {}
    assert_eq!(a.calls(), 1);
    assert_eq!(b.calls(), 1);
    assert_eq!(c.calls(), 1);
    t.due().await;
    assert!(t.tick().await);
    t.due().await;
    assert!(t.tick().await);
    assert!(!t.tick().await);
    assert_eq!(a.calls(), 1);
    assert_eq!(b.calls(), 3);
    {
        let captured = a.state.requests.lock().unwrap();
        let request = &captured[0];
        assert_eq!(request.body.as_ref(), bytes);
        assert_eq!(request.method, Method::PUT);
        assert_eq!(request.uri.query(), Some("fixed=1&a=%2f&a=2"));
        assert_eq!(request.headers["x-hub-signature-256"], signature);
        assert_eq!(request.headers.get_all("x-repeat").iter().count(), 2);
        assert!(!request.headers.contains_key("x-drop"));
        assert!(!request.headers.contains_key("x-forwarded-for"));
        assert_eq!(request.headers["cookie"], "provider=keep");
        assert_eq!(
            request.headers["authorization"],
            "Bearer wf_provider_credential"
        );
        assert_eq!(request.headers["x-wf-event-id"], event);
    }
    let summary = t.summary().await;
    assert_eq!(summary["received"], 1);
    assert_eq!(summary["delivered"], 3);
    assert_eq!(summary["failed_attempts"], 2);
    assert_eq!(summary["finalized_attempts"], 5);
    assert_eq!(summary["permanent_failed"], 0);
    let detail = t.get(&format!("/events/{event}")).await;
    assert_eq!(detail["event"]["delivery_count"], 3);
    assert!(
        detail["headers"]
            .as_array()
            .unwrap()
            .iter()
            .any(|h| h["redacted"] == true && h["name"] == "x-hub-signature-256")
    );
}

#[tokio::test]
async fn pause_current_url_policy_snapshot_archive_and_replay_idempotency() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let a = Receiver::new(0, 200, false).await;
    let b = Receiver::new(0, 200, false).await;
    let event = t.ingress(vec![1, 2, 3]).await["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    let dest = t.destination(&ns, &a.url, json!(0)).await;
    assert!(!t.tick().await);
    t.patch(&format!("/destinations/{dest}"), json!({"status":"paused"}))
        .await;
    let body = json!({"destination_ids":[dest]});
    let request = || {
        t.request(Method::POST, &format!("/events/{event}/replays"))
            .header("idempotency-key", "stable-key")
            .json(&body)
    };
    let first: Value = request().send().await.unwrap().json().await.unwrap();
    let second: Value = request().send().await.unwrap().json().await.unwrap();
    assert_eq!(first, second);
    assert_eq!(first["delivery_ids"].as_array().unwrap().len(), 1);
    assert!(!t.tick().await);
    assert_eq!(t.summary().await["queue"]["paused"], 1);
    t.patch(
        &format!("/destinations/{dest}"),
        json!({"status":"active","url":b.url,"max_retries":10}),
    )
    .await;
    assert!(t.tick().await);
    assert_eq!(a.calls(), 0);
    assert_eq!(b.calls(), 1);
    let detail = t.get(&format!("/events/{event}")).await;
    assert_eq!(detail["deliveries"][0]["max_retries"], 0);
    t.patch(&format!("/destinations/{dest}"), json!({"status":"paused"}))
        .await;
    t.ingress(vec![4]).await;
    t.patch(
        &format!("/destinations/{dest}"),
        json!({"status":"archived"}),
    )
    .await;
    assert!(!t.tick().await);
    let states: Vec<String> =
        sqlx::query_scalar("SELECT state FROM deliveries ORDER BY created_at")
            .fetch_all(&t.app.pool)
            .await
            .unwrap();
    assert!(states.contains(&"cancelled".into()));
    let new = t.ingress(vec![5]).await;
    assert_eq!(
        t.get(&format!("/events/{}", new["event_id"].as_str().unwrap()))
            .await["event"]["delivery_count"],
        0
    );
}

#[tokio::test]
async fn transaction_failure_never_acknowledges_or_leaves_partial_fanout() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    t.destination(&ns, "http://127.0.0.1:9/hook", json!(0))
        .await;
    sqlx::query("CREATE TRIGGER fail_fanout BEFORE INSERT ON deliveries BEGIN SELECT RAISE(ABORT,'test storage failure'); END").execute(&t.app.pool).await.unwrap();
    let res = Client::new()
        .post(format!("{}/casa", t.base))
        .body("not persisted")
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 503);
    for table in ["events", "deliveries", "metrics"] {
        let count: i64 = sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {table}"))
            .fetch_one(&t.app.pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }
}

#[tokio::test]
async fn retries_zero_finite_unlimited_redirect_and_timeout() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let redirect = Receiver::new(0, 302, false).await;
    let bad = Receiver::new(0, 400, false).await;
    let timeout = Receiver::new(0, 200, true).await;
    t.destination(&ns, &redirect.url, json!(0)).await;
    t.destination(&ns, &bad.url, json!(1)).await;
    t.destination(&ns, &timeout.url, Value::Null).await;
    let event = t.ingress(b"test".to_vec()).await["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    while t.tick().await {}
    assert_eq!(redirect.calls(), 1); // redirects are never followed
    t.due().await;
    while t.tick().await {}
    let detail = t.get(&format!("/events/{event}")).await;
    let deliveries = detail["deliveries"].as_array().unwrap();
    assert_eq!(
        deliveries.iter().filter(|d| d["state"] == "failed").count(),
        2
    );
    assert_eq!(
        deliveries
            .iter()
            .filter(|d| d["state"] == "retry_scheduled")
            .count(),
        1
    );
    assert_eq!(t.summary().await["permanent_failed"], 2);
}

#[tokio::test]
async fn persisted_queue_and_interrupted_attempt_recover_after_reopen() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let r = Receiver::new(0, 200, false).await;
    t.destination(&ns, &r.url, json!(1)).await;
    t.destination(&ns, &r.url, json!(0)).await;
    t.ingress(vec![0, 255]).await;
    let first = worker::claim(&t.app).await.unwrap().unwrap();
    let second = worker::claim(&t.app).await.unwrap().unwrap();
    assert!(worker::claim(&t.app).await.unwrap().is_none());
    // No completion is recorded: emulate loss of both in-flight calls and reopen SQLite.
    t.app.pool.close().await;
    let reopened = App::new((*t.app.config).clone()).await.unwrap();
    worker::recover(&reopened).await.unwrap();
    let attempts: Vec<String> = sqlx::query_scalar("SELECT outcome FROM attempts")
        .fetch_all(&reopened.pool)
        .await
        .unwrap();
    assert_eq!(attempts, vec!["interrupted", "interrupted"]);
    let known:i64=sqlx::query_scalar("SELECT COALESCE(SUM(count),0) FROM metrics WHERE kind IN ('attempt_failed','attempt_succeeded')").fetch_one(&reopened.pool).await.unwrap();
    assert_eq!(known, 0);
    sqlx::query("UPDATE deliveries SET next_attempt_at='2000-01-01T00:00:00.000Z' WHERE state='retry_scheduled'").execute(&reopened.pool).await.unwrap();
    let work = worker::claim(&reopened).await.unwrap().unwrap();
    let out = worker::deliver(&reopened, &work).await;
    worker::finish(&reopened, &work, out).await.unwrap();
    assert!(worker::claim(&reopened).await.unwrap().is_none());
    assert_eq!(r.calls(), 1);
    let states: Vec<String> = sqlx::query_scalar("SELECT state FROM deliveries")
        .fetch_all(&reopened.pool)
        .await
        .unwrap();
    assert!(states.contains(&"succeeded".into()) && states.contains(&"failed".into()));
    assert_ne!(first.delivery_id, second.delivery_id);
}

#[tokio::test]
async fn authentication_csrf_tokens_namespace_secret_and_secure_payload() {
    let t = TestApp::new().await;
    let client = Client::new();
    assert_eq!(
        client
            .get(format!("{}/api/v1/namespaces", t.base))
            .send()
            .await
            .unwrap()
            .status(),
        401
    );
    assert_eq!(
        client
            .post(format!("{}/api/v1/namespaces", t.base))
            .header("cookie", &t.cookie)
            .json(&json!({"name":"x","slug":"x"}))
            .send()
            .await
            .unwrap()
            .status(),
        403
    );
    let cross = client
        .post(format!("{}/api/v1/auth/login", t.base))
        .header("origin", "https://elsewhere.invalid")
        .json(&json!({"username":"admin","password":"local-test-password-123"}))
        .send()
        .await
        .unwrap();
    assert_eq!(cross.status(), 403);
    let token = t
        .post("/tokens", json!({"name":"agent","expires_at":null}))
        .await;
    let value = token["secret"].as_str().unwrap();
    let res = client
        .get(format!("{}/api/v1/openapi.json", t.base))
        .bearer_auth(value)
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
    let list = t.get("/tokens").await;
    assert!(list["items"][0].get("secret").is_none());
    let ns = t
        .post(
            "/namespaces",
            json!({"name":"Casa","slug":"casa","ingress_secret":"test-ingress-secret"}),
        )
        .await;
    let ns = ns["id"].as_str().unwrap();
    assert_eq!(
        client
            .post(format!("{}/casa", t.base))
            .send()
            .await
            .unwrap()
            .status(),
        401
    );
    let receiver = Receiver::new(0, 204, false).await;
    t.destination(ns, &receiver.url, json!(0)).await;
    let event = client
        .post(format!("{}/casa", t.base))
        .header("x-webhook-secret", "test-ingress-secret")
        .header("authorization", format!("Bearer {value}"))
        .body(vec![0, 1, 255])
        .send()
        .await
        .unwrap()
        .json::<Value>()
        .await
        .unwrap()["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert!(t.tick().await);
    {
        let requests = receiver.state.requests.lock().unwrap();
        assert!(!requests[0].headers.contains_key("x-webhook-secret"));
        assert!(!requests[0].headers.contains_key("authorization"));
    }
    let payload = t
        .request(
            Method::GET,
            &format!("/events/{event}/payload?preview_bytes=2"),
        )
        .send()
        .await
        .unwrap();
    assert_eq!(payload.headers()["x-payload-truncated"], "true");
    assert_eq!(
        payload.headers()["content-type"],
        "application/octet-stream"
    );
    assert_eq!(payload.headers()["cache-control"], "no-store");
    assert_eq!(payload.bytes().await.unwrap().as_ref(), [0, 1]);
    assert_eq!(
        t.request(
            Method::DELETE,
            &format!("/tokens/{}", token["token"]["id"].as_str().unwrap())
        )
        .send()
        .await
        .unwrap()
        .status(),
        204
    );
    assert_eq!(
        client
            .get(format!("{}/api/v1/namespaces", t.base))
            .bearer_auth(value)
            .send()
            .await
            .unwrap()
            .status(),
        401
    );
    assert_eq!(
        t.request(Method::POST, "/auth/logout")
            .send()
            .await
            .unwrap()
            .status(),
        204
    );
    assert_eq!(
        t.request(Method::GET, "/auth/me")
            .send()
            .await
            .unwrap()
            .status(),
        401
    );
}

#[tokio::test]
async fn retention_keeps_paused_payloads_and_historical_metrics_and_replay_failure() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let r = Receiver::new(1, 200, false).await;
    let dest = t.destination(&ns, &r.url, json!(0)).await;
    let event = t.ingress(vec![9]).await["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert!(t.tick().await);
    assert_eq!(t.summary().await["permanent_failed"], 1);
    t.request(Method::POST, &format!("/events/{event}/replays"))
        .header("idempotency-key", "new-cycle")
        .json(&json!({"destination_ids":[dest]}))
        .send()
        .await
        .unwrap();
    assert!(t.tick().await);
    t.patch(&format!("/destinations/{dest}"), json!({"status":"paused"}))
        .await;
    let pending = t.ingress(vec![8]).await["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    let old = stamp(Utc::now() - Duration::days(40));
    sqlx::query("UPDATE events SET received_at=?")
        .bind(&old)
        .execute(&t.app.pool)
        .await
        .unwrap();
    sqlx::query("UPDATE deliveries SET created_at=?,completed_at=CASE WHEN completed_at IS NOT NULL THEN ? ELSE NULL END").bind(&old).bind(&old).execute(&t.app.pool).await.unwrap();
    assert_eq!(db::cleanup(&t.app).await.unwrap(), 1);
    assert_eq!(
        t.request(Method::GET, &format!("/events/{event}/payload"))
            .send()
            .await
            .unwrap()
            .status(),
        410
    );
    assert_eq!(
        t.request(Method::GET, &format!("/events/{pending}/payload"))
            .send()
            .await
            .unwrap()
            .status(),
        200
    );
    let summary = t.summary().await;
    assert_eq!(summary["received"], 2);
    assert_eq!(summary["permanent_failed"], 1);
    assert_eq!(summary["delivered"], 1);
    assert_eq!(summary["failed_attempts"], 1);
    assert_eq!(summary["queue"]["paused"], 1);
    // Queue ignores the historical date filter; destination filters do not multiply received.
    let other = t
        .get(&format!(
            "/stats/summary?from=2020-01-01T00:00:00Z&to=2020-01-02T00:00:00Z&destination_id={dest}"
        ))
        .await;
    assert_eq!(other["received"], 0);
    assert_eq!(other["failure_rate"], Value::Null);
    assert_eq!(other["queue"]["pending"], 1);
}

#[tokio::test]
async fn unknown_namespace_validation_pagination_and_backup() {
    let t = TestApp::new().await;
    assert_eq!(
        Client::new()
            .post(format!("{}/unknown", t.base))
            .send()
            .await
            .unwrap()
            .status(),
        404
    );
    for slug in ["api", "admin", "healthz", "bad/path"] {
        assert_eq!(
            t.request(Method::POST, "/namespaces")
                .json(&json!({"name":"bad","slug":slug}))
                .send()
                .await
                .unwrap()
                .status(),
            422
        );
    }
    let ns = t.namespace().await;
    for url in [
        "ftp://example.com",
        "http://user:pass@example.com",
        t.base.as_str(),
    ] {
        assert_eq!(
            t.request(Method::POST, &format!("/namespaces/{ns}/destinations"))
                .json(&json!({"name":"bad","url":url}))
                .send()
                .await
                .unwrap()
                .status(),
            422
        );
    }
    t.post("/namespaces", json!({"name":"Second","slug":"second"}))
        .await;
    let first = t.get("/namespaces?limit=1").await;
    let second = t
        .get(&format!(
            "/namespaces?limit=1&cursor={}",
            first["next_cursor"].as_str().unwrap()
        ))
        .await;
    assert_ne!(first["items"][0]["id"], second["items"][0]["id"]);
    assert!(second["next_cursor"].is_null());
    let backup = t._dir.path().join("backup.db");
    db::backup(&t.app.config.database, &backup).await.unwrap();
    let pool = db::connect(&backup).await.unwrap();
    let n: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM namespaces")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(n, 2);
    pool.close().await;
}

#[test]
fn openapi_has_resolvable_schema_references_and_all_operations() {
    let doc = webhook_forwarder::openapi::document();
    fn walk(v: &Value, doc: &Value) {
        match v {
            Value::Object(o) => {
                if let Some(Value::String(r)) = o.get("$ref") {
                    assert!(
                        doc.pointer(r.strip_prefix('#').unwrap()).is_some(),
                        "Unresolved {r}"
                    );
                }
                for v in o.values() {
                    walk(v, doc);
                }
            }
            Value::Array(a) => {
                for v in a {
                    walk(v, doc);
                }
            }
            _ => {}
        }
    }
    walk(&doc, &doc);
    assert!(doc["paths"].as_object().unwrap().len() >= 20);
    for path in doc["paths"].as_object().unwrap().values() {
        for operation in path.as_object().unwrap().values() {
            let mut parameters = std::collections::HashSet::new();
            for parameter in operation["parameters"].as_array().unwrap() {
                assert!(
                    parameters.insert((
                        parameter["in"].as_str().unwrap(),
                        parameter["name"].as_str().unwrap()
                    )),
                    "Duplicate OpenAPI parameter"
                );
            }
        }
    }
}

#[tokio::test]
async fn methods_limits_bounded_diagnostics_and_exactly_once_finalization() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/hook", listener.local_addr().unwrap());
    let count = Arc::new(AtomicUsize::new(0));
    let state = count.clone();
    let receiver = Router::new().fallback(any(move |body: Bytes| {
        let count = state.clone();
        async move {
            assert_eq!(body.as_ref(), b"bytes");
            count.fetch_add(1, Ordering::SeqCst);
            (StatusCode::OK, vec![b'x'; 16384])
        }
    }));
    let task = tokio::spawn(async move {
        axum::serve(listener, receiver).await.unwrap();
    });
    t.destination(&ns, &url, json!(0)).await;
    for method in [
        Method::POST,
        Method::PUT,
        Method::PATCH,
        Method::DELETE,
        Method::GET,
        Method::HEAD,
    ] {
        let res = Client::new()
            .request(method.clone(), format!("{}/casa", t.base))
            .body("bytes")
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), 202);
        if method == Method::HEAD {
            assert!(res.bytes().await.unwrap().is_empty());
        }
        let work = worker::claim(&t.app).await.unwrap().unwrap();
        let out = worker::deliver(&t.app, &work).await;
        assert!(out.success);
        assert!(out.excerpt.as_ref().unwrap().len() <= 4096);
        worker::finish(&t.app, &work, out.clone()).await.unwrap();
        worker::finish(&t.app, &work, out).await.unwrap();
    }
    assert_eq!(count.load(Ordering::SeqCst), 6);
    let summary = t.summary().await;
    assert_eq!(summary["received"], 6);
    assert_eq!(summary["delivered"], 6);
    assert_eq!(summary["finalized_attempts"], 6);
    let res = Client::new()
        .post(format!("{}/casa", t.base))
        .body(vec![1; t.app.config.max_body + 1])
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 413);
    let permit = t
        .app
        .ingress
        .acquire_many(t.app.config.ingress_concurrency as u32)
        .await
        .unwrap();
    let res = Client::new()
        .post(format!("{}/casa", t.base))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 429);
    drop(permit);
    task.abort();
}

#[tokio::test]
async fn replay_conflict_archive_inflight_and_password_reset_revocation() {
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let receiver = Receiver::new(1, 200, false).await;
    let dest = t.destination(&ns, &receiver.url, json!(5)).await;
    let event = t.ingress(vec![1]).await["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    let response = t
        .request(Method::POST, &format!("/events/{event}/replays"))
        .header("idempotency-key", "same-intention")
        .json(&json!({"destination_ids":[dest]}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 201);
    let second = t.ingress(vec![2]).await["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    let response = t
        .request(Method::POST, &format!("/events/{second}/replays"))
        .header("idempotency-key", "same-intention")
        .json(&json!({"destination_ids":[dest]}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 409);
    let work = worker::claim(&t.app).await.unwrap().unwrap();
    assert!(
        worker::claim(&t.app).await.unwrap().is_none(),
        "Per-destination limit includes in-flight work"
    );
    t.patch(
        &format!("/destinations/{dest}"),
        json!({"status":"archived"}),
    )
    .await;
    let out = worker::deliver(&t.app, &work).await;
    worker::finish(&t.app, &work, out).await.unwrap();
    let states: Vec<String> = sqlx::query_scalar("SELECT state FROM deliveries")
        .fetch_all(&t.app.pool)
        .await
        .unwrap();
    assert!(states.iter().all(|s| s == "cancelled"));
    assert!(!t.tick().await);
    let token = t
        .post("/tokens", json!({"name":"reset-check","expires_at":null}))
        .await;
    auth::reset_password(&t.app, "replacement-password-123".into())
        .await
        .unwrap();
    assert_eq!(
        t.request(Method::GET, "/auth/me")
            .send()
            .await
            .unwrap()
            .status(),
        401
    );
    assert_eq!(
        Client::new()
            .get(format!("{}/api/v1/namespaces", t.base))
            .bearer_auth(token["secret"].as_str().unwrap())
            .send()
            .await
            .unwrap()
            .status(),
        401
    );
    let login = Client::new()
        .post(format!("{}/api/v1/auth/login", t.base))
        .json(&json!({"username":"admin","password":"replacement-password-123"}))
        .send()
        .await
        .unwrap();
    assert_eq!(login.status(), 200);
}

#[tokio::test]
async fn diagnostic_timeout_never_overrides_observed_2xx_and_invalid_utf8_is_bounded() {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let t = TestApp::new().await;
    let ns = t.namespace().await;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/hook", listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        for number in 0..2 {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut request = [0u8; 4096];
            let _ = stream.read(&mut request).await;
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 8192\r\nConnection: close\r\n\r\n")
                .await
                .unwrap();
            if number == 0 {
                // Headers prove success, even if the diagnostic body never arrives in time.
                tokio::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    let _ = stream.write_all(&vec![b'x'; 8192]).await;
                });
            } else {
                let _ = stream.write_all(&vec![255; 8192]).await;
            }
        }
    });
    t.destination(&ns, &url, json!(0)).await;
    for _ in 0..2 {
        t.ingress(b"test".to_vec()).await;
        assert!(t.tick().await);
    }
    let rows: Vec<(String, Option<String>)> =
        sqlx::query_as("SELECT outcome,response_excerpt FROM attempts ORDER BY started_at")
            .fetch_all(&t.app.pool)
            .await
            .unwrap();
    assert!(rows.iter().all(|(state,excerpt)|state=="succeeded"&&excerpt.as_ref().unwrap().len()<=4096));
    assert!(!rows[1].1.as_ref().unwrap().is_empty());
    assert_eq!(t.summary().await["failed_attempts"], 0);
    task.await.unwrap();
}
