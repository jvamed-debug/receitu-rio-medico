# Backlog Técnico — Fase 1 (Fundação do Projeto)

## Objetivo da fase

Estabelecer a fundação técnica do monorepo, backend, frontend, mobile e infraestrutura local para permitir evolução segura das fases clínicas seguintes.

## Definição de pronto da fase

- monorepo funcional com `apps` e `packages`
- backend NestJS sobe localmente e responde em `/api/health`
- frontend web sobe localmente com shell autenticado base
- app Flutter possui bootstrap mínimo e estrutura por features
- Docker local sobe PostgreSQL, Redis, MinIO e Mailpit
- documentação arquitetural e baseline de compliance versionadas
- pipeline inicial de CI criada

## Épico 1 — Bootstrap do Monorepo

### FT-001 Criar workspace raiz com workspaces npm
- Descrição: configurar `package.json` raiz, scripts compartilhados, `tsconfig.base.json` e convenções do repositório.
- Critérios de aceite:
  - workspaces reconhecem `apps/*` e `packages/*`
  - scripts `dev`, `build`, `lint`, `typecheck`, `infra:up` existem
  - README raiz documenta stack e pré-requisitos
- Dependências: nenhuma
- Prioridade: P0

### FT-002 Definir estrutura de diretórios do monorepo
- Descrição: criar `apps`, `packages`, `docs`, `infra`, `scripts`, `tests`, `.github`.
- Critérios de aceite:
  - estrutura aderente ao ADR
  - cada módulo principal tem README inicial
- Dependências: FT-001
- Prioridade: P0

## Épico 2 — Fundação do Backend

### FT-010 Criar aplicação NestJS modular
- Descrição: bootstrap de `apps/api` com `AppModule`, `main.ts` e módulos de domínio iniciais.
- Critérios de aceite:
  - app compila
  - módulos `auth`, `patients`, `documents`, `signature`, `history` e `audit` existem
- Dependências: FT-001
- Prioridade: P0

### FT-011 Criar endpoint de healthcheck
- Descrição: expor `GET /api/health` com leitura de configuração base.
- Critérios de aceite:
  - endpoint responde `status=ok`
  - indica readiness básica de config
- Dependências: FT-010
- Prioridade: P0

### FT-012 Definir configuração inicial do backend
- Descrição: criar `ConfigModule`, `app.config.ts` e `.env.example`.
- Critérios de aceite:
  - variáveis de ambiente mínimas documentadas
  - chaves para DB, Redis, S3, OIDC e assinatura previstas
- Dependências: FT-010
- Prioridade: P0

### FT-013 Definir contratos iniciais de API
- Descrição: materializar controllers e DTOs base para auth, pacientes e documentos.
- Critérios de aceite:
  - endpoints iniciais existem
  - payloads centrais usam contratos compartilhados
- Dependências: FT-010
- Prioridade: P0

### FT-014 Criar esqueleto de persistência
- Descrição: preparar diretórios e placeholders para ORM, migrations e seeds.
- Critérios de aceite:
  - scripts `db:migrate` e `db:seed` existem
  - documentação aponta próximos passos para trocar memória por DB
- Dependências: FT-012
- Prioridade: P1

## Épico 3 — Contratos Compartilhados

### FT-020 Criar package `domain`
- Descrição: definir entidades iniciais do produto.
- Critérios de aceite:
  - `ClinicalDocument`, `Patient`, `ProfessionalProfile`, `AuditLog`, `SignatureSession` existem
  - tipos suportam lifecycle do MVP
- Dependências: FT-001
- Prioridade: P0

### FT-021 Criar package `schemas`
- Descrição: criar validações Zod para os principais payloads documentais.
- Critérios de aceite:
  - schemas para prescrição, exame, atestado, documento livre e janela de assinatura
- Dependências: FT-020
- Prioridade: P0

### FT-022 Criar packages transversais
- Descrição: criar `auth-contracts`, `compliance-rules`, `pdf-core`, `fhir`, `api-client`, `testing`, `design-system`, `ui-tokens`.
- Critérios de aceite:
  - cada package possui `package.json`, código inicial e README
