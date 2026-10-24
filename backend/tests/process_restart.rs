use chrono::{Duration, Utc};
use reqwest::Client;
use serde_json::{Value, json};
use std::{
    process::{Child, Command, Stdio},
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
};
use webhook_forwarder::stamp;

struct Process(Child);
impl Drop for Process {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

async fn ready(base: &str) {
    for _ in 0..100 {
        if Client::new()
            .get(format!("{base}/readyz"))
            .send()
            .await
            .is_ok_and(|r| r.status().is_success())
        {
            return;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    panic!("Real backend process did not become ready");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn abrupt_process_restart_recovers_durable_work_and_enforces_single_owner() {
    let dir = tempfile::tempdir().unwrap();
    let password = dir.path().join("password");
    std::fs::write(&password, "process-test-password-123").unwrap();
    let socket = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let listen = socket.local_addr().unwrap().to_string();
    drop(socket);
    let base = format!("http://{listen}");
    let spawn = || {
        Process(
            Command::new(env!("CARGO_BIN_EXE_webhook-forwarder"))
                .env("DATABASE_PATH", dir.path().join("db.sqlite"))
                .env("LISTEN_ADDR", &listen)
                .env("PUBLIC_URL", &base)
                .env("COOKIE_SECURE", "false")
                .env("BOOTSTRAP_USERNAME", "operator")
                .env("BOOTSTRAP_PASSWORD_FILE", &password)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .unwrap(),
        )
    };
    let mut process = spawn();
    ready(&base).await;
    let mut duplicate = spawn();
    let status = duplicate.0.wait().unwrap();
    assert!(
        !status.success(),
        "A second process must not own the same database"
    );
    let client = Client::new();
    let response = client
        .post(format!("{base}/api/v1/auth/login"))
        .json(&json!({"username":"operator","password":"process-test-password-123"}))
        .send()
        .await
        .unwrap();
    let cookie = response.headers()["set-cookie"]
        .to_str()
        .unwrap()
        .split(';')
        .next()
        .unwrap()
        .to_string();
    let csrf = response.json::<Value>().await.unwrap()["csrf_token"]
        .as_str()
        .unwrap()
        .to_string();
    let post = |path: &str, body: Value| {
        client
            .post(format!("{base}/api/v1{path}"))
            .header("cookie", &cookie)
            .header("x-csrf-token", &csrf)
            .json(&body)
    };
    let ns = post("/namespaces", json!({"name":"Restart","slug":"restart"}))
        .send()
        .await
        .unwrap()
        .json::<Value>()
        .await
        .unwrap();
    let calls = Arc::new(AtomicUsize::new(0));
    let state = calls.clone();
    let receiver = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/hook", receiver.local_addr().unwrap());
    let router = axum::Router::new().fallback(axum::routing::any(move || {
        let calls = state.clone();
        async move {
            let n = calls.fetch_add(1, Ordering::SeqCst);
            if n == 0 {
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            }
            axum::http::StatusCode::NO_CONTENT
        }
    }));
    let receiver_task = tokio::spawn(async move {
        axum::serve(receiver, router).await.unwrap();
    });
    let dest=post(&format!("/namespaces/{}/destinations",ns["id"].as_str().unwrap()),json!({"name":"Local receiver","url":url,"max_retries":1,"retry_interval_seconds":1,"timeout_seconds":15})).send().await.unwrap();
    assert_eq!(dest.status(), 201);
    let response = client
        .post(format!("{base}/restart"))
        .body(vec![0, 255, 3])
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 202);
    let event = response.json::<Value>().await.unwrap()["event_id"]
        .as_str()
        .unwrap()
        .to_owned();
    for _ in 0..100 {
        if calls.load(Ordering::SeqCst) == 1 {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
    }
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    process.0.kill().unwrap();
    process.0.wait().unwrap();
    let _restarted = spawn();
    ready(&base).await;
    let get = |path: &str| {
        client
            .get(format!("{base}/api/v1{path}"))
            .header("cookie", &cookie)
    };
    let mut detail = Value::Null;
    for _ in 0..150 {
        detail = get(&format!("/events/{event}"))
            .send()
            .await
            .unwrap()
            .json::<Value>()
            .await
            .unwrap();
        if detail["deliveries"][0]["state"] == "succeeded" {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
    }
    assert_eq!(detail["deliveries"][0]["state"], "succeeded");
    assert_eq!(detail["deliveries"][0]["attempts_started"], 2);
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    let delivery = detail["deliveries"][0]["id"].as_str().unwrap();
    let attempts = get(&format!("/deliveries/{delivery}/attempts"))
        .send()
        .await
        .unwrap()
        .json::<Value>()
        .await
        .unwrap();
    assert_eq!(attempts["items"][0]["outcome"], "interrupted");
    assert_eq!(attempts["items"][1]["outcome"], "succeeded");
    let from = stamp(Utc::now() - Duration::minutes(1));
    let to = stamp(Utc::now() + Duration::minutes(1));
    let summary = get(&format!("/stats/summary?from={from}&to={to}"))
        .send()
        .await
        .unwrap()
        .json::<Value>()
        .await
        .unwrap();
    assert_eq!(summary["received"], 1);
    assert_eq!(summary["delivered"], 1);
    assert_eq!(summary["failed_attempts"], 0);
    assert_eq!(summary["finalized_attempts"], 1);
    receiver_task.abort();
}
