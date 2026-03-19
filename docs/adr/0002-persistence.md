# ADR 0002: Camada de Persistência Inicial

## Status

Aceita

## Contexto

O backend já possui módulos e contratos iniciais, mas precisa de um alvo claro de persistência para evoluir além do armazenamento em memória.

## Decisão

- Adotar Prisma como ORM inicial do backend.
- Usar PostgreSQL como banco transacional principal.
- Manter controllers e services ainda com memória temporária enquanto a camada de repositórios é introduzida.
- Criar `PersistenceModule` global para expor `PrismaService`.

## Consequências

- menor atrito para migrations e geração de client
- boa produtividade no MVP
- transição gradual sem bloquear os fluxos já scaffoldados

