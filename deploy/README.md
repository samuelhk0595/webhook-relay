# Publicação do Webhook Relay

## Topologia de produção

```text
GitHub main/master → checks → Docker Buildx → smoke → SSH/SCP → release.sh
Internet → Cloudflare DNS → Traefik existente (:80/:443) → edge → relay:8080
                                                             └─ SQLite /data
```

- URL: `https://hooks.codemob.com.br/admin/`.
- Arquivos de runtime: `/opt/webhook-relay`.
- Usuário de automação: `webhook-deploy`, chave SSH exclusiva, acesso ao Docker.
- Volume persistente: `webhook-relay-data`; aplicação roda como UID/GID 10001, sem root.
- Proxy existente: Traefik, rede externa `edge`, resolver `letsencrypt` por DNS-01/Cloudflare.
- Rota isolada: `/opt/codemob-infra/traefik/dynamic/webhook-relay.yml`, derivada de `traefik.dynamic.yaml`. Não substituir `routers.yml`, reiniciar lojas ou iniciar outro proxy nas portas 80/443.
- Não há Node, Redis ou registry obrigatório no runtime. Imagem transportada por SSH e carregada pelo Docker da VPS.

## Provisionamento inicial

Requisitos no host: Docker/Compose com `up --wait`, OpenSSH, Bash, `flock`, gzip e rede Docker `edge`. A infraestrutura compartilhada já fornece esses serviços na VPS atual.

1. Crie o usuário `webhook-deploy`, grupo Docker, diretório `/opt/webhook-relay` de sua propriedade e subdiretórios `incoming`, `releases`, `backups`, `secrets`, com permissões restritas.
2. Cadastre uma chave pública exclusiva em `/home/webhook-deploy/.ssh/authorized_keys`, sem remover chaves existentes. Recomenda-se `no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-pty`.
3. Cadastre chave privada no secret `VPS_SSH_KEY` e variáveis `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_HOST_KEY` do repositório. Valide a chave de host por acesso confiável antes de salvá-la; a pipeline não usa `StrictHostKeyChecking=no`.
4. Crie `/opt/webhook-relay/.env` (600, proprietário de deploy):

```dotenv
DOMAIN=hooks.codemob.com.br
BOOTSTRAP_USERNAME=admin
PROXY_NETWORK=edge
# Limites opcionais iguais aos defaults documentados no README raiz.
```

5. Gere senha forte em `/opt/webhook-relay/secrets/bootstrap_password.txt`. O arquivo deve pertencer ao UID/GID **10001:10001**, modo **400**, para que o usuário não-root do container possa ler o secret. Secrets Compose baseados em arquivo mantêm as permissões do arquivo de origem. Nunca coloque esse arquivo no Git.
6. Crie/valide o registro DNS de `hooks.codemob.com.br` apontando à VPS. O token já usado pelo resolver Traefik precisa autorizar a zona `codemob.com.br`; credenciais Cloudflare não vão para o Actions.
7. Instale `traefik.dynamic.yaml` como **novo arquivo** `webhook-relay.yml` na pasta dinâmica do Traefik. O file provider faz hot reload; as rotas existentes permanecem.
8. Faça merge/push na branch padrão ou execute o workflow manualmente. A pipeline cria o primeiro banco e bootstrap. Em reinícios/deploys seguintes, a senha não é redefinida.

O usuário no grupo Docker controla containers do host: restrinja a chave ao repositório/operadores de deploy, sem reutilizá-la para acesso pessoal. Não é necessário dar senha root à pipeline.

## Como a release funciona

O workflow roda em pull requests de `main`/`master` e em pushes dessas branches. PR verifica sem acessar secrets de produção; deploy só ocorre em branch principal. `workflow_dispatch` permite repetir a publicação da branch principal. Atualizações diretas também disparam deploy.

O SHA do commit é a tag da imagem e o identificador de `/opt/webhook-relay/incoming/<sha>`. A pipeline transmite imagem gzip, checksum, Compose e script. `release.sh`:

- Valida SHA, checksum e label OCI da imagem; carrega-a sem baixar código/segredos GitHub na VPS.
- Usa `flock` para impedir releases concorrentes no host.
- Faz `VACUUM INTO` no container existente, copia o snapshot para `backups/` e só então inicia a substituição.
- Preserva `previous.env`, `previous-compose.yaml`, imagens e `releases/<sha>/`.
- Recria somente o relay, aguarda saúde e atualiza `current.env`/`current.sha` apenas após sucesso.
- Remove o arquivo compactado de transporte após sucesso; mantém os backups.

