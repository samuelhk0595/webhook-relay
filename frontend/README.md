# Painel administrativo

Implementação frontend do contrato em `../IMPLEMENTATION_PLAN.md`. React 19 + TypeScript + Vite 7, Tailwind 4, componentes locais no padrão shadcn/ui (Button/CVA/Slot e Dialog/AlertDialog Radix), TanStack Query, React Router e Recharts. Fonte Public Sans variável auto-hospedada via pacote, sem requests a CDNs.

## Desenvolvimento

Node 22.12+ (validado com 22.22.3); Node é ferramenta de build, não runtime de produção.

```bash
cd frontend
npm ci
npm run dev
# http://127.0.0.1:5173/admin/
```

A API real está implementada em `../backend` e deve estar em `http://127.0.0.1:8080`. Consulte o README raiz para bootstrap; no Rust defina `DEV_ORIGIN=http://127.0.0.1:5173` ao usar Vite. Para outro endereço, defina `API_PROXY_TARGET` no processo Vite. Sem backend em execução, o painel mostra erro de conexão. Não há senha padrão.

## Verificações

```bash
npm run typecheck
npm run lint
npm run build
npx playwright install chromium # somente na primeira execução
npm run test:e2e
```

Os E2E interceptam `/api/v1` com fixtures sintéticas **somente em `e2e/`**. O bundle de produção não importa testes, fixtures, credenciais sintéticas ou qualquer servidor mock. Não são testes de entrega Rust ou de segurança real da sessão. Validam navegação, formulários, serialização, CSRF enviado, paginação, estados de erro/vazio, reenvio idempotente, payload escapado/binário, exibição única de token e polling com tela visível. Axe cobre dashboard e diálogo de reenvio mobile em estado estável/reduced-motion, sem substituir auditoria manual completa.

Screenshots de dados sintéticos são gravados em `../.impeccable/review/`; trace/relatório em `test-results/` e `playwright-report/` (ignorados pelo Git). Viewports: 1440, 1280, 844 landscape, 768 tablet, 720 (resolução CSS equivalente a zoom 200% numa tela de 1440px), 390 e 375. Isso **não** equivale a teste físico de zoom de navegador/dispositivo.

## Arquitetura

- `src/lib/contracts.ts`: aliases dos DTOs gerados de Rust/Utoipa em `openapi.generated.ts`; `npm run api:generate` atualiza e `npm run api:check` verifica drift.
- `src/lib/api.ts`: único cliente HTTP, cookies same-origin, CSRF em memória, erro consistente; nenhuma métrica local.
- `src/lib/queries.ts`: cache, invalidação e polling de 10s somente com documento ativo.
- `src/lib/filters.ts`: filtros persistidos na URL, períodos UTC alinhados ao minuto e carregamento paginado de opções.
- `src/pages/`: login, visão geral, namespaces, destinos, eventos/detalhes e tokens.
- `src/components/ui/`: primitivas acessíveis, sem instalar skills ou extensões.
- `src/styles.css`: tokens e sistema visual; `../DESIGN.md` o documenta.
- `LAYOUT_PLAN.md`: plano de layout e decisões desta etapa.
- `CONTRATO_API.md`: rotas, DTOs, semântica, limites, requisitos de servidor e curl.

## Produção / integração real

`npm run build` gera `dist/` com base `/admin/`; Rust serve esses arquivos e fallback apenas dentro de `/admin`. Recharts e páginas têm lazy loading. Não usar `vite preview` como servidor de produção. Não adicionar Node ao Compose de runtime.

O Rust implementa autenticação/CSRF, persistência, worker, retenção e OpenAPI protegido. Docker/Compose/Caddy estão na raiz e em `../deploy`. `npm run test:integration` inicia o binário debug Rust com banco temporário e serve este build em `/admin/`, sem mocks. Requer `cargo build --locked` em backend e `npm run build` aqui. O fluxo cobre login, namespace/destinos, entrega HTTP real, retry independente, payload, reenvio, métricas e tokens. Veja `../VALIDATION.md` para resultados e limites de validação de containers.

### Limitações conhecidas

- Tipos de resposta derivam do OpenAPI real e o fluxo principal foi verificado contra servidor/banco reais.
- Detalhe do evento espera todos os ciclos em um DTO (tentativas são paginadas). Se houver grande volume de reenvios por evento, migrar ciclos para paginação coordenada cliente/servidor.
- Copiar usa Clipboard API, disponível em HTTPS/localhost; em contexto inseguro há orientação de cópia manual.
- Download mantém no máximo o payload de ingresso (default projetado 10MiB) em memória; prévia até 64KiB. Não é streaming de arquivos arbitrariamente grandes.
- Sem garantia de exactly-once: reenviar/reabrir um diálogo após resposta perdida pode duplicar processamento. O backend precisa persistir a idempotência de cada operação.
