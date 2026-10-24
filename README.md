# Webhook Relay

Relay pessoal para uma VPS continuamente disponível. Grava evento, fan-out e métrica em **uma transação SQLite antes do `202`**, depois entrega independentemente a cada destino. Um computador doméstico pode ficar offline: sua fila permanece em disco.

Rust/Axum/Tokio/Reqwest/SQLx, SQLite WAL `synchronous=FULL`, OpenAPI Utoipa e o painel React reaproveitado. Um processo e um banco, sem broker ou runtime Node em produção.

- Repositório: https://github.com/samuelhk0595/webhook-relay
- Endereço de produção configurado: **https://hooks.codemob.com.br/admin/**
- API: `https://hooks.codemob.com.br/api/v1`; OpenAPI autenticado em `/api/v1/openapi.json`.
- Entrada dos provedores: `https://hooks.codemob.com.br/{namespace}`.
- [Deploy automático e operação da VPS](deploy/README.md).

## Início local

Requisitos: Rust estável **1.88+** (validado 1.93.1), Node **22.12+** para build. Migrations são aplicadas automaticamente.

```powershell
# Na raiz, PowerShell:
npm --prefix frontend ci
npm --prefix frontend run build

# Crie um arquivo privado com senha forte de 12–1024 bytes, fora do versionamento.
$env:BOOTSTRAP_USERNAME = "admin"
$env:BOOTSTRAP_PASSWORD_FILE = "C:\caminho\privado\relay-password.txt"
$env:PUBLIC_URL = "http://127.0.0.1:8080"
$env:COOKIE_SECURE = "false" # somente desenvolvimento HTTP local
```

Depois execute em `backend/`:

```powershell
cargo run --locked
# http://127.0.0.1:8080/admin/
```

Não existe senha padrão nem cadastro público. O bootstrap só cria o administrador se ele não existe; não altera senha nos reinícios. `BOOTSTRAP_PASSWORD` por ambiente é alternativa ao arquivo; não use senha em argumentos de comando. Executando em `backend/`, o banco default é `backend/data/forwarder.db`.

Para hot reload, exporte `DEV_ORIGIN=http://127.0.0.1:5173` no processo Rust, mantenha-o em execução e rode `npm run dev` em `frontend/`. O Vite encaminha `/api` para 8080; a produção é mesma origem, sem CORS permissivo. Linux usa `export VAR=valor` em vez de `$env:VAR`.

## Uso e semântica

1. Faça login, crie um namespace e cadastre os destinos.
2. Configure o provedor para enviar a `PUBLIC_URL/{slug}`. Namespace desconhecido/arquivado retorna 404.
3. Opcionalmente configure `X-Webhook-Secret`; o hash é armazenado e o header é removido no forwarding.
4. Inspecione eventos/tentativas, corrija URLs, pause/retome ou reenvie. Crie tokens para agentes na página Tokens: o valor aparece uma única vez.

O computador de casa precisa ser alcançável pela VPS quando ligado, por VPN/WireGuard, túnel ou URL pública. Redes privadas são permitidas intencionalmente.

- `max_retries=0`: inicial apenas. `N`: até `N+1` tentativas. `null`: ilimitado. Defaults **288 retries / 300s intervalo / 15s timeout**.
- Intervalo fixo após término; política copiada na entrega; **URL atual** por tentativa. Edição da política afeta apenas ciclos novos.
- Pausa acumula fila e conserva contador. Arquivamento exclui fan-out futuro e cancela pendências; chamada já iniciada pode terminar. Arquivar namespace não cancela a fila existente.
- Um evento/três destinos = **um recebido/três entregas**. Falha de B não repete sucesso de A.
- POST, PUT, PATCH, DELETE, GET e HEAD; corpo binário e headers de aplicação repetidos preservados, sem reserialização/descompressão. A query original é anexada à query configurada com `&`, preservando codificação e repetições.
- Removidos: headers hop-by-hop e nomes de `Connection`, `Forwarded`, `X-Forwarded-*`, `X-Real-IP`, segredo de ingresso, CSRF, cookie `wf_session` e Bearer reconhecido pelo hash dos tokens próprios, mesmo revogados. Credenciais/assinaturas do provedor são preservadas; Host/tamanho são recalculados. IDs próprios sobrescrevem `X-WF-Event-ID` e `X-WF-Delivery-ID`.
- Sem redirects; **somente 2xx** é sucesso. TLS validado. Diagnóstico autenticado limitado a 4KiB e ao timeout.
- Evento sem destinos é retido; destino novo não recebe histórico automaticamente. Replay cria ciclo novo, com política atual e chave idempotente, sem apagar histórico.
- Queda durante uma chamada registra **interrupted / resultado desconhecido**, consome orçamento e só reagenda se houver tentativas disponíveis. Não entra na taxa de falha conhecida.
- Sem ordem estrita ou exactly-once: resposta perdida, queda ou replay podem duplicar efeitos. O receptor pode deduplicar pelos IDs.

