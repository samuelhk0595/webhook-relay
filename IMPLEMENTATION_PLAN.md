# Webhook Forwarder — plano de implementação

## 1. Objetivo e escopo

Ferramenta interna, hospedada em uma VPS continuamente disponível, que recebe webhooks genéricos, persiste os eventos e encaminha cada um a múltiplos destinos. Destinos temporariamente indisponíveis, como um computador doméstico desligado, recebem novas tentativas conforme sua configuração.

Entregar aplicação funcional com backend, painel React, API administrativa documentada para agentes, testes dos comportamentos relevantes e configuração de deploy. Priorizar correção da persistência e entrega, operação simples e interface clara. Não transformar a ferramenta em plataforma SaaS nem exigir infraestrutura distribuída ou múltiplas revisões adversariais.

## 2. Stack e organização

- Backend: Rust estável, Tokio, Axum, Reqwest, SQLx, SQLite e tracing.
- API: REST JSON, OpenAPI com Utoipa; erros e paginação consistentes.
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router e Recharts.
- Autenticação: administrador único, Argon2id, sessões via cookies e tokens Bearer para automação.
- Deploy: Docker Compose, Caddy com HTTPS automático e volume persistente.
- Um processo de aplicação executa o servidor HTTP, worker de entregas e limpeza. Um banco SQLite local serve como armazenamento e fila durável. Não usar Redis, RabbitMQ ou PostgreSQL nesta versão.
- Frontend compilado servido pelo backend em `/admin`; API em `/api/v1`; entrada em `/{namespace}`. Node.js é necessário para desenvolvimento/build, não em produção.
- Estrutura sugerida: `backend/`, `frontend/`, `deploy/`, `README.md` e este plano. Usar versões estáveis compatíveis e registrar lockfiles. Ajustes pequenos de organização são permitidos e devem ser documentados.
- O diretório estava vazio, exceto pelos metadados `.klm/`, quando este plano foi escrito. Preservar esses metadados e quaisquer arquivos novos existentes ao iniciar cada etapa.

## 3. Modelo funcional

### Namespaces

- Nome de exibição e slug único, normalizado em minúsculas: letras ASCII, números e hífens, entre 1 e 64 caracteres.
- Exemplo: nome GitHub, slug `github`, entrada `https://meuwebhook.com/github`.
- Reservar os nomes de rotas internas, incluindo `admin`, `api`, `healthz` e `readyz`.
- Namespace precisa existir antes do recebimento; desconhecido retorna 404 e não é criado automaticamente.
- Criar e editar nome, listar, consultar e arquivar pelo painel e API. Slug imutável nesta versão evita invalidar URLs inadvertidamente.
- Namespace arquivado rejeita novas entradas, mas permite consultar histórico e concluir entregas existentes.

### Destinos

- Pertencem a um namespace e podem ser criados antes do primeiro evento.
- Campos: nome, URL HTTP/HTTPS absoluta, estado ativo/pausado/arquivado, `max_retries`, `retry_interval_seconds` e `timeout_seconds`.
- `max_retries = 0`: apenas a tentativa inicial; `null`: retries ilimitados; N: até N + 1 tentativas no ciclo de entrega.
- Defaults iniciais: 288 retries, intervalo de 300 segundos e timeout de 15 segundos. Interface explica a duração aproximada, sem prometer um prazo exato.
- Validar valores: intervalo e timeout positivos, timeout limitado, retries não negativos ou ilimitados. Definir limites numéricos razoáveis no contrato.
- Pausado continua acumulando entregas, mas não inicia novas tentativas. Tentativa já em andamento pode terminar. Retomar preserva fila e contador.
- Arquivar remove o destino do fan-out futuro e cancela entregas ainda não iniciadas/em espera. Uma tentativa em andamento pode terminar; se falhar, não reagendar para destino arquivado. Preservar histórico.
- Usar a URL atual do destino quando uma nova tentativa começar, permitindo corrigir o endereço de pendências. Registrar a URL efetivamente usada em cada tentativa, sem expor credenciais em logs.
- Política de retry e timeout é copiada para a entrega ao criá-la. Edições dessa política afetam novas entregas; a UI deixa isso explícito.

### Eventos e fan-out

