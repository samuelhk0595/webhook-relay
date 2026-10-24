# Entrega do nó Frontend / Layout implementer

## Continuação em sessão normal — backend e integração

O ponto de parada descrito abaixo foi superado: backend Rust/SQLite, worker, autenticação, métricas, retenção, OpenAPI e Docker/Compose/Caddy implementados reaproveitando este painel. `contracts.ts` deriva de `openapi.generated.ts`. `integration/real.spec.ts` usa servidor/banco/receptores reais, sem API simulada. Layout preservado. Consulte `../README.md` para operação e `../VALIDATION.md` para resultados atuais e limitação do daemon Docker. As notas seguintes permanecem como registro histórico da etapa frontend.

## Revalidação da retomada — ativação c66b1d67

Implementação salva reaproveitada, sem reconstrução ou alterações em `src/`. Plano, contrato, documentação e fluxos existentes conferidos; nenhuma lacuna material de frontend identificada. O nó pode avançar ao **Backend**; isso não declara o produto integrado concluído.

Verificações reexecutadas nesta ativação (em `frontend/`):
- `npm run typecheck`, `npm run lint`, `npm run build`: passaram.
- `npm run test:e2e`: **16 passed (34.4s)**, Chromium via CLI local (MCP Playwright não exposto). Inclui fluxos, erros, payload, reenvio, tokens, polling e axe nos dois recortes existentes; API simulada somente nos testes.
- Capturas renovadas em `.impeccable/review/`; `desktop.png` e `mobile.png` abertas e inspecionadas, sem sobreposição/quebra material. A suíte também verificou overflow em 375/390/720/768/844/1280/1440px; não substitui dispositivos físicos ou zoom real.
- Detector em `frontend/src`: `[]`, salvo em `frontend/test-results/revalidation-detector.json`. Inspeção de 15 bundles HTML/JS: nenhum dos quatro marcadores exclusivos de fixtures buscados; licença da fonte presente.

Somente esta nota e o plano de revalidação em `LAYOUT_PLAN.md` foram acrescentados à documentação. `.klm/` e snapshots das skills preservados; scripts Python de skill executados com `python -B`, sem caches Python encontrados no snapshot consultado. Sem commit, push ou deploy. O diretório não possui repositório Git, portanto não há diff/status Git disponível.

**Próximo nó:** implementar `CONTRATO_API.md` / `src/lib/contracts.ts` / `src/lib/api.ts`, reconciliar com OpenAPI e validar UI com servidor/banco reais. Autenticação, persistência, fan-out, retries/recuperação, métricas/retenção e deploy continuam pendentes, como detalhado abaixo. Não usar os mocks como comprovação dessas etapas.

## Resultado

Frontend implementado e validado dentro do escopo deste nó. **Não há backend ainda.** Cliente de produção chama apenas API real; dados sintéticos existem exclusivamente nos testes Playwright. O próximo nó deve entregar backend funcional e confirmar a integração, não deixar a aplicação funcionando sobre mocks.

`IMPLEMENTATION_PLAN.md` foi lido integralmente e preservado. `.klm/` e arquivos preexistentes não foram editados. Não houve commit, push, sessão adicional ou deploy. Direção de layout clara/operacional foi confirmada pelo usuário via pergunta estruturada.

## Arquivos entregues