### Métricas e retenção

Agregados persistentes por minuto UTC são transacionais. Recebidos, ciclos concluídos, falhas definitivas e tentativas com falha são unidades distintas. Taxa = falhas/tentativas de resultado conhecido; sem denominador retorna `null`. Destino não altera recebidos; fila atual ignora período.

Períodos `[from,to)`, alinhados ao minuto, máximo 366 dias. Presets do painel terminam no início do minuto corrente: atividade desse minuto aparece no próximo limite; a fila já é atual. Horários são exibidos no fuso do navegador.

Limpeza horária em lotes de 100 remove bytes/headers/diagnósticos de tentativas terminais após **7 dias**, ou **30 dias** se algum ciclo falhou definitivamente, considerando também o último término pertinente. Pendências, incluindo pausadas, impedem remoção. Metadados de eventos/ciclos, dimensões, idempotência e agregados permanecem como tombstones; payload expirado retorna `410`. Páginas livres são reutilizadas, mas o arquivo não diminui automaticamente. Métricas/metadados e filas ilimitadas podem crescer: monitore disco e faça backups.

## Configuração

Rust lê ambiente, **não carrega `.env` sozinho**. Compose usa `.env` pela CLI.

| Variável | Default/função |
|---|---|
| `DATABASE_PATH` | `data/forwarder.db`; disco local, não NFS |
| `LISTEN_ADDR` | `127.0.0.1:8080`; imagem usa `0.0.0.0:8080` |
| `PUBLIC_URL` | `http://localhost:8080`; origem pública sem path/query, usada em URLs e validação de Origin |
| `ADMIN_DIST` | `../frontend/dist`; imagem usa `/app/admin` |
| `COOKIE_SECURE` | `true`; false explícito para HTTP local |
| `DEV_ORIGIN` | vazio; origem extra exata para Vite |
| `BOOTSTRAP_USERNAME` | obrigatório na primeira execução |
| `BOOTSTRAP_PASSWORD_FILE` | arquivo privado, preferido a `BOOTSTRAP_PASSWORD` |
| `MAX_BODY_BYTES` / `MAX_HEADER_BYTES` | 10485760 / 65536 |
| `INGRESS_CONCURRENCY` | 64; excedente recebe 429; prazo máximo de requisição 30s |
| `WORKER_CONCURRENCY` / `DESTINATION_CONCURRENCY` | 16 / 2 |
| `RETENTION_DAYS` / `FAILED_RETENTION_DAYS` | 7 / 30; positivos, segundo >= primeiro |
| `RUST_LOG` | `webhook_forwarder=info`; JSON sem payload/senha/token |

Limites: intervalo 1–604800s, timeout 1–300s, retries 0–1000000 ou null; nome até 120 caracteres, URL até 4096, segredo 16–256 bytes. URLs HTTP/HTTPS absolutas sem userinfo/fragmento/loop óbvio para o relay.

Sessões de 12h, cookie HttpOnly/SameSite=Strict/Secure em produção, CSRF em mutações por cookie. Login limitado globalmente a 10 tentativas/minuto. Tokens de alta entropia são armazenados em SHA-256; senha em Argon2id. Sem RBAC.

Lock de arquivo exclusivo garante **uma instância ativa por banco**. Não escale réplicas nem remova o lock de um processo ativo. SIGTERM/Ctrl+C para aquisição e aguarda rede por até 30s; chamadas incompletas são recuperadas no startup.

## API para scripts/agentes

OpenAPI protegido: `GET /api/v1/openapi.json`, com cookie ou Bearer. Schemas Utoipa geram `frontend/src/lib/openapi.generated.ts`; o painel usa aliases desses tipos. `npm run api:check` verifica drift; `cargo run --locked -- openapi` exporta o mesmo documento offline, sem iniciar servidor/banco.

Exemplo Bash/curl com `jq`. Use seu domínio; não envie credenciais administrativas ao ingresso:

