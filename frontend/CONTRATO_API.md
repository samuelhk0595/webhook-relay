# Contrato de integração do painel

Este contrato complementa `../IMPLEMENTATION_PLAN.md`. O backend Rust implementa estas rotas; `src/lib/contracts.ts` usa aliases de `openapi.generated.ts`, gerado do OpenAPI Utoipa por `npm run api:generate`. `npm run api:check` verifica drift. Não há modo demo em runtime. O fluxo real está em `integration/real.spec.ts`; fixtures de `e2e/` continuam sendo apenas testes isolados de interface.

## Convenções

- Origem única; base `/api/v1`. JSON snake_case. IDs strings opacas. Datas RFC3339 UTC. Valores ausentes representados por `null` quando declarados nullable; não omitir campos obrigatórios.
- Recursos retornam o DTO diretamente. Coleções: `{ "items": [], "next_cursor": null }`; cursor opaco, `limit` de 1 a 100, default 25. Ordenação estável por timestamp + ID. Nada de truncamento silencioso.
- GET de namespaces/destinos/tokens inclui arquivados/revogados quando não há filtro de estado. A lista inicial de namespaces usa `status=active`; seletores carregam todas as páginas para poder consultar histórico arquivado.
- HTTP 201 em criação/reenvio; 200 em leitura/patch/login; 204 em logout/revogação. Sem redirects de autenticação nas APIs. 401 não autenticado, 403 CSRF, 404 recurso ausente, 409 conflito, 410 payload removido, 413 corpo grande, 422 validação, 429 limite de login, 5xx indisponibilidade.
- Erro: `{ "error": { "code": "validation", "message": "Verifique os campos indicados.", "fields": { "url": "URL inválida." }, "request_id": "opcional" } }`. `fields` e `request_id` opcionais. Mensagens em português, sem segredos/stack traces. UI mantém valores e relaciona erros aos campos quando possível.
- GETs canceláveis por AbortSignal. Mutações não têm retry automático. TanStack Query faz uma nova tentativa de GET em erro transitório, não em 4xx.

## Sessão e CSRF

| Método | Rota | Entrada | Resposta |
|---|---|---|---|
| POST | `/auth/login` | `{username,password}` | `Session` |
| GET | `/auth/me` | — | `Session` |
| POST | `/auth/logout` | — | 204 |

`Session = {id, username, csrf_token}`. Login fornece cookie específico HttpOnly/SameSite/Secure em produção e token CSRF ligado à sessão; `/auth/me` o recupera após refresh. Cliente guarda apenas CSRF em memória e envia `X-CSRF-Token` em toda mutação autenticada. Usa `credentials: same-origin`, nunca localStorage/sessionStorage. Backend valida também Origin/Fetch Metadata conforme apropriado. Login público deve ter proteção contra login-CSRF (Origin/same-site) e rate limit; não exige uma sessão preexistente. Sem senha padrão, cadastro ou recuperação pública.

APIs também aceitam `Authorization: Bearer ...` para scripts. Bearer não é usado pela UI e não requer cookie/CSRF. Nunca retornar hash de sessão/token/segredo. `/openapi.json` protegido precisa funcionar com cookie para o link do painel e com Bearer para agentes. 401 durante navegação limpa cache e retorna ao login; erro de rede não é tratado como logout.

## Namespaces e destinos

| Método | Rota | Entrada/filtros | Resposta |
|---|---|---|---|
| GET | `/namespaces` | `status`, cursor, limit | `Page<Namespace>` |
| POST | `/namespaces` | `{name,slug,ingress_secret?}` | `Namespace` |
| GET | `/namespaces/{id}` | — | `Namespace` |
| PATCH | `/namespaces/{id}` | `{name?,ingress_secret?,status?:"archived"}` | `Namespace` |
| GET | `/destinations` | `namespace_id?`, cursor, limit | `Page<Destination>` |
| POST | `/namespaces/{id}/destinations` | `DestinationInput` | `Destination` |
| GET | `/destinations/{id}` | — | `Destination` |
| PATCH | `/destinations/{id}` | campos editáveis ou `{status:"active"|"paused"|"archived"}` | `Destination` |

GET global `/destinations` é uma adição pequena às rotas sugeridas: evita N+1 na composição dos filtros. Aceitar também GET `/namespaces/{id}/destinations` no backend é útil para outros clientes, mas a UI usa a listagem global filtrada.

`Namespace`: id, name, slug, ingress_url **absoluta retornada pela API** (respeitar base pública configurada; não confiar cegamente em Host recebido), status `active|archived`, has_ingress_secret, destination_count (não arquivados), created_at. `ingress_secret` omitido no PATCH conserva; string rotaciona; null remove. Nunca retornar segredo. Header fixado neste contrato: `X-Webhook-Secret`, removido no forwarding. A rotação exige atualizar o provedor. Slug imutável, ASCII minúsculo `[a-z0-9-]{1,64}`, nomes internos reservados no servidor.

