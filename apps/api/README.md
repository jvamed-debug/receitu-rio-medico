# API

Backend NestJS do Receituário Médico Digital, organizado como monólito modular com fronteiras prontas para futura extração.

## Estrutura inicial

```text
src/
├─ app.module.ts
├─ main.ts
├─ config/
│  └─ app.config.ts
├─ common/
│  ├─ README.md
│  └─ guards/
│     └─ mock-auth.guard.ts
├─ persistence/
│  ├─ persistence.module.ts
│  └─ prisma.service.ts
└─ modules/
   ├─ health/
   ├─ auth/
   ├─ professionals/
   ├─ patients/
   ├─ documents/
   ├─ templates/
   ├─ signature/
   ├─ history/
   ├─ audit/
   ├─ delivery/
   └─ branding/
```

## Responsabilidades por módulo

- `health`: readiness e smoke check do serviço
- `auth`: cadastro, login, refresh, enrolment biométrico e perfil
- `professionals`: habilitação e status do profissional
- `patients`: cadastro e consulta de pacientes
- `documents`: criação, consulta, duplicação, preview e entrega documental
- `templates`: modelos versionados
- `signature`: sessões e janelas temporárias de assinatura
- `history`: histórico geral e por paciente
- `audit`: trilha e capacidade de observabilidade auditável
- `delivery`: canais disponíveis e status
- `branding`: configuração visual segura do receituário

## Decisões da fase 1

- persistência temporária em memória para acelerar bootstrap
- Prisma definido como camada alvo de persistência
- variáveis de ambiente mapeadas em `.env.example`
- endpoint `GET /api/health` como probe inicial
- `ConfigModule` global para preparar integração com provedores externos

## Próximos passos técnicos

- gerar client Prisma e primeira migration
- substituir armazenamento em memória por repositórios persistentes
- integrar provider OIDC
- integrar vendor de assinatura
- criar filas para PDF, entrega e auditoria assíncrona

## Persistência alvo

- schema Prisma em `prisma/schema.prisma`
- PostgreSQL como banco principal
- modelos iniciais para `User`, `ProfessionalProfile`, `Patient`, `ClinicalDocument`, `Template`, `SignatureSession`, `PdfArtifact`, `DeliveryEvent` e `AuditLog`
