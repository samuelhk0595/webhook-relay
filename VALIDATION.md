# Validação da continuação — 2026-10-24

## Entregue

Frontend do graph reaproveitado. Backend Rust/Axum real, SQLite WAL/FULL e migrations, bootstrap Argon2id, sessões/CSRF, tokens revogáveis em hash, namespaces/destinos, ingresso binário, fan-out transacional, worker com limites/retries/recuperação, replay idempotente, métricas, retenção, OpenAPI e tipos TypeScript derivados. Rust serve o build em `/admin/`; Node não é runtime de produção.

Arquivos de operação: Dockerfile multi-stage, Compose/Caddy, `.env.example`, CLI `backup` via `VACUUM INTO`, CLI `reset-password`, README com início local, curl, deploy, atualização, backup/restauração e diagnóstico. `.klm/` e o plano aprovado foram preservados. Sem commit, push ou deploy em VPS; não existe repositório Git inicial neste diretório.

## Ambiente e comandos

Windows, Rust/Cargo 1.93.1, Node 22.22.3, npm 11.16.0, Chromium Playwright local. Testes usam apenas recursos locais, bancos temporários e receptores HTTP de teste.

| Comando | Resultado |
|---|---|
| `cargo fmt --check` | Passou |
| `cargo check --locked` | Passou |
| `cargo clippy --all-targets --locked -- -D warnings` | Passou, sem warnings |
| `cargo test --locked` | **13 passaram**: 12 integração + 1 queda real de processo; última execução 3.14s + 2.80s de testes |
| `npm run api:generate` | Tipos gerados do documento Rust/Utoipa |
| `npm run api:check` | Passou; OpenAPI e tipos gerados coincidem |
| `npm run typecheck` | Passou |
| `npm run lint` | Passou |
| `npm run build` | Passou; build Vite em `dist/`, base `/admin/` |
| `npm run test:e2e` | **16 passaram (33.7s)**; API simulada somente nessa suíte |
| `npm run test:integration` | **1 passou (8.9s)**; navegador + Rust/SQLite/worker/receptores reais, sem interceptações |
| `npx playwright test -g 'retained metadata\|payload is escaped'` | **2 passaram (6.4s)** após ajuste da mensagem de diagnóstico expirado |
| `docker compose --env-file .env.example -f deploy/compose.yaml config --quiet` | Passou; configuração Compose válida |
| `docker info --format '{{.ServerVersion}}'` | Bloqueado: pipe `dockerDesktopLinuxEngine` inexistente; daemon Docker não disponível |

Os primeiros checks detectaram lint de Node nos scripts e um guard de Mutex mantido no escopo de teste; ambos corrigidos. A primeira execução de integração real chegou até o dashboard e falhou por seletor ambíguo de teste (opção e link com mesmo nome); seletor corrigido e suíte real passou. Não houve necessidade de reconstruir o layout.

## Evidência funcional coberta

- ACK só após persistência: trigger SQLite força falha no fan-out, API retorna 503 e não deixa evento/entregas/métrica parciais. No caminho feliz, todos os registros existem antes de executar worker.
- Um evento/três destinos produz um recebido/três entregas. A e C não repetem quando B falha duas vezes e depois recupera; duas falhas de tentativa e nenhuma falha definitiva nesse ciclo.
- Bytes binários, JSON com espaços, HMAC de corpo, método, query codificada/repetida, headers repetidos e identificadores preservados; headers de transporte/proxy e credenciais próprias removidos.
- POST/PUT/PATCH/DELETE/GET/HEAD; HEAD sem corpo de resposta. Rejeição de payload grande e excesso de entradas concorrentes.
- Retry zero/finito/ilimitado, 3xx sem redirect, 4xx/5xx, timeout; URL atual e política copiada. Diagnóstico limitado mesmo com UTF-8 inválido; 2xx observado continua sucesso se apenas a leitura diagnóstica estourar o prazo.
- Pausa acumula; retomada preserva contadores. Arquivamento cancela espera e não reagenda falha de chamada já em curso. Limite por destino considera in-flight. Finalização repetida não duplica agregados.
- Evento sem destino; destino novo sem backfill automático; replay cria ciclo novo, mesma chave retorna mesmos IDs e pedido diferente dá 409.
- Reabertura de SQLite com fila e tentativas interrompidas: orçamento consumido, sem declarar sucesso desconhecido. **Processo real morto durante HTTP**, reiniciado no mesmo banco: primeiro resultado interrupted, segunda chamada sucesso; métricas conhecidas não contam a interrupção. Segunda instância recusada pelo lock.
- Administração sem autenticação rejeitada; CSRF, Origin, cookie/logout, token/listagem/revogação, segredo de ingresso e download autenticado seguro. Reset de senha revoga sessões/tokens. Bootstrap não roda cadastro público.
- Retenção conserva payload de pendência pausada, remove corpo terminal elegível, mantém falha histórica e sucesso de replay, conserva agregados e fila independente de período; denominador zero retorna null.
- Backup consistente de SQLite ativo e reabertura da cópia com dados esperados.
- OpenAPI com referências resolvidas, operações e parâmetros não duplicados. Tipos de resposta do frontend derivados dos schemas reais; formulário compartilhado de namespace conserva adaptação create/patch.
- Navegador real: login → namespace → dois destinos → entrega/retry independente → payload escapado → replay seletivo → métricas persistentes → dashboard → tokens/CSRF. O build é servido pelo Rust, inclusive rotas SPA profundas.
- Os 16 testes isolados existentes continuam aprovados, incluindo responsividade, erros/vazio, paginação, polling, tokens e axe nos recortes previamente definidos. Eles não substituem a integração real acima.

## Limites reais e operação restante

- **Build da imagem, execução de containers, Caddy e emissão/renovação HTTPS não foram testados**: somente a validação declarativa Compose foi possível sem daemon. Executar o smoke em host com Docker antes de expor a VPS.
- Nenhum deploy real, teste de carga prolongado, perda elétrica de disco ou validação em dispositivo móvel físico foi realizado. A garantia transacional exercitada usa SQLite local e queda abrupta de processo; durabilidade física também depende do armazenamento da VPS.
- Retenção limpa bytes/headers/diagnósticos, mantendo tombstones de eventos/ciclos, métricas e idempotência. Esses metadados e filas ilimitadas podem crescer. Diagnósticos de tentativas antigas ficam indisponíveis após o prazo; a UI explica isso em vez de dizer que nunca houve tentativa.
- Sem exactly-once/ordem estrita; assinaturas dependentes de URL/tempo e desafios síncronos de inscrição exigem adaptação fora desta versão. O contrato e README explicitam essas propriedades.

Não há backend ou integração principal pendente de implementação. O passo operacional ainda não validado é o empacotamento em containers/HTTPS no host de destino, além de configurar domínio, senha privada e caminho de rede até o computador doméstico.
