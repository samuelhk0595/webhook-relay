# Plano de layout e integração frontend

Contrato funcional: ../IMPLEMENTATION_PLAN.md, lido integralmente. Nenhum backend existe nesta etapa; não implementá-lo neste nó.

## Plano da retomada — ativação c66b1d67

1. Preservar a direção visual e o código salvos; confrontar plano, handoff, DTOs e cliente real com os fluxos já expostos.
2. Conferir separação de histórico/fila e unidades de métrica, formulários, payload seguro, confirmação de reenvio e tokens. Corrigir apenas lacunas materiais comprovadas, sem nova rodada estética.
3. Reexecutar checks e Playwright existente; inspecionar capturas desktop/mobile e checagens de responsividade/erros, sem criar testes de componentes.
4. Registrar resultado e encaminhar os contratos ao Backend, sem confundir interceptação de API com integração real.

Resultado: plano concluído, sem lacuna material encontrada e sem edição de UI. Ver verificações atuais em `HANDOFF.md`. Orientação de foco visível/não obscurecido confirmada pela busca UX da skill; a busca de stack React não encontrou correspondência após uma reformulação, portanto a revisão de cache/lazy loading se apoiou nas diretrizes Vercel e no código existente. Skills usadas somente para leitura/execução; Python com `-B` e saídas fora dos snapshots.

## Direção confirmada

Painel operacional claro, navegação lateral recolhível, foco em diagnóstico e correção de destinos. Construção code-first; sem imagens decorativas ou alegações operacionais inventadas. Uso em navegador de trabalho, com luz ambiente: fundo claro reduz contraste com ferramentas e documentação abertas ao lado.

## Estrutura

- /admin/login: acesso único por usuário/senha, recuperação orientada ao operador da VPS.
- /admin: filtros globais → quatro indicadores históricos → faixa de fila atual → gráfico → diagnóstico por destino.
- /admin/namespaces: lista com URL copiável e acesso ao detalhe; formulário dedicado de criação/edição.
- /admin/namespaces/:id: configuração, segredo opcional e destinos; arquivamento com consequências explícitas.
- /admin/destinations/new e /admin/destinations/:id: URL, política, pausa/retomada/arquivo. Edição avisa que política vale para novas entregas, mas URL atual vale para a próxima tentativa.
- /admin/events: filtros e paginação por cursor; detalhe com metadados, headers mascarados, payload escapado e ciclos de entrega/tentativas.
- /admin/tokens: metadados, criação com exibição única e revogação confirmada.

## Hierarquia e estados

Grades adaptam de quatro para duas/uma coluna. Menu mobile usa Dialog Radix com foco preso e restauração; formulários são páginas, não modais. Tabelas têm rolagem local e nomes acessíveis. Confirmações destrutivas e reenvio usam Dialog. Labels persistentes, erros recuperáveis, skeletons, vazio instrutivo, atualização em segundo plano sem apagar conteúdo. Toasts acessíveis para ações. Fuso do navegador indicado; filtros temporais alinhados ao minuto. Polling de 10s apenas com documento visível.

## Direction contract

THESIS: a unidade de trabalho é a entrega, não o webhook; recebido/histórico e fila atual são regiões separadas.
OWN-WORLD: branco frio, rail azul-petróleo, teal de ação, azul de recebimento, âmbar de retry e vermelho reservado à falha; Public Sans e números tabulares.
STORY: identificar pendências, localizar o destino, inspecionar tentativas, corrigir e reenviar sem apagar histórico.
FIRST VIEWPORT: sidebar 232px; conteúdo com título e filtros, grade histórica de quatro indicadores, faixa de quatro estados atuais e gráfico largo. Tabela de diagnóstico logo abaixo. Ação primária no topo à direita.
FORM: direção de interface operacional confirmada pelo usuário prevalece sobre o sorteio; referência seed:2e492d200ccdf201. Movimento assinatura: pequeno realce transitório no horário de atualização, sem deslocar métricas; reduzido a mudança de texto com reduced-motion.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Contrato técnico

Cliente real é o único caminho de runtime. DTOs em src/lib/contracts.ts e rotas em src/lib/api.ts. Fixtures e interceptação Playwright ficam em e2e/, fora de src/ e dist/. CONTRATO_API.md documentará endpoints, CSRF, paginação, métricas e integração. Recharts carregado em chunk separado. TanStack Query deduplica consultas e preserva cache; consultas independentes iniciam em paralelo. Não persistir credenciais no navegador.

## Validação

Typecheck, ESLint e build. Playwright via ferramenta de linha de comando (não há MCP Playwright exposto nesta ativação): fluxos com API interceptada explicitamente, screenshots desktop/mobile e erros de rede. Isso valida frontend, não é teste de backend nem entrega de webhook real. Revisão e documentação executadas localmente: esta ativação não dispõe de ferramenta de subagentes.
