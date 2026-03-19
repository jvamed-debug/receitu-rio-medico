# Receituário Médico Digital

Monorepo inicial do MVP clínico regulado para emissão de documentos clínicos digitais em Web e Mobile.

## Apps

- `apps/api`: backend NestJS modular
- `apps/web`: frontend Next.js
- `apps/mobile`: app Flutter

## Packages

- `domain`: contratos e entidades centrais
- `schemas`: validações e payloads
- `auth-contracts`: contratos de autenticação e sessão
- `compliance-rules`: regras regulatórias e políticas documentais
- `fhir`: modelos e mapeamentos para RNDS/HL7 FHIR
- `pdf-core`: contratos de layout e geração de PDF

## Comandos

```bash
npm install
npm run infra:up
npm run dev:api
npm run dev:web
```

## Pré-requisitos

- Node.js 24+
- npm 11+
- Docker / Docker Compose
- Flutter SDK 3.24+ para o app mobile

## Deploy

- Producao alvo atual: VPS Hostinger com EasyPanel
- Compose de producao: `infra/docker/docker-compose.prod.yml`
- Guia operacional: `docs/deploy/hostinger-easypanel.md`