Migrations são aplicadas pelo binário no startup. Se a imagem ficar unhealthy, a publicação falha e mostra logs limitados. Não há rollback automático cego: um schema migrado pode não ser compatível com o binário anterior. Os serviços das outras aplicações não participam do Compose do relay.

Há uma breve indisponibilidade durante a troca da instância única. Eventos já aceitos permanecem no volume; o provedor deve retentar entradas que receberam erro durante a troca. Chamada em curso interrompida pode duplicar efeitos após recuperação, conforme o contrato de entrega.

## Operação na VPS

Em uma sessão de operador, defina o helper para usar a configuração e tag atualmente aprovadas:

```bash
dc() {
  docker compose --project-directory /opt/webhook-relay \
    --env-file /opt/webhook-relay/.env \
    --env-file /opt/webhook-relay/current.env \
    -f /opt/webhook-relay/compose.yaml "$@"
}
dc ps
dc logs --tail 100 app
dc exec -T app curl --fail --silent http://127.0.0.1:8080/readyz
curl --fail --silent --show-error https://hooks.codemob.com.br/readyz
```

Não rode `docker compose down -v`, não apague `webhook-relay-data` e não inicie duas instâncias usando o banco. Monitorar espaço disponível é importante: filas ilimitadas, métricas e backups crescem. O deploy preserva snapshots; mova-os regularmente a armazenamento privado fora da VPS e faça manutenção dos antigos após validar as cópias.

### Backup e restauração

Backups automáticos de pré-deploy ficam em `/opt/webhook-relay/backups/`. Para backup adicional:

```bash
snapshot="manual-$(date -u +%Y%m%dT%H%M%SZ).db"
dc exec -T app webhook-forwarder backup "/data/$snapshot"
container="$(dc ps -q app)"
docker cp "$container:/data/$snapshot" "/opt/webhook-relay/backups/$snapshot"
test -s "/opt/webhook-relay/backups/$snapshot"
dc exec -T app rm -f "/data/$snapshot"
```

O backup usa SQLite `VACUUM INTO`, não cópia de um `.db` ativo isolado do WAL. Confira integridade da cópia com SQLite antes de restaurar. Pare apenas o relay, preserve estado atual e restaure com app parado:

```bash
dc stop app
dc run --rm --no-deps --user 0 --entrypoint sh \
  -v /opt/webhook-relay/backups:/restore:ro app -c \
  'rm -f /data/forwarder.db-wal /data/forwarder.db-shm; cp /restore/SEU-SNAPSHOT.db /data/forwarder.db; chown 10001:10001 /data/forwarder.db; chmod 600 /data/forwarder.db'
dc up -d --wait
```

### Rollback

Antes de voltar a versão, confira se houve migration e se a versão antiga aceita o schema atual. Se não aceitar, restaure o snapshot pré-deploy correspondente com o servidor parado. Guarde uma cópia do estado atual antes dessa operação.

Para schema compatível, salve a configuração atual, copie `previous-compose.yaml` para `compose.yaml`, `previous.env` para `current.env` e rode `dc up -d --wait`. As imagens anteriores foram preservadas. Depois verifique readyz, versão, histórico e entregas. Não apague dados automaticamente para tentar resolver um deploy com erro.

### Recuperar senha

Pare app, troque o arquivo privado de bootstrap por uma senha nova mantendo UID 10001/mode 400, execute `dc run --rm --no-deps app reset-password` e `dc up -d --wait`. O comando revoga todas as sessões/tokens administrativos e conserva a fila. Não há reset público.

## Configurações separadas

- `compose.production.yaml`: VPS atual, imagem imutável + proxy Traefik existente.
- `traefik.dynamic.yaml`: rota de `hooks.codemob.com.br` para `http://webhook-relay-app:8080`.
- `compose.yaml` e `Caddyfile`: instalação standalone em VPS nova, com build local e Caddy nas portas 80/443. Não executar em paralelo ao proxy atual.
- `release.sh`: publicação a partir de bundle produzido pelo Actions.

O resultado de cada publicação fica no run do GitHub Actions. Readiness HTTP bem-sucedida não substitui os testes de fan-out/retry, que também rodam antes de publicar. Credenciais de administrador, SSH, Cloudflare e payloads nunca devem ser incluídos em commits, screenshots públicos ou logs de CI.
