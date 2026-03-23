# Programa de Execucao da Healthtech: 26 Passos

## Objetivo

Consolidar a transformacao do `receitu-rio-medico` em uma healthtech regulada, segura e escalavel, conectando:

- produto clinico
- seguranca
- compliance
- operacao
- ecossistema
- escala

Este documento organiza os 26 passos em execucao progressiva, com status e foco pratico.

## Status geral

### Concluidos

1. congelar escopo do core
2. revisar a arquitetura atual
3. criar trilhas formais
4. endurecer autenticacao e autorizacao inicial
5. blindar leitura por recurso e conter IDOR interno

### Em progresso

6. blindar documentos e links compartilhados
7. fechar matriz regulatoria por tipo documental
8. fortalecer LGPD operacional

### Pendentes

9 a 26

## Trilha 1: Fundacao e seguranca

### 1. Congelar escopo do core

Status: concluido

Core atual definido:

- auth
- professionals
- patients
- documents
- templates
- signature
- delivery
- audit
- compliance

### 2. Revisar arquitetura atual

Status: concluido

Artefatos:

- [mapa-verde-amarelo-vermelho.md](/c:/Users/jvame/.antigravity/receitu-rio-medico/docs/prd/mapa-verde-amarelo-vermelho.md)

### 3. Criar trilhas formais

Status: concluido

Trilhas ativas:

- seguranca e compliance
- core clinico
- operacao da clinica
- integracoes e escala

### 4. Endurecer autenticacao e autorizacao

Status: concluido na Fase A

Entregue:

- principal tipado
- `ResourceAccessService`
- policy por recurso para `documents`, `patients`, `history` e `delivery`
- auditoria de acesso negado

### 5. Blindar documentos e leituras por `id`

Status: concluido na Fase A

Entregue:

- leitura de documento exige policy
- preview PDF exige policy
- duplicate exige policy
- delivery events exige policy

### 6. Blindar links compartilhados

Status: em progresso com primeira entrega

Entregue:

- token opaco
- hash persistido
- expiração
- limite de uso
- revogacao
- endpoint publico controlado para resolucao do link

Falta:

- uso unico por politica documental
- renderizacao publica segura do artefato final
- trilha de IP/user-agent na resolucao do token

### 7. Fechar matriz regulatoria

Status: em progresso

Base atual:

- [compliance.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/compliance/compliance.service.ts)

Proximos incrementos:

- assinatura minima por tipo documental
- politica de compartilhamento por tipo documental
- bloqueios por papel
- justificativa de override

### 8. Fortalecer LGPD

Status: em progresso

Proximos incrementos:

- campos de consentimento quando aplicavel
- retention/disposal plan
- log enriquecido
- anonimização para analytics

## Trilha 2: Dominio clinico

### 9. Evoluir o modelo de dados

Status: pendente

Prioridades:

- alergias
- problemas/diagnosticos
- medicamentos em uso
- encounters
- timeline clinica

### 10. Tipar melhor os documentos

Status: pendente

Prioridades:

- contratos mais fortes por tipo documental
- versionamento formal
- payloads menos genericos

### 11. Criar engine de templates seria

Status: parcialmente concluido

Ja existe:

- favoritos por usuario
- templates institucionais/pessoais
- versionamento inicial

Falta:

- governanca por clinica
- aprovacao/publicacao institucional

### 12. Melhorar prontuario

Status: pendente

Prioridades:

- timeline real
- evolucao clinica
- problemas e alergias
- documentos e eventos consolidados

## Trilha 3: Assinatura e validade juridica

### 13. Integrar provedor real ICP-Brasil

Status: pendente

Hoje:

- fluxo e simulacao operacional existem

Falta:

- provider real
- callback real
- evidencias tecnicas

### 14. Criar trilha probatoria

Status: pendente

Necessario:

- hash documental
- carimbo temporal
- evidencias da sessao
- cadeia de auditoria forte

### 15. Separar autenticacao e assinatura

Status: parcialmente concluido

Falta:

- step-up auth
- approval window com enforcement forte

## Trilha 4: Produto clinico de uso diario

### 16. Refinar UX clinica

Status: em progresso

Ja existe:

- dashboard
- onboarding
- templates
- presets

Falta:

- fluxo mais curto por especialidade
- atalhos por contexto assistencial

### 17. Criar biblioteca clinica forte

Status: em progresso avancado

Ja existe:

- presets
- grupos laboratoriais
- modelos padronizados

Falta:

- validacao clinica mais forte
- curadoria institucional

### 18. Incluir CDS basico

Status: pendente

Comecar por:

- alergias
- interacoes graves
- duplicidade terapeutica

## Trilha 5: Operacao da clinica

### 19. Agenda

Status: pendente

### 20. Financeiro

Status: pendente

### 21. Comunicacao

Status: pendente

Foco:

- WhatsApp
- SMS
- e-mail transacional

## Trilha 6: Ecossistema e monetizacao

### 22. Integracao farmaceutica

Status: pendente

### 23. Analytics

Status: pendente

### 24. Multitenancy

Status: em progresso inicial

Prioridade:

- organizacao
- membership
- governanca por tenant

Ja entregue:

- `Organization`
- `OrganizationMembership`
- `primaryOrganizationId` no perfil profissional
- `organizationId` em pacientes e documentos
- emissao e listagem respeitando organizacao quando presente

## Trilha 7: Escala e governanca

### 25. Observabilidade

Status: pendente

### 26. Filas, eventos e operacao segura

Status: pendente

Escopo:

- jobs assincronos
- retries
- circuit breaker
- incident response
- backups e restore

## Sequencia pratica recomendada a partir de agora

1. terminar endurecimento de share links
2. enriquecer compliance por tipo documental
3. começar modelagem de prontuario clinico
4. preparar step-up auth e assinatura real
5. introduzir estrutura de organizacao e membership
6. entrar em agenda, comunicacao e financeiro
7. só depois abrir farmacias, analytics e multitenancy completo

## Regra de execucao

Nao abrir novas frentes de ecossistema antes de concluir:

- autorizacao por recurso
- links seguros
- compliance minimo forte
- ownership institucional basico
