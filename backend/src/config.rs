use std::{env, path::PathBuf};

#[derive(Clone, Debug)]
pub struct Config {
    pub database: PathBuf,
    pub listen: String,
    pub public_url: String,
    pub admin_dist: PathBuf,
    pub secure_cookie: bool,
    pub max_body: usize,
    pub max_headers: usize,
    pub ingress_concurrency: usize,
    pub concurrency: usize,
    pub per_destination: usize,
    pub retention_days: i64,
    pub failed_retention_days: i64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        fn number<T: std::str::FromStr>(name: &str, default: T) -> anyhow::Result<T> {
            match env::var(name) {
                Ok(s) => s.parse().map_err(|_| anyhow::anyhow!("Invalid {name}")),
                Err(_) => Ok(default),
            }
        }
        let config = Self {
            database: env::var("DATABASE_PATH")
                .unwrap_or_else(|_| "data/forwarder.db".into())
                .into(),
            listen: env::var("LISTEN_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".into()),
            public_url: env::var("PUBLIC_URL")
                .unwrap_or_else(|_| "http://localhost:8080".into())
                .trim_end_matches('/')
                .into(),
            admin_dist: env::var("ADMIN_DIST")
                .unwrap_or_else(|_| "../frontend/dist".into())
                .into(),
            secure_cookie: env::var("COOKIE_SECURE")
                .unwrap_or_else(|_| "true".into())
                .parse()?,
            max_body: number("MAX_BODY_BYTES", 10 * 1024 * 1024)?,
            max_headers: number("MAX_HEADER_BYTES", 64 * 1024)?,
            ingress_concurrency: number("INGRESS_CONCURRENCY", 64)?,
            concurrency: number("WORKER_CONCURRENCY", 16)?,
            per_destination: number("DESTINATION_CONCURRENCY", 2)?,
            retention_days: number("RETENTION_DAYS", 7)?,
            failed_retention_days: number("FAILED_RETENTION_DAYS", 30)?,
        };
        let url = url::Url::parse(&config.public_url)?;
        anyhow::ensure!(
            matches!(url.scheme(), "http" | "https")
                && url.host_str().is_some()
                && url.username().is_empty()
                && url.password().is_none()
                && url.path() == "/"
                && url.query().is_none()
                && url.fragment().is_none(),
            "PUBLIC_URL must be an HTTP(S) origin"
        );
        anyhow::ensure!(
            config.concurrency > 0
                && config.per_destination > 0
                && config.ingress_concurrency > 0
                && config.max_body > 0
                && config.max_headers > 0
                && config.retention_days > 0
                && config.failed_retention_days >= config.retention_days,
            "Invalid limits/retention"
        );
        Ok(config)
    }
}