- Persistir corpo como bytes, método, query string original, headers relevantes, namespace, identificador e instante de recebimento em UTC.
- Não exigir JSON, reserializar conteúdo, descomprimir ou transformar payloads.
- Em uma transação, salvar evento, uma entrega para cada destino não arquivado e incremento da métrica de recebimento. Só responder `202 Accepted` após commit bem-sucedido.
- Se persistência falhar, retornar erro; nunca confirmar um evento que ficou apenas em memória.
- Eventos sem destinos também são persistidos e contabilizados. Novo destino recebe apenas novos eventos automaticamente.
- Reenvio manual pode selecionar um evento retido e um ou mais destinos do mesmo namespace, incluindo destino cadastrado depois do recebimento.
- Um evento para três destinos representa um recebimento e três entregas previstas.

## 4. Contrato de encaminhamento

- Aceitar métodos usuais de webhook: POST, PUT, PATCH, DELETE, GET e HEAD; não implementar CONNECT/TRACE como relay. HEAD conserva semântica de resposta sem corpo.
- Preservar método e bytes do corpo. Encaminhar headers de aplicação, inclusive Content-Type e assinaturas, sem combinar indevidamente headers repetidos.
- Remover headers hop-by-hop, inclusive os nomeados em Connection; recalcular Host e tamanho do corpo; não encaminhar headers de proxy como Forwarded e X-Forwarded-*.
- Não encaminhar cookies de sessão ou credenciais administrativas da própria aplicação. Usar nome de cookie específico e filtrá-lo quando presente; não remover genericamente headers de assinatura ou autenticação pertencentes ao webhook.
- URL configurada define scheme/host/path. Anexar query string original à query configurada, preservando codificação e parâmetros repetidos, com regra documentada. Segredo de entrada não será aceito via query.
- Adicionar identificadores estáveis próprios de evento e entrega em headers prefixados, sobrescrevendo valores desses headers enviados pelo remetente. Manter IDs originais dos provedores.
- Não seguir redirects automaticamente e não desabilitar validação TLS.
- Qualquer resposta 2xx significa sucesso. Erro de conexão, timeout ou status fora de 2xx significa falha sujeita ao retry, inclusive 3xx/4xx/5xx.
- Limitar leitura/armazenamento de resposta do destino. Guardar status, duração, categoria de erro e trecho limitado de resposta como diagnóstico autenticado; conteúdo remoto nunca vira HTML executável na UI.
- Não prometer transparência de protocolo: corpo e headers de aplicação são preservados, mas transporte, URL e instante mudam. Assinaturas baseadas em corpo como as do GitHub devem continuar validáveis. Assinaturas dependentes de URL/tempo e desafios síncronos de inscrição de alguns provedores podem exigir adaptação e não fazem parte desta versão.
- Não deduplicar automaticamente eventos recebidos do provedor. Cada recebimento persistido é um evento; o receptor pode usar os identificadores para deduplicar.

## 5. Fila, retries e recuperação

- Estados de entrega: `pending`, `in_flight`, `retry_scheduled`, `succeeded`, `failed`, `cancelled`.
- Guardar número de tentativas iniciadas, próxima execução, política copiada, timestamps, último erro e vínculo ao evento/destino.
- Worker consulta entregas elegíveis por índice; adquire trabalho atomicamente; nunca mantém transação SQLite aberta durante uma chamada de rede.
- Concorrência global limitada e limite por destino, com seleção razoavelmente justa para um destino offline não ocupar todos os workers. Defaults sugeridos: 16 global e 2 por destino.
- A tentativa é registrada antes da chamada. Finalização da tentativa, transição da entrega e atualização das métricas acontecem na mesma transação, com proteção contra finalização repetida.
- Retry fixo calculado a partir do término da tentativa anterior. Respeitar pausa, arquivamento e máximo de tentativas.
- Aplicação suporta uma instância ativa por banco. Usar posse/lease de trabalho ou recuperação explícita das tentativas interrompidas no startup, garantindo que elas não fiquem presas indefinidamente e não executem simultaneamente por engano.
- Tentativa interrompida por queda do processo tem resultado desconhecido: registrar como interrompida, contar no orçamento já consumido e retomar se houver tentativas disponíveis. Não declarar entrega bem-sucedida sem evidência.
- Shutdown gracioso para parar de adquirir novos trabalhos e aguardar chamadas em curso por prazo limitado. Queda abrupta também precisa ser recuperável.
- Sem garantia de ordem estrita e sem exactly-once. Retries podem duplicar processamento se a resposta se perder. Limite de retries pode encerrar uma entrega sem sucesso.
- Reenvio manual cria um novo ciclo/registro de entrega, ligado ao anterior quando houver, com política atual e contador zerado. Não apagar tentativas nem reescrever resultados históricos. Usar chave de idempotência na operação administrativa de reenvio para evitar duplicação por repetição da requisição.