`Destination`: id, namespace_id, name, url, status, max_retries, retry_interval_seconds, timeout_seconds, created_at. `DestinationInput`: name, url e os três campos de política. Criado ativo. Limites usados pela UI: nome 1–120, URL até 4096 caracteres, retries inteiro 0–1.000.000 ou null, intervalo inteiro 1–604.800s, timeout inteiro 1–300s. Defaults 288/300/15. Segredo de entrada, quando configurado, 16–256 caracteres. Username até 128. Backend deve aplicar limites compatíveis e rejeitar nomes vazios após trim, schemes fora de HTTP/HTTPS, userinfo e loop óbvio para o relay; redes privadas são intencionais.

A UI explica: N retries = N+1 tentativas; null ilimitado; zero inicial apenas. Política copiada por entrega, edição afeta novas entregas. URL atual usada na próxima tentativa, inclusive em pendências. Pausa acumula e preserva contadores. Arquivo cancela pendências, impede novos fan-outs e não apaga histórico; chamadas em andamento podem terminar. Arquivar namespace rejeita novas entradas, sem cancelar entregas existentes. Sem desarquivamento nesta versão.

## Eventos, payload e tentativas

| Método | Rota | Entrada/filtros | Resposta |
|---|---|---|---|
| GET | `/events` | from, to, namespace_id?, destination_id?, state?, cursor, limit | `Page<WebhookEvent>` |
| GET | `/events/{id}` | — | `EventDetail` |
| GET | `/events/{id}/payload` | `preview_bytes=65536` opcional | bytes brutos |
| GET | `/deliveries/{id}/attempts` | cursor, limit | `Page<Attempt>` |
| POST | `/events/{id}/replays` | `{destination_ids:[...]}` + `Idempotency-Key` | `{delivery_ids:[...]}` |

`WebhookEvent` inclui id, namespace_id/name, method, original_query (sem `?`), content_type nullable, body_size em bytes, received_at, payload_available, delivery_count, succeeded_count, failed_count e pending_count. Contadores são **ciclos de entrega**, incluindo reenvios; pending_count soma pending/retry_scheduled/in_flight; cancelled não é falha definitiva. Eventos filtrados por destino/estado devem ser distintos, sem multiplicação por joins. Sem destinos também aparecem na listagem sem filtro de destino. Filtragem temporal de eventos é pelo recebimento.

`EventDetail = {event, headers: Header[], deliveries: Delivery[]}`. Headers são pares ordenados, inclusive repetidos; cada par traz `redacted` e `value`. Mascarar no servidor valores sensíveis, incluindo cookies administrativos, segredo de entrada, Authorization e assinaturas. A UI também mascara nomes sensíveis defensivamente, sem mecanismo de revelar. Não retornar credenciais administrativas próprias. `deliveries` inclui todos os ciclos do evento, em ordem estável. Para volume pessoal, este DTO evita vários fetches; se o backend introduzir paginação de ciclos, atualizar este DTO e UI, **não** truncar silenciosamente. Tentativas já são paginadas e só carregadas quando o ciclo é expandido.

`Delivery`: IDs, destination_name, state (pending/in_flight/retry_scheduled/succeeded/failed/cancelled), cycle inteiro >=1, replay_of nullable, attempts_started, política copiada, next_attempt_at/completed_at/last_error nullable. `Attempt`: id, number, started_at, finished_at nullable, URL efetivamente usada, outcome (succeeded/failed/interrupted/in_flight), status_code/duration_ms/error_category/error_message/response_excerpt nullable. Excertos limitados no servidor, renderizados apenas como texto. Interrupted tem resultado desconhecido, não é falha conhecida; consome orçamento. `replay_of` liga a entrega anterior quando houver, sem reescrever seu histórico.

### Payload seguro