```bash
export RELAY_URL='https://hooks.example.com'
# Arquivo login.json privado: {"username":"admin","password":"SUA_SENHA"}
curl --fail-with-body -c cookies.txt -H 'Content-Type: application/json' \
  --data-binary @login.json "$RELAY_URL/api/v1/auth/login" > session.json
export CSRF="$(jq -r .csrf_token session.json)"
curl --fail-with-body -b cookies.txt -H "X-CSRF-Token: $CSRF" \
  -H 'Content-Type: application/json' -d '{"name":"Agente","expires_at":null}' \
  "$RELAY_URL/api/v1/tokens" > token-once.json
export WEBHOOK_TOKEN="$(jq -r .secret token-once.json)"
# Guarde o token e apague os arquivos locais sensíveis depois.
curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" "$RELAY_URL/api/v1/openapi.json"
export NAMESPACE_ID="$(curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Casa","slug":"casa"}' \
  "$RELAY_URL/api/v1/namespaces" | jq -r .id)"
export DESTINATION_ID="$(curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"PC","url":"http://10.8.0.2:9000/hooks","max_retries":288,"retry_interval_seconds":300,"timeout_seconds":15}' \
  "$RELAY_URL/api/v1/namespaces/$NAMESPACE_ID/destinations" | jq -r .id)"
export EVENT_ID="$(curl --fail-with-body -H 'Content-Type: application/json' \
  --data-binary @payload.json "$RELAY_URL/casa?source=local" | jq -r .event_id)"
curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" "$RELAY_URL/api/v1/events/$EVENT_ID"
# Gere REPLAY_KEY uma vez por intenção; reutilize após resposta perdida.
export REPLAY_KEY="$(openssl rand -hex 16)"
curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H "Idempotency-Key: $REPLAY_KEY" -H 'Content-Type: application/json' \
  -d "{\"destination_ids\":[\"$DESTINATION_ID\"]}" "$RELAY_URL/api/v1/events/$EVENT_ID/replays"
```

Coleções `{items,next_cursor}`, limit 1–100 (default 25). Eventos: recebimento/ID decrescente; namespaces/destinos/tokens/tentativas: criação/ID crescente; `/deliveries` e estatísticas por destino: ID estável. Filtros por entrega retornam eventos distintos. Erros `{error:{code,message,fields?}}`, sem redirect de login. Downloads autenticados são attachment/octet-stream/nosniff/no-store; headers sensíveis mascarados. [Contrato detalhado](frontend/CONTRATO_API.md).

## Publicação automática na VPS

O workflow [Verify and publish](.github/workflows/publish.yml) verifica pull requests e publica automaticamente após atualização da **`main` ou `master`**, incluindo merges. Também aceita execução manual em Actions. Os jobs têm timeout; deploys são serializados.

1. Rust: fmt/check/clippy/test; frontend: contrato gerado/typecheck/lint/build e Playwright com API simulada e integração real.
2. Docker Buildx gera imagem multi-stage `webhook-relay:<SHA>` e testa a imagem com SQLite real, healthcheck, SPA e autenticação.
3. A imagem imutável é transferida por SSH, com checksum e verificação do SHA OCI. Não há dependência de registry/token de leitura na VPS.
4. A VPS faz backup consistente do SQLite existente, carrega a imagem, recria apenas o serviço do relay e aguarda healthcheck.
5. O workflow verifica `https://hooks.codemob.com.br/readyz`. Se uma etapa falhar, a execução fica vermelha; versões anteriores e snapshot do banco são preservados.

Configuração em **GitHub → Settings → Secrets and variables → Actions**:

| Tipo | Nome | Conteúdo |
|---|---|---|
| Secret | `VPS_SSH_KEY` | Chave privada exclusiva do usuário de deploy |
| Variable | `VPS_HOST` | IP/hostname da VPS |
| Variable | `VPS_USER` | `webhook-deploy` |
| Variable | `VPS_PORT` | `22` |
| Variable | `VPS_HOST_KEY` | Linha conhecida de host SSH, validada antes do cadastro |

Senha administrativa e configuração de runtime ficam **na VPS**, fora do repositório e dos logs do Actions. O runner não recebe credenciais Cloudflare: o Traefik existente já é responsável pelo HTTPS.

A implantação usa `/opt/webhook-relay`, volume `webhook-relay-data` e rede Docker `edge`. Não publica portas extras: o Traefik compartilhado atende o domínio por um arquivo dinâmico separado, sem substituir as rotas das lojas. Veja [deploy/README.md](deploy/README.md) para provisionamento, comandos, rollback e recuperação.

## Instalação independente com Caddy

Para uma VPS nova, sem proxy existente em 80/443, há também um Compose standalone. **A VPS atual usa `compose.production.yaml`/Traefik, não este Compose**:

```bash
cp .env.example .env
# Edite DOMAIN/CADDY_EMAIL, aponte DNS e libere 80/443 TCP (443 UDP opcional).
umask 077
openssl rand -base64 32 > deploy/secrets/bootstrap_password.txt
# O runtime usa UID 10001. Secrets baseados em arquivo preservam UID/permissões.
sudo chown 10001:10001 deploy/secrets/bootstrap_password.txt
sudo chmod 400 deploy/secrets/bootstrap_password.txt
# Guarde a senha em local privado.
docker compose --env-file .env -f deploy/compose.yaml config --quiet
docker compose --env-file .env -f deploy/compose.yaml up -d --build
```

