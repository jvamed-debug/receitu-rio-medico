# ADR 0001: Arquitetura Inicial do Receituário Médico Digital

## Status

Aceita

## Contexto

O produto precisa suportar emissão de documentos clínicos nato digitais, assinatura eletrônica, rastreabilidade, personalização controlada e futura interoperabilidade com SNCR/RNDS.

## Decisão

- Adotar monorepo com `apps` e `packages` compartilhados.
- Backend em NestJS organizado como monólito modular.
- Frontend web em Next.js App Router.
- App mobile em Flutter.
- Contratos de domínio e validações compartilhados entre camadas sempre que possível.
- Integrações regulatórias isoladas em módulos/ports para futura extração.

## Consequências

### Positivas

- Menor custo de coordenação no MVP.
- Evolução segura para microsserviços por domínio.
- Reuso forte de contratos, design system e políticas.

### Negativas

- Requer disciplina de fronteira entre módulos para evitar acoplamento.
- Flutter depende de toolchain adicional fora do Node.

## Próximas ADRs

- Provedor de identidade
- Vendor de assinatura ICP-Brasil / Gov.br
- Estratégia de PDF assinado
- Política documental por tipo