- Nunca JSON/base64: bytes originais. Autenticação obrigatória, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Content-Type: application/octet-stream`, `Content-Disposition: attachment` com nome seguro.
- Sem parâmetro de prévia, retornar o corpo completo (default de ingresso 10MiB). UI força também Blob com application/octet-stream e download `.bin`; não navega para HTML/SVG remoto.
- `preview_bytes` permite inteiro positivo até 65536; retornar no máximo esse número de bytes, sem conversão/descompressão e com `X-Payload-Truncated: true|false`. 200 é suficiente; não simular Range/206. UI só oferece prévia em MIME textual, valida UTF-8 e limita o tamanho recebido; binários ficam como metadados/download. Texto vai para React `<pre>{text}</pre>`, nunca dangerouslySetInnerHTML.
- Payload removido retorna 410; detalhe indica payload_available=false. Pendências não devem perder payload pela retenção.

### Reenvio idempotente

UUID por intenção/diálogo; a mesma chave é reutilizada em repetição após falha. O backend armazena hash do pedido + resposta na transação dos novos ciclos. Repetir chave + mesmo pedido devolve mesmos IDs; chave + pedido diferente retorna 409. Validar seleção não vazia/sem duplicados, destinos do namespace e não arquivados. Pausados são elegíveis, mas ficam esperando retomada. Payload deve existir. Selecionar destino novo é permitido; não há replay automático de histórico. Documentar que fechar/reabrir o diálogo é uma nova intenção e pode criar duplicatas se a primeira resposta se perdeu.

## Estatísticas

GET `/stats/summary`, `/stats/timeseries` e `/stats/destinations`, todos com `from`, `to`, `namespace_id?`, `destination_id?`. Destinations é paginado; os demais são objetos.

- `from/to` RFC3339 UTC alinhados a minuto, intervalo `[from,to)`. API informa limites efetivos em `period:{from,to,granularity:"minute"|"hour"|"day"}`. UI mostra datas no fuso do navegador. Gráfico pode agrupar em horas/dias, sem apagar agregados persistentes de minuto.
- Summary: `period`, `received`, `delivered`, `permanent_failed`, `failed_attempts`, `finalized_attempts`, `failure_rate` (fração 0–1 ou **null**), `queue`.
- `received`: eventos persistidos, pelo recebimento e dimensão namespace/global. Destino **não** muda esse total, mesmo se destination_id informar namespace implicitamente: use namespace_id explicitamente para restringir recebidos. Não triplicar recebimentos por joins.
- `delivered` e `permanent_failed`: ciclos concluídos no período; reenvio não desfaz falhas históricas. Tentativas conhecidas finalizadas (sucesso+falha) formam o denominador. Interrupted fica fora de failed_attempts/finalized_attempts. Zero denominador => null.
- `queue:{pending,retry_scheduled,in_flight,paused,oldest_pending_age_seconds}`. Valores são atuais e ignoram from/to; filtros namespace/destino se aplicam. `paused` é **subconjunto** de pending/retry_scheduled em destinos pausados, não um estado adicional para somar. oldest null se não houver pending/retry_scheduled/in_flight; idade desde a criação da entrega mais antiga ainda não terminal, incluindo pausadas.
- Timeseries: `{period,points:[{timestamp,received,delivered,failed_attempts}]}`; timestamp é começo do bucket UTC. Ordenado; preencher buckets vazios com zero quando o intervalo é válido. Não fabricar atividade. Contagens preservadas após retenção de payloads.
- Destinations: `Page<DestinationStats>` com destination_id/name, namespace_name, status, delivered, permanent_failed (período), pending/retry_scheduled/in_flight (atuais), last_error/last_error_at (último diagnóstico conhecido, independente do período, ambos nullable). Mostrar dimensões arquivadas no histórico. Tabela apresenta fila inicial+em processamento / retry separadamente.

## Exemplos curl para agentes

Exemplos de uso: requerem servidor em execução e token real no ambiente. Não executar contra serviços externos durante testes locais. O README raiz inclui bootstrap/login/criação de token e operação.

```bash
export RELAY_URL='https://seu-dominio'
# Fornecer WEBHOOK_TOKEN por secret manager/ambiente, sem incluí-lo na URL.
curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  "$RELAY_URL/api/v1/openapi.json"

curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Casa","slug":"casa"}' \
  "$RELAY_URL/api/v1/namespaces"

# Use o id retornado acima, não o slug, na API administrativa.
curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"PC","url":"http://10.8.0.2:9000/hooks","max_retries":288,"retry_interval_seconds":300,"timeout_seconds":15}' \
  "$RELAY_URL/api/v1/namespaces/$NAMESPACE_ID/destinations"

# Ingress separado: não enviar credenciais administrativas.
curl --fail-with-body -i -H 'Content-Type: application/json' \
  --data-binary @payload.json "$RELAY_URL/casa?source=local"

curl --fail-with-body -G -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  --data-urlencode 'from=2026-10-01T00:00:00Z' \
  --data-urlencode 'to=2026-10-02T00:00:00Z' \
  "$RELAY_URL/api/v1/stats/summary"

curl --fail-with-body -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H "Idempotency-Key: $REPLAY_KEY" -H 'Content-Type: application/json' \
  -d '{"destination_ids":["ID_DO_DESTINO"]}' \
  "$RELAY_URL/api/v1/events/$EVENT_ID/replays"
```

## Handoff original (concluído na continuação)

Backend, OpenAPI, tipos gerados e teste real de navegador foram entregues. Confira `../VALIDATION.md`. A retenção mantém metadados de evento/ciclos e métricas, removendo bytes/headers e diagnósticos elegíveis; payload expirado retorna 410. Os requisitos originais abaixo foram mantidos como checklist histórico:

1. Implementar autenticação, DTOs e endpoints reais; gerar OpenAPI protegido com Utoipa incluindo erros, limites e semântica. Não servir fixtures.
2. Verificar o contrato real e, preferencialmente, gerar tipos TS do OpenAPI. Tipos manuais são deliberados enquanto o backend está ausente.
3. Rust deve servir `frontend/dist` em `/admin/`, com fallback de rotas profundas e redirect `/admin` → `/admin/`; `/api` e `/{namespace}` não podem cair no SPA. Vite usa proxy local para 8080; não há CORS permissivo.
4. Executar UI com API e banco reais para login, namespace/destino, fan-out, retry, reenvio e métricas. Os testes Playwright desta etapa não cobrem Rust/persistência/rede real.
