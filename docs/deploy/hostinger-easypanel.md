# Deploy na Hostinger com EasyPanel

Este projeto esta preparado para deploy em VPS da Hostinger usando Docker Compose no EasyPanel.

## Topologia recomendada

- `web`: Next.js em `app.seudominio.com`
- `api`: NestJS em `api.seudominio.com`
- `postgres`: banco local persistente no VPS
- `redis`: cache, fila e controles operacionais
- `minio`: storage S3 compativel para PDFs e artefatos

## Arquivos usados no deploy

- Compose de producao: `infra/docker/docker-compose.prod.yml`
- Variaveis de ambiente: `.env.production`
- Dockerfile da API: `apps/api/Dockerfile`
- Dockerfile do Web: `apps/web/Dockerfile`

## Preparacao no repositorio

1. Copie `.env.production.example` para `.env.production`
2. Preencha senhas, dominios e chaves
3. Defina os dominios publicos do `web` e da `api`
4. Confirme que `DATABASE_URL` usa o host interno `postgres`
5. Confirme que `API_BASE_URL` esta como `http://api:3001`

## Preparacao no EasyPanel

1. Crie ou escolha a VPS com Docker/EasyPanel ativo
2. Conecte o repositorio Git
3. Aponte o projeto para `infra/docker/docker-compose.prod.yml`
4. Cadastre as variaveis de ambiente do `.env.production`
5. Configure volumes persistentes para `postgres`, `redis` e `minio`
6. Publique os servicos e configure os dominios

## Dominios sugeridos

- `app.seudominio.com` para o frontend
- `api.seudominio.com` para o backend

## Ordem do primeiro deploy

1. Subir stack completa
2. Validar `api` em `/api/health/live` e `/api/health/ready`
3. Rodar migracoes Prisma no container da API
4. Rodar seed inicial opcional
5. Publicar dominio do `web`

## Comandos uteis

Localmente, usando o compose de producao:

```bash
npm run infra:prod:up
npm run db:deploy
npm run db:seed
```

## Observacoes operacionais

- `mailpit` nao entra em producao
- `db:migrate` e apenas para desenvolvimento; em producao use `db:deploy`
- o storage MinIO atende bem homologacao e MVP, mas pode ser trocado depois por S3 gerenciado
- mantenha backups do Postgres e do bucket de artefatos
- o compose de producao cria o bucket do MinIO automaticamente via servico `minio-init`
- a API depende de `AUTH_TOKEN_SECRET` em producao; nao publique com o valor default

## CI/CD com GitHub Actions

O workflow `.github/workflows/deploy-hostinger.yml` usa a action oficial da Hostinger.

Configure no GitHub:

- Secret `HOSTINGER_API_KEY`
- Secret `AUTH_TOKEN_SECRET`
- Secret `DATABASE_URL`
- Secret `POSTGRES_PASSWORD`
- Secret `STORAGE_SECRET_KEY`
- Secret `SIGNATURE_PROVIDER_API_KEY`
- Secret `OIDC_CLIENT_SECRET`
- Secret `SMTP_USER`
- Secret `SMTP_PASSWORD`
- Variable `HOSTINGER_VM_ID`
- Variable `APP_PUBLIC_URL`
- Variable `API_PUBLIC_URL`
- Variable `POSTGRES_DB`
- Variable `POSTGRES_USER`
- Variable `STORAGE_ACCESS_KEY`
- Variable `STORAGE_BUCKET`
- Variable `STORAGE_REGION`
- Variable `OIDC_ISSUER_URL`
- Variable `OIDC_CLIENT_ID`
- Variable `SIGNATURE_PROVIDER_BASE_URL`
- Variable `EMAIL_FROM`
- Variable `SMTP_HOST`
- Variable `SMTP_PORT`

## Referencias oficiais

- Hostinger deploy via GitHub Actions: https://www.hostinger.com/support/deploy-to-hostinger-vps-using-github-actions/
- Hostinger deploy com Docker Compose: https://www.hostinger.com/support/deploy-on-hostinger-button/
