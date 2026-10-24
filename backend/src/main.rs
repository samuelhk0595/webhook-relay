use fs2::FileExt;
use std::{env, fs::OpenOptions, path::PathBuf};
use tokio_util::sync::CancellationToken;
use webhook_forwarder::{App, auth, config::Config, db, worker};

fn password() -> anyhow::Result<String> {
    Ok(if let Ok(path) = env::var("BOOTSTRAP_PASSWORD_FILE") {
        std::fs::read_to_string(path)?
            .trim_end_matches(['\r', '\n'])
            .to_owned()
    } else {
        env::var("BOOTSTRAP_PASSWORD")?
    })
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "webhook_forwarder=info".into()),
        )
        .init();
    let config = Config::from_env()?;
    let args: Vec<String> = env::args().collect();
    if args.get(1).map(String::as_str) == Some("openapi") {
        println!(
            "{}",
            serde_json::to_string_pretty(&webhook_forwarder::openapi::document())?
        );
        return Ok(());
    }
    if args.get(1).map(String::as_str) == Some("backup") {
        let destination = PathBuf::from(
            args.get(2)
                .ok_or_else(|| anyhow::anyhow!("Usage: webhook-forwarder backup <new-path>"))?,
        );
        db::backup(&config.database, &destination).await?;
        return Ok(());
    }
    if let Some(parent) = config
        .database
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
    {
        std::fs::create_dir_all(parent)?;
    }
    let lock = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(config.database.with_extension("db.lock-writer"))?;
    lock.try_lock_exclusive()
        .map_err(|_| anyhow::anyhow!("Another instance owns this database"))?;
    let app = App::new(config).await?;
    if args.get(1).map(String::as_str) == Some("reset-password") {
        auth::reset_password(&app, password()?).await?;
        return Ok(());
    }
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM admin")
        .fetch_one(&app.pool)
        .await?;
    if count == 0 {
        let username=env::var("BOOTSTRAP_USERNAME").map_err(|_|anyhow::anyhow!("First startup requires BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD_FILE (or BOOTSTRAP_PASSWORD)"))?;
        auth::bootstrap(&app, username, password()?).await?;
    }
    worker::recover(&app)
        .await
        .map_err(|e| anyhow::anyhow!("Recovery failed: {}", e.1))?;
    let listener = tokio::net::TcpListener::bind(&app.config.listen).await?;
    tracing::info!(listen=%listener.local_addr()?,"webhook forwarder ready");
    let stop = CancellationToken::new();
    let worker_task = tokio::spawn(worker::run(app.clone(), stop.clone()));
    let shutdown = stop.clone();
    axum::serve(listener, webhook_forwarder::api::router(app.clone()))
        .with_graceful_shutdown(async move {
            #[cfg(unix)]
            {
                let mut term =
                    tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                        .unwrap();
                tokio::select! {_=tokio::signal::ctrl_c()=>{},_=term.recv()=>{}}
            }
            #[cfg(not(unix))]
            {
                let _ = tokio::signal::ctrl_c().await;
            }
            shutdown.cancel();
        })
        .await?;
    stop.cancel();
    worker_task.await?;
    app.pool.close().await;
    drop(lock);
    Ok(())
}