Abra `https://SEU_DOMAIN/admin/`. Só Caddy publica portas. Banco/certificados têm volumes persistentes; aplicação UID 10001, imagem somente leitura. `/healthz` é liveness, `/readyz` consulta banco/admin. Não use `down -v` em dados que quer preservar.

Atualização standalone: backup, cópia da imagem anterior, atualizar código e `up -d --build`. Migrations versionadas; rollback para schema incompatível exige restaurar backup. Na instalação da VPS atual, use a pipeline e os comandos de [deploy/README.md](deploy/README.md).

## Backup, restauração e acesso

Os comandos desta seção usam o Compose standalone. Os equivalentes para a VPS atual/Traefik estão em [deploy/README.md](deploy/README.md#operação-na-vps).

Backup consistente ao vivo usa SQLite **`VACUUM INTO`**, nunca cópia isolada de `.db` com WAL ativo:

```bash
docker compose --env-file .env -f deploy/compose.yaml exec app \
  webhook-forwarder backup /data/snapshot-2026-10-24.db
mkdir -p backups
docker compose --env-file .env -f deploy/compose.yaml cp \
  app:/data/snapshot-2026-10-24.db backups/snapshot.db
```

Destino deve ser novo, com espaço temporário para outro banco. Mova a cópia para armazenamento privado fora da VPS: contém payloads/hashes. Nativo em `backend/`: `cargo run --locked -- backup ../backups/snapshot.db`, com `DATABASE_PATH` correto.

Restauração: pare app, guarde estado atual e confira integridade (`sqlite3 backups/snapshot.db 'PRAGMA integrity_check;'` em host com SQLite). Substitua banco e remova WAL/SHM antigos **somente com servidor parado**. Exemplo Bash na raiz:

```bash
docker compose --env-file .env -f deploy/compose.yaml stop app
docker compose --env-file .env -f deploy/compose.yaml run --rm --no-deps --user 0 \
  --entrypoint sh -v "$PWD/backups:/restore:ro" app -c \
  'rm -f /data/forwarder.db-wal /data/forwarder.db-shm; cp /restore/snapshot.db /data/forwarder.db; chown 10001:10001 /data/forwarder.db; chmod 600 /data/forwarder.db'
docker compose --env-file .env -f deploy/compose.yaml up -d app
```

Recuperar acesso: com app parado, substitua o arquivo privado de senha, rode `docker compose --env-file .env -f deploy/compose.yaml run --rm --no-deps app reset-password` e inicie app. Nativo: `cargo run --locked -- reset-password` no mesmo banco. Revoga **todas as sessões/tokens**, sem apagar fila. Não existe rota pública de reset.

Restauração/reinício pode repetir efeitos remotos anteriores à perda da resposta. Confira readyz, tentativas interrupted e destinos. Disco cheio/erro de commit produz 503, não `202` falso. Diagnostique por IDs/status/categoria, sem logs de credenciais/payloads completos.

## Verificação

Em `backend/`:
```bash
cargo fmt --check
cargo check --locked
cargo clippy --all-targets --locked -- -D warnings
cargo test --locked
```

Em `frontend/`:
```bash
npm run api:check
npm run typecheck
npm run lint
npm run build
npm run test:e2e          # 16 cenários de interface com API simulada
npm run test:integration  # Rust/SQLite/worker/receptores reais, sem interceptação
```

Antes de `test:integration`, rode `cargo build --locked` em backend e build do frontend. Instale Chromium uma vez: `npx playwright install chromium`. A suíte real usa porta 4180 e banco temporário descartado ao terminar. Rust usa portas/bancos temporários, incluindo queda abrupta e bloqueio da segunda instância.

Resultados da implementação e verificações locais: [VALIDATION.md](VALIDATION.md). A pipeline executa também build/smoke da imagem e verificação HTTPS no destino; consulte seu run no GitHub Actions para o resultado de cada publicação. O daemon Docker do Windows local não é necessário para publicar.

Arquivos principais: `backend/src/{api,auth,worker,db,stats,openapi,config,models}.rs`, migrations/`Cargo.lock`; painel `frontend/src/`; `frontend/integration/real.spec.ts`; `Dockerfile`, `deploy/compose.yaml`, `deploy/Caddyfile`, `.env.example`. [Plano aprovado](IMPLEMENTATION_PLAN.md), [design](DESIGN.md), [handoff](frontend/HANDOFF.md).