## 6. Persistência, retenção e limites

- Entidades principais: administrador, sessões, tokens, namespaces, destinos, eventos, entregas, tentativas, operações idempotentes e agregados de métricas.
- IDs estáveis (UUID ou equivalente); timestamps UTC; migrations versionadas.
- SQLite: WAL, foreign keys, busy timeout e durabilidade `synchronous=FULL` nas conexões relevantes. Índices em fila por estado/próxima tentativa, eventos por namespace/data, entregas por destino/estado e tentativas por entrega/data.
- Payload em BLOB; headers representados de forma que preserve repetições e valores válidos sem perda. Não usar um mapa JSON de strings que descarte headers repetidos.
- Retenção configurável globalmente. Defaults sugeridos: eventos concluídos/sem destino por 7 dias; eventos com falha definitiva por 30 dias.
- Não remover payload/histórico necessário para entregas não terminais, inclusive pausadas. Se houver vários destinos, reter enquanto qualquer entrega precisar do evento; aplicar maior prazo terminal pertinente.
- Agregados históricos sobrevivem à limpeza dos eventos/tentativas. Arquivamento de namespace/destino preserva IDs e dimensões para consultas históricas.
- Limites configuráveis de body (default 10 MiB), headers e concorrência de entrada. Documentar que retries ilimitados/pausas prolongadas podem aumentar armazenamento.
- Limpeza em lotes pequenos. Backup consistente via mecanismo SQLite apropriado ou aplicação parada; não recomendar copiar apenas o arquivo principal de um banco WAL ativo. Documentar restauração.

## 7. Métricas e dashboard

### Definições

- Recebidos: eventos persistidos, pelo instante de recebimento.
- Entregues: ciclos de entrega que chegaram a sucesso, pelo instante de conclusão; não número de tentativas e não eventos únicos.
- Falhas definitivas: ciclos que esgotaram tentativas, pelo instante de transição para failed. Reenvio cria novo ciclo e não apaga a falha histórica.
- Tentativas com falha: chamadas finalizadas com erro/timeout/status não 2xx; separadas de tentativas interrompidas de resultado desconhecido.
- Taxa de falha: tentativas finalizadas com falha / tentativas finalizadas com resultado conhecido. Denominador zero aparece como sem dados, não como indicador enganoso.
- Fila atual: contagens separadas de pending, retry_scheduled e in_flight, incluindo destaque de itens de destinos pausados. Mostrar canceladas quando útil e idade da pendência mais antiga.
- Números da fila são atuais, independentes do filtro de período; namespace/destino ainda se aplicam.
- Filtro de destino afeta métricas de entrega, não transforma recebimentos em contagem por destino. Na UI, explicitar que recebidos é do namespace/global e não muda com esse filtro.

### Armazenamento e consultas

- Agregados persistentes por minuto UTC e dimensão: recebimentos por namespace; resultados de entrega e tentativa por namespace/destino. Evitar duplicar recebimentos em joins com destinos.
- Atualizar agregados junto da transação de domínio correspondente, exatamente uma vez por transição registrada.
- API e seletor de período usam fronteiras de minuto e intervalo [from, to); informar limites efetivos e granularidade. Gráficos podem agrupar minutos em horas/dias conforme período.
- Datas UTC na API e exibição no fuso do navegador, com indicação de fuso.
- Agregados não são removidos pela limpeza dos payloads. Consultas de fila usam estado real, não contadores históricos.

### Interface

