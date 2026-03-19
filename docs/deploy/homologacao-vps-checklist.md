# Checklist de Homologacao na VPS

## Infraestrutura

- `docker compose ps` mostra `postgres`, `redis`, `minio`, `api` e `web` como saudaveis
- `minio-init` concluiu com sucesso
- volumes persistentes estao montados para `postgres`, `redis` e `minio`

## API

- `GET /api/health/live` retorna `ok`
- `GET /api/health/ready` retorna `ready`
- `db:deploy` executado sem erro
- `db:seed` executado quando aplicavel

## Seguranca

- `AUTH_TOKEN_SECRET` definido com valor forte
- credenciais do banco e storage fora do repositorio
- dominios HTTPS configurados no EasyPanel
- acessos administrativos restritos

## Aplicacao Web

- pagina inicial abre via dominio publico
- login funcional
- criacao de paciente funcional
- criacao e assinatura de documento funcional
- preview/PDF carrega payload e artefato corretamente

## Storage e Artefatos

- bucket configurado e existente
- `PdfArtifact` criado apos assinatura
- links de artefato usam `storageKey` consistente

## Entrega e Auditoria

- envio por e-mail registra `DeliveryEvent`
- link de compartilhamento registra `DeliveryEvent`
- consulta em `/api/audit/events` retorna trilha

## Mobile

- app aponta para `API_PUBLIC_URL`
- login funcional
- pacientes, historico e documentos sincronizados
- preview operacional responde sem erro