- `frontend/package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `components.json`, `index.html`, `.env.example`.
- `frontend/src/main.tsx`, `app.tsx`, `styles.css`: providers, lazy routes, shell responsivo e tokens.
- `frontend/src/components/`: navegação, filtros, estados comuns, gráfico, ErrorBoundary; primitivas acessíveis Button/Dialog/AlertDialog no padrão shadcn/ui.
- `frontend/src/pages/login.tsx`, `dashboard.tsx`, `namespaces.tsx`, `destinations.tsx`, `events.tsx`, `tokens.tsx`, `not-found.tsx`.
- `frontend/src/lib/contracts.ts`, `api.ts`, `auth.tsx`, `queries.ts`, `filters.ts`, `utils.ts`.
- `frontend/e2e/fixtures.ts`, `admin.spec.ts`, `playwright.config.ts`: 16 cenários de navegador, sem testes de componentes.
- `frontend/public/licenses/Public-Sans-OFL.txt`: licença da fonte auto-hospedada, copiada para dist.
- `frontend/CONTRATO_API.md`: contrato detalhado, decisões numéricas, exemplos curl e checklist de integração.
- `frontend/LAYOUT_PLAN.md`, `README.md`; raiz `README.md`, `PRODUCT.md`, `DESIGN.md`, `.gitignore`; `.impeccable/design.json`, `detector-results.json` e evidências em `.impeccable/review/`.

## Funcionalidades

- Login/erro de credenciais, rota protegida, retorno à tela solicitada, sessão expirada, logout; CSRF em memória, envio por header, sem armazenar credenciais no navegador.
- Dashboard: recebidos, entregas concluídas, falhas definitivas, taxa com denominador conhecido/null, fila pending/retry/in_flight, pausadas e idade mais antiga. Gráfico de três séries, tabela textual acessível e diagnóstico por destino com horário do erro.
- Filtros namespace/destino/24h/7d/30d/personalizado, persistidos na URL e alinhados ao minuto. Destino não altera recebidos; fila atual independente do período. Horários no fuso do navegador. Polling 10s suspenso quando documento oculto.
- Criar/editar/arquivar namespace, URL copiável, segredo opcional/rotação/remoção; slug imutável e histórico preservado.
- Criar/editar destino; retries zero/finito/ilimitado, intervalo/timeout e defaults; pausar/retomar/arquivar com consequências explícitas. URL atual x política copiada explicadas.
- Eventos paginados, filtros de entrega, metadados/query/headers repetidos mascarados, payload escapado ou download binário seguro, ciclos e tentativas paginadas sob expansão, resposta diagnóstica como texto.
- Reenvio seletivo para destinos elegíveis do namespace, UUID idempotente reutilizado após erro, advertência de duplicidade e de pausa.
- Tokens: criação com expiração, valor exibido uma vez e apagado da visualização ao concluir, listagem só de metadados e revogação confirmada.
- Skeletons, vazio instrutivo, erro recuperável, feedback de ações, menu mobile Radix, foco visível, reduced-motion e estado pendente.

## Contrato/decisões para o próximo nó

Ler `CONTRATO_API.md` e tipos em `src/lib/contracts.ts` antes de implementar. Destaques:

1. REST `/api/v1`, JSON direto para recurso; coleções `{items,next_cursor}`. Erro `{error:{code,message,fields?,request_id?}}`.
2. Login e `/auth/me`: `{id,username,csrf_token}`; cookie HttpOnly configurado no servidor. Mutações enviam `X-CSRF-Token`; tokens Bearer para agentes, não para a UI. Backend precisa validar tudo; UI não fornece segurança de servidor.
3. GET `/destinations?namespace_id=` adicional permite compor filtros sem N+1. Listagens de dimensões incluem arquivados quando estado não é especificado.
4. Segredo de ingresso por `X-Webhook-Secret`, omitido no PATCH conserva, string rotaciona, null remove. Servidor armazena hash e remove header no forwarding.
5. `max_retries`: inteiro 0–1.000.000 ou null; intervalo 1–604.800s; timeout 1–300s. Defaults 288/300/15. Backend deve alinhar limites ou adaptar contrato+UI juntos.
6. `/events/{id}/payload?preview_bytes=65536` devolve bytes, não JSON, e `X-Payload-Truncated`; máximo de prévia 64KiB. Completo sem parâmetro. attachment/octet-stream/nosniff/no-store; retenção ausente =>410. UI nunca executa conteúdo.
7. Estatísticas usam failure_rate fracionária/null e períodos `[from,to)`. Interrupted é desconhecido e fica fora da taxa. `queue.paused` é subconjunto, não estado para somar. Agregados sobrevivem retenção.
8. Detalhe do evento espera todos os ciclos; tentativas paginadas. Não truncar ciclos silenciosamente. Se necessário paginar no backend, adaptar UI/DTO em conjunto.
9. Publicar OpenAPI protegido Utoipa e gerar/verificar TS contra esse contrato real. Os tipos desta etapa são manuais; não alegar que foram gerados do OpenAPI.
10. Servir dist em `/admin/`, redirect de `/admin`, fallback só no namespace de rotas SPA; não interceptar ingresso/API. Sem Node em produção. Expandir README raiz com Rust/SQLite/migrations, Compose/Caddy, bootstrap e operação.

## Validações executadas

Ambiente: Windows, Node 22.22.3, npm 11.16.0, Chromium headless instalado pelo Playwright. Não havia MCP Playwright exposto: foi usada CLI local, com screenshots abertos e inspecionados. Sem ferramenta de subagentes: revisão/documentação realizadas inline, explicitamente registradas.

| Comando (em frontend/) | Resultado final |
|---|---|
| `npm install` | Dependências e lockfile criados; sem vulnerabilidades reportadas |
| `npm run typecheck` | Passou |
| `npm run lint` | Passou, sem warnings/erros |
| `npm run build` | Passou, `dist/` com base `/admin/` |
| `npx playwright install chromium` | Instalou o browser compatível; primeira tentativa havia falhado por executável ausente |
| `npm run test:e2e` | **16 passed**, rodada final 31.0s |
| `npm audit --audit-level=high` | **0 vulnerabilities** no momento da execução |
| Varredura de dist por marcadores exclusivos de fixtures/credenciais sintéticas | Nenhum encontrado; licença da fonte presente |
| Detector Impeccable em `frontend/src` | Resultado `[]`, executado uma vez |

Cenários E2E: login inválido/válido/proteção/logout; filtros/intervalos; namespace+destino+política/pausa/retomada/arquivo; paginação/payload escapado/headers repetidos/tentativas/download; reenvio com erro e mesma chave; token uma vez/revogação; empty/denominador zero; indisponibilidade/recovery; mobile/menu/formulário/reenvio; tamanhos 375/390/768/844 landscape/1280/1440 e viewport CSS de 720; polling oculto/ativo; bytes binários idênticos no download; payload indisponível; expiração de sessão; 422 de campos preservando formulário; axe no dashboard e diálogo mobile.

As falhas encontradas durante construção foram corrigidas e a suíte completa reexecutada. A checagem axe usa reduced-motion para analisar estado estável, não amostra no meio do fade de 140ms. Não houve teste real de zoom por browser/OS, apenas viewport CSS equivalente. Não são testes completos de conformidade WCAG.

### Evidência visual

Ver `.impeccable/review/REVIEW.md`: veredito **ship** restrito ao frontend e recortes revisados. Screenshots com dados explicitamente sintéticos: dashboard desktop/mobile/tablet, login, evento desktop/mobile, formulário de destino mobile, reenvio mobile, token, vazio e erro. Sem overflow do documento nos tamanhos testados; tabelas preservam colunas por rolagem local.

## O que NÃO foi validado / limitações reais

- Sem backend: autenticação/CSRF/Bearer/hash, OpenAPI, persistência antes do ACK, retries de rede, bytes/HMAC de forwarding, reinício, métricas transacionais e retenção ainda não implementados/verificados. Os mocks de Playwright não contam como sucesso desses critérios.
- Rust format/check/clippy/test, receptores HTTP reais e Docker smoke não executados neste nó: não há backend/deploy nesta etapa. Próximos nós devem executá-los e informar bloqueios reais do ambiente.
- Ainda é necessário rodar o fluxo completo da UI com servidor/banco reais e reconciliar DTOs com OpenAPI gerado.
- Download usa Blob em memória (limite de ingresso proposto 10MiB), prévia até 64KiB; não pretende streaming ilimitado. Clipboard depende de HTTPS/localhost e informa alternativa manual se indisponível.
- Detalhe carrega ciclos completos do evento; paginação de tentativas/coleções já existe. Longos históricos de reenvio podem exigir extensão de paginação.
- Nenhum deploy real foi solicitado ou realizado. O produto global não deve ser anunciado concluído enquanto essas etapas estiverem pendentes.