- Painel em português, responsivo, visual limpo e funcional; contraste legível, estados vazios, carregamento, erros e feedback de operações.
- Cards: recebidos, entregues, falhas definitivas, aguardando primeira tentativa, aguardando retry e em processamento; taxa de falha e pendência mais antiga.
- Gráfico: recebimentos, entregas concluídas e tentativas com falha ao longo do tempo, com rótulos que deixam claras as unidades distintas.
- Tabela por destino: concluídas, pendências/retries, falhas definitivas e último erro com horário.
- Períodos: últimas 24h, 7 dias, 30 dias e personalizado; filtros por namespace e destino.
- Atualização a cada 10 segundos enquanto a tela estiver ativa, com indicação da última atualização. SSE não é necessário nesta versão.
- Páginas: login, dashboard, namespaces, detalhes de namespace/destinos, eventos e detalhes de evento/entregas/tentativas, gestão simples de tokens.
- Formulários de criação/edição, copiar URL de entrada, pausar/retomar/arquivar e reenvio manual com confirmação clara do alcance.
- Visualizar payload textual/JSON como texto escapado; binário como metadados e download autenticado seguro, sem executar conteúdo recebido.

## 8. API e autenticação

- Todos os endpoints administrativos, payloads, estatísticas e OpenAPI exigem autenticação. Entrada de webhook é separada e não exige sessão administrativa.
- Rotas sugeridas em `/api/v1`: `/auth/login`, `/auth/logout`, `/auth/me`, `/tokens`, `/namespaces`, `/namespaces/{id}/destinations`, `/destinations/{id}`, `/events`, `/events/{id}`, `/events/{id}/payload`, `/deliveries`, `/deliveries/{id}/attempts`, `/events/{id}/replays`, `/stats/summary`, `/stats/timeseries`, `/stats/destinations` e `/openapi.json`.
- Login é exceção pública com proteção básica contra tentativas excessivas. `/healthz` é liveness mínima e `/readyz` verifica prontidão sem revelar detalhes sensíveis.
- OpenAPI documenta autenticação, filtros, tipos, limites, semântica de métricas, paginação e erros. README inclui exemplos curl para agentes e um fluxo completo.
- Backend é fonte de verdade para validação; não confiar no estado de autenticação do React. Preferir tipos TypeScript derivados do OpenAPI ou contrato equivalente verificado.
- Administrador inicial provisionado por comando/configuração de bootstrap documentado; sem senha padrão fixa ou cadastro público. Não redefinir senha a cada restart.
- Cookies HttpOnly, SameSite e Secure em produção; sessões com expiração e revogação; operações autenticadas por cookie protegidas contra CSRF. Desenvolvimento local HTTP tem configuração explícita.
- Tokens aleatórios de alta entropia, exibidos uma única vez e armazenados como hash; listagem mostra apenas metadados e permite revogar. Mesmo nível administrativo nesta versão, sem RBAC.
- Segredo opcional por namespace em header específico para provedores compatíveis; armazenar hash, permitir rotação e remover esse header no encaminhamento. Nunca obrigatório para todos os provedores.
- Só administrador pode cadastrar destinos. Permitir HTTP/HTTPS e rede privada para uso com WireGuard/túnel; rejeitar schemes inválidos, userinfo e URLs que apontem de forma óbvia para o próprio relay criando loop. Não implementar uma plataforma complexa de políticas de rede.
- Logs sem payloads, senhas, cookies ou tokens por padrão. Headers sensíveis mascarados na visualização normal; conteúdo só acessível a administrador autenticado.

## 9. Deploy e operação

- Dockerfile multi-stage compila frontend e backend, produz imagem runtime enxuta, roda sem root e inclui certificados de confiança.
- Compose com aplicação e Caddy; apenas proxy exposto publicamente; volumes persistentes para SQLite e certificados.
- `.env.example` sem segredos reais; domínio, bootstrap, caminhos, limites, concorrência e retenção documentados. Secretos locais fora do versionamento.
- Caddy preserva corpo das entradas, aplica HTTPS e encaminha todas as rotas ao backend. Rotas React profundas em `/admin` têm fallback apropriado, sem capturar `/api` ou entradas de webhook.
- Em desenvolvimento, proxy do Vite permite trabalhar com a API sem CORS permissivo em produção.
- Documentar início local, build, testes, deploy, atualização/migrations, backup/restauração e diagnóstico de falhas.
- Explicar que o computador de casa precisa de caminho alcançável a partir da VPS quando ligado (URL pública, túnel ou VPN); não automatizar contratação/configuração de infraestrutura externa.
- Logs estruturados com IDs de evento/entrega, resultados e erros operacionais; sem Prometheus/Grafana obrigatórios.

## 10. Sequência de implementação e entregáveis

O graph possui entrada chamada Frontend. Usar este plano como contrato comum, respeitando as funções e transições configuradas no graph. A sequência abaixo indica dependências técnicas e não exige alterar a definição do graph.