- Dependências: FT-001
- Prioridade: P1

## Épico 4 — Fundação do Frontend Web

### FT-030 Criar app Next.js
- Descrição: bootstrap do `apps/web` com App Router, shell autenticado e páginas base.
- Critérios de aceite:
  - dashboard inicial existe
  - rotas de documentos, pacientes, histórico e settings existem
- Dependências: FT-001
- Prioridade: P0

### FT-031 Aplicar identidade visual inicial
- Descrição: criar tokens mínimos e shell visual consistente com produto clínico.
- Critérios de aceite:
  - tema inicial definido
  - layout lateral e conteúdo responsivo básico
- Dependências: FT-030
- Prioridade: P1

## Épico 5 — Fundação do Mobile

### FT-040 Criar app Flutter base
- Descrição: bootstrap do `apps/mobile` com `MaterialApp`, home inicial e estrutura feature-first.
- Critérios de aceite:
  - `main.dart` e `app.dart` existem
  - diretórios `auth`, `documents`, `patients`, `history` existem
- Dependências: FT-001
- Prioridade: P0

### FT-041 Definir convenções mobile
- Descrição: criar `pubspec.yaml`, `analysis_options.yaml` e teste inicial.
- Critérios de aceite:
  - projeto documenta dependência do Flutter SDK
  - teste widget inicial existe
- Dependências: FT-040
- Prioridade: P1

## Épico 6 — Infraestrutura Local e CI

### FT-050 Criar Docker Compose local
- Descrição: subir PostgreSQL, Redis, MinIO e Mailpit.
- Critérios de aceite:
  - compose existe em `infra/docker/docker-compose.yml`
  - serviços e portas documentados
- Dependências: FT-001
- Prioridade: P0

### FT-051 Criar bootstrap script local
- Descrição: script de setup com ordem operacional para o time.
- Critérios de aceite:
  - `scripts/setup/bootstrap.ps1` existe
  - passos locais de instalação documentados
- Dependências: FT-050
- Prioridade: P1

### FT-052 Criar workflow inicial de CI
- Descrição: workflow mínimo para instalar dependências e rodar typecheck.
- Critérios de aceite:
  - workflow em `.github/workflows/ci.yml`
  - dispara em push e PR
- Dependências: FT-001
- Prioridade: P1

## Épico 7 — Documentação de Engenharia

### FT-060 Registrar ADR inicial
- Descrição: documentar a decisão da arquitetura base.
- Critérios de aceite:
  - ADR versionado em `docs/adr`
- Dependências: FT-001
- Prioridade: P0

### FT-061 Documentar PRD do MVP e baseline de compliance
- Descrição: registrar escopo, sucesso, fora do MVP e regras mínimas.
- Critérios de aceite:
  - documentos em `docs/prd` e `docs/compliance`
- Dependências: FT-001
- Prioridade: P0

### FT-062 Documentar outline inicial de APIs
- Descrição: consolidar endpoints base e objetivos de cada domínio.
- Critérios de aceite:
  - outline em `docs/api/openapi-outline.md`
- Dependências: FT-013
- Prioridade: P1

## Ordem sugerida de execução

1. FT-001
2. FT-002
3. FT-020
4. FT-021
5. FT-010
6. FT-012
7. FT-011
8. FT-013
9. FT-030
10. FT-040
11. FT-050
12. FT-060
13. FT-061
14. FT-052
15. FT-014, FT-022, FT-031, FT-041, FT-051, FT-062

## Riscos da fase 1

| Risco | Impacto | Mitigação |
|---|---:|---|
| Flutter ausente no ambiente | Médio | Documentar como pré-requisito e manter shell inicial versionado |
| Escopo da fundação crescer demais | Alto | Restringir a fase à infraestrutura e contratos, sem lógica clínica profunda |
| Acoplamento precoce entre módulos | Alto | Forçar fronteiras em `packages` e `modules` |
| Ausência de provider real | Médio | Usar placeholders e contratos prontos para integração |