1. **Contrato e frontend:** definir DTOs/rotas e implementar estrutura React, navegação, login, dashboard, tabelas e formulários. Se usar dados simulados durante construção, isolá-los para desenvolvimento/teste; o produto final precisa consultar API real.
2. **Fundação backend:** configuração, migrations, SQLite, autenticação, contratos OpenAPI, CRUD/arquivamento de namespaces/destinos e testes correspondentes.
3. **Entrada e fila:** persistência transacional, fan-out, cliente HTTP, worker, retry, pausa/retomada, recuperação de processo e reenvio manual.
4. **Métricas e retenção:** agregados transacionais, consultas históricas, visão atual da fila e limpeza que preserve pendências e estatísticas.
5. **Integração real:** ligar todas as telas às APIs, tratar erros/estados vazios, validar semântica de filtros e remover dependência de mocks em produção.
6. **Empacotamento e validação:** Docker/Compose/Caddy, README e exemplos para agentes; executar checks e cenários fim a fim. Reportar claramente comandos executados, resultados e verificações bloqueadas pelo ambiente.

## 11. Critérios de aceitação e testes proporcionais

### Fluxos essenciais

- Criar namespace e dois destinos pela API/painel autenticado. Enviar um evento e comprovar 1 recebido e 2 entregas, com bytes originais idênticos.
- Destino A responde 2xx; B falha e depois recupera: A não recebe retries por causa de B; B recebe conforme intervalo/orçamento e termina com sucesso.
- Verificar max_retries=0, retry finito, ilimitado, timeout, 3xx sem redirect, 4xx e 5xx; usar intervalos curtos/controlados em testes.
- Reiniciar com pendências e interromper tentativa em andamento: fila retoma sem eventos sumirem ou permanecerem presos. Possível duplicidade por resposta perdida é documentada.
- Falha na transação de recebimento não resulta em 202 e não deixa fan-out parcial.
- Payload binário, JSON com espaços/ordem original, headers repetidos e assinatura HMAC baseada no corpo chegam preservados; headers de transporte não são copiados cegamente.
- Evento sem destinos é retido; destino novo não recebe retroativamente sem ação manual. Reenvio funciona sem apagar histórico e repetição da mesma chave idempotente não duplica ciclo.
- Pausa acumula fila sem executar; retomada processa; arquivamento não cria fan-out futuro.

### Métricas e retenção

- Teste 1 evento/3 destinos evita triplicar recebimentos. Teste falha-falha-sucesso produz 1 entrega concluída, 2 tentativas com falha e nenhuma falha definitiva naquele ciclo.
- Reenvio após falha definitiva preserva falha histórica e contabiliza novo ciclo separadamente.
- Filtros, fronteiras temporais, denominador zero e fila atual sem filtro temporal têm resultados definidos.
- Limpeza remove eventos elegíveis sem apagar métricas históricas, dimensões arquivadas ou payloads ainda necessários a pendências.

### Autenticação, interface e entrega

- Acesso administrativo não autenticado é rejeitado; sessão, logout, CSRF, token revogado e segredo opcional de namespace funcionam.
- UI mostra dados reais e permite criar namespace/destino, acompanhar falha/retry e reenviar; funciona em tela pequena e trata estados vazios e erros.
- Testes de integração Rust com banco temporário e receptores HTTP locais exercitam a entrega real. Testes de frontend focados em fluxos relevantes, sem espelhar detalhes de implementação. Um smoke E2E com Playwright pode cobrir login e fluxo principal se o ambiente suportar.
- Executar format/check/lint/test Rust e typecheck/lint/build frontend, corrigindo falhas atribuíveis ao trabalho. Executar teste de containers quando Docker estiver disponível; indisponibilidade é reportada como limitação, nunca como validação concluída.
- Entrega final inclui código completo, migrations, lockfiles, configuração de deploy, documentação, lista dos testes executados e qualquer limitação restante.
- Não realizar commit, push ou deploy em VPS real sem solicitação adicional. Não usar credenciais externas ou disparar webhooks reais de provedores nos testes locais.

## 12. Fora do escopo inicial

Multiusuário/RBAC, cobrança, alta disponibilidade, fila distribuída, ordem estrita, entrega exatamente uma vez, integrações específicas por provedor, transformações de payload, alertas externos, SSE e servidor MCP. A API REST documentada atende aos agentes.
