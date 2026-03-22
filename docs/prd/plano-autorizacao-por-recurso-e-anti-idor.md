# Plano Tecnico: Autorizacao por Recurso e Blindagem Anti-IDOR

## Objetivo

Transformar a seguranca de acesso do `receitu-rio-medico` de um modelo centrado apenas em autenticacao para um modelo de autorizacao contextual por recurso, reduzindo o risco de exposicao indevida de dados clinicos, documentos e links compartilhados.

Este plano ataca diretamente o primeiro item `Vermelho` do mapa arquitetural: acesso indevido por `id` e ausencia de verificacoes fortes de ownership, escopo assistencial e finalidade de uso.

## Status atual

### Fase A

Implementada no backend atual com:

- `ResourceAccessService`
- enforcement em `documents`, `delivery`, `patients` e `history`
- auditoria de negacao de acesso
- ownership minimo em `Patient` via `primaryProfessionalId`
- testes unitarios da policy central

Escopo ainda fora desta fase:

- token opaco de compartilhamento externo
- grants explicitos para assistentes/equipe
- step-up auth para operacoes sensiveis

## Diagnostico atual no codigo

### Achados concretos

Arquivos-base analisados:

- [auth.guard.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/auth/auth.guard.ts)
- [documents.controller.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/documents/documents.controller.ts)
- [documents.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/documents/documents.service.ts)
- [patients.controller.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/patients/patients.controller.ts)
- [patients.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/patients/patients.service.ts)
- [delivery.controller.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/delivery/delivery.controller.ts)
- [delivery.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/delivery/delivery.service.ts)
- [schema.prisma](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/prisma/schema.prisma)

### Riscos encontrados

#### 1. `AuthGuard` autentica, mas nao autoriza por recurso

O guard atual apenas:

- extrai o token
- valida assinatura e tipo
- injeta `userId`, `professionalId` e `roles`

Ele nao verifica:

- se o recurso pertence ao profissional
- se o usuario pode acessar o paciente/documento solicitado
- se a acao atual exige escopo adicional

Conclusao:

- o sistema esta protegido contra acesso anonimo
- mas nao esta protegido contra acesso autenticado indevido

#### 2. Leitura de documentos por `id` sem ownership check explicito

Em [documents.controller.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/documents/documents.controller.ts), as rotas abaixo aceitam `:id` diretamente:

- `GET /documents/:id`
- `GET /documents/:id/pdf`
- `POST /documents/:id/duplicate`
- `POST /documents/:id/deliver/email`
- `POST /documents/:id/deliver/share-link`

Em [documents.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/documents/documents.service.ts), os metodos:

- `getById`
- `getPdfPreview`
- `duplicate`

buscam por `findUnique({ where: { id } })`, sem filtrar por:

- `authorProfessionalId`
- vinculo institucional futuro
- relacao contextual do usuario com o documento

Conclusao:

- qualquer usuario autenticado que descubra um `id` valido pode ter caminho para acessar ou operar sobre documento alheio

#### 3. Pacientes sao listados e lidos sem escopo assistencial

Em [patients.controller.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/patients/patients.controller.ts):

- `GET /patients`
- `GET /patients/:id`

Em [patients.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/patients/patients.service.ts), nao existe filtro por:

- profissional responsavel
- relacao do paciente com a sessao
- tenant/clinica

Adicionalmente, o model `Patient` ainda nao tem ownership institucional ou clinico.

Conclusao:

- hoje o cadastro de pacientes se comporta como um repositorio global autenticado

#### 4. Delivery expoe eventos por documento sem policy check forte

Em [delivery.controller.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/delivery/delivery.controller.ts):

- `GET /delivery/documents/:id/events`

Em [delivery.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/delivery/delivery.service.ts), a listagem busca apenas por `documentId`.

Conclusao:

- eventos de entrega, canais e targets podem ficar expostos para usuarios autenticados fora do contexto correto

#### 5. Links de compartilhamento ainda sao previsiveis e sem expiração

Hoje o share link e gerado assim:

- `https://example.local/documents/{documentId}/share`

Problemas:

- carrega `documentId` diretamente na URL
- nao possui token assinado
- nao possui TTL
- nao possui escopo de acesso
- nao possui revogacao

Conclusao:

- este ponto e altamente sensivel do ponto de vista de IDOR e vazamento indireto

#### 6. O modelo de dados ainda nao suporta ownership rico

Em [schema.prisma](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/prisma/schema.prisma):

- `ClinicalDocument` possui `authorProfessionalId`
- `Patient` ainda nao possui referencia a profissional dono ou organizacao
- nao existe tenant/clinica/unidade
- nao existe tabela de grant explicito de acesso

Conclusao:

- o dominio atual suporta autoria, mas nao governanca de acesso

## Meta arquitetural

O sistema deve evoluir para um modelo com 4 camadas de protecao:

1. autenticacao valida da sessao
2. autorizacao por papel
3. autorizacao por recurso
4. protecao de links/artefatos compartilhados fora da sessao

## Modelo de autorizacao alvo

### Princípios

- negar por padrao
- permitir por contexto
- separar `quem e o usuario` de `o que ele pode fazer neste recurso`
- nao usar `id` sozinho como prova de autorizacao

### Politica alvo por perfil

#### Professional

Pode:

- acessar seus proprios documentos
- acessar pacientes vinculados ao seu contexto assistencial
- emitir, duplicar, entregar e visualizar apenas recursos autorizados

Nao pode:

- ler documento de outro profissional apenas por conhecer o `id`

#### Assistant

Pode:

- executar acoes administrativas permitidas
- acessar pacientes/documentos mediante escopo delegado e politica explicita

Nao pode:

- assinar
- visualizar artefatos/documentos fora do escopo delegavel

#### Admin

Pode:

- administrar operacao
- nao deve ganhar acesso clinico irrestrito por default

Observacao:

- `admin` operacional e `compliance` devem ser papeis distintos de acesso clinico

#### Compliance

Pode:

- acessar trilhas e casos sob politica de auditoria

Nao deve:

- herdar acesso universal a dados clinicos sem justificativa e trilha

## Mudancas de arquitetura recomendadas

### 1. Criar camada de `ResourceAccessPolicy`

Adicionar modulo dedicado de policy para concentrar decisoes de acesso.

Estrutura sugerida:

- `access/`
- `resource-access.service.ts`
- `resource-access.types.ts`
- `resource-scope.factory.ts`

Responsabilidades:

- resolver contexto do principal
- carregar recurso minimo necessario
- decidir `allow/deny`
- devolver motivo de negacao para auditoria

### 2. Criar guards/interceptors por recurso

Implementar guards especificos para recursos sensiveis:

- `DocumentAccessGuard`
- `PatientAccessGuard`
- `DeliveryAccessGuard`

Esses guards devem:

- extrair `principal`
- resolver `resourceId`
- consultar `ResourceAccessService`
- registrar tentativa negada quando aplicavel

### 3. Mover policy para antes do service

Controllers nao devem chamar service sensivel por `id` sem policy.

Padrao alvo:

1. controller recebe `id`
2. guard/policy valida acesso
3. service executa somente logica de negocio

### 4. Tornar queries ownership-aware

Mesmo com guard, as queries sensiveis devem ser endurecidas.

Exemplo:

- trocar `findUnique({ where: { id } })`
- por busca contextual, quando aplicavel

Objetivo:

- reduzir bypass futuro
- criar defesa em profundidade

### 5. Blindar links compartilhados

Substituir link simples por token compartilhado:

- token aleatorio ou JWT assinado
- `documentId` nao exposto como chave unica de acesso
- TTL curto
- opcao de revogacao
- opcao de uso unico para documentos sensiveis

### 6. Evoluir modelo de ownership

Curto prazo:

- explicitar vinculo do paciente ao profissional responsavel primario

Medio prazo:

- introduzir `Organization`, `Membership`, `PatientAccessGrant`

## Backlog recomendado por fase

## Fase A: Contencao imediata

Objetivo:

- fechar os acessos mais perigosos sem refazer o dominio inteiro

Implementacoes:

- criar `ResourceAccessService`
- proteger `GET /documents/:id`
- proteger `GET /documents/:id/pdf`
- proteger `POST /documents/:id/duplicate`
- proteger rotas de delivery por documento
- proteger `GET /patients/:id`
- proteger `GET /patients`

Regras iniciais:

- `professional` so acessa documento se `authorProfessionalId == principal.professionalId`
- `professional` so acessa eventos de delivery do mesmo documento autorizado
- `professional` so acessa paciente se possuir documento associado ao paciente ou se for owner primario
- `admin/compliance` entram por excecao controlada e auditada

Critério de aceite:

- nao existe rota sensivel lida por `id` sem policy check

## Fase B: Ownership explicito de paciente

Objetivo:

- sair de um modelo global de pacientes para um modelo com escopo minimo de posse

Implementacoes:

- adicionar em `Patient`:
  - `primaryProfessionalId String?`
- criar relacionamento com `ProfessionalProfile`
- backfill:
  - associar `primaryProfessionalId` ao primeiro profissional autor de documento do paciente, quando possivel
- ajustar listagem de pacientes por escopo

Critério de aceite:

- listagem de pacientes para profissional comum nao retorna universo global

## Fase C: Grants e compartilhamento controlado

Objetivo:

- suportar assistentes e colaboracao real sem abrir acesso amplo

Implementacoes:

- criar tabela `PatientAccessGrant`
- criar tabela opcional `DocumentAccessGrant`
- permitir grants por:
  - profissional
  - assistente
  - papel institucional
- gravar:
  - concedente
  - beneficiario
  - escopo
  - expiracao
  - justificativa

Critério de aceite:

- assistente acessa somente recursos explicitamente delegados

## Fase D: Links seguros e anti-IDOR externo

Objetivo:

- proteger acesso fora da sessao autenticada

Implementacoes:

- criar tabela `DocumentShareToken`
- campos sugeridos:
  - `id`
  - `documentId`
  - `tokenHash`
  - `purpose`
  - `expiresAt`
  - `revokedAt`
  - `maxUses`
  - `usedCount`
  - `createdByUserId`
- gerar URL com token opaco
- validar token antes de servir PDF/documento
- permitir revogacao manual

Critério de aceite:

- nenhum documento compartilhado externamente depende apenas de `documentId`

## Fase E: Step-up auth e trilha forte

Objetivo:

- proteger operacoes sensiveis de alto impacto

Implementacoes:

- exigir step-up auth para:
  - assinatura
  - compartilhamento externo
  - alteracoes criticas de perfil
- enriquecer auditoria com:
  - IP
  - user-agent
  - motivo de negacao
  - resource scope
  - actor role

Critério de aceite:

- operacoes criticas deixam evidencia suficiente para pericia operacional

## Mudancas recomendadas de API

### Rotas a endurecer imediatamente

- `GET /documents/:id`
- `GET /documents/:id/pdf`
- `POST /documents/:id/duplicate`
- `POST /documents/:id/deliver/email`
- `POST /documents/:id/deliver/share-link`
- `GET /delivery/documents/:id/events`
- `GET /patients`
- `GET /patients/:id`

### Mudancas de contrato recomendadas

#### Pacientes

Hoje:

- `GET /patients` retorna tudo

Alvo:

- `GET /patients` retorna apenas recursos no escopo do principal

#### Documentos

Hoje:

- `GET /documents/:id` usa `id` puro

Alvo:

- `GET /documents/:id` exige policy positiva antes da leitura

#### Share links

Hoje:

- URL baseada em `documentId`

Alvo:

- URL baseada em token opaco e expiravel

## Mudancas recomendadas de dados

### Curto prazo

Adicionar:

- `Patient.primaryProfessionalId`

### Medio prazo

Adicionar:

- `Organization`
- `OrganizationMembership`
- `PatientAccessGrant`
- `DocumentShareToken`

### Longo prazo

Avaliar:

- `Encounter`
- `CareTeamMembership`
- `AccessReason`

## Estrategia de rollout

### Etapa 1

- implementar policy service
- aplicar em leitura de documentos e delivery
- auditar negacoes

### Etapa 2

- restringir pacientes por ownership inicial
- ajustar frontend para estados vazios e mensagens de acesso negado

### Etapa 3

- trocar share links
- migrar links legados com periodo de convivencia curto

### Etapa 4

- introduzir grants e perfis assistenciais

## Testes obrigatorios

### Testes automatizados

- usuario autenticado acessa proprio documento
- usuario autenticado falha ao acessar documento alheio
- usuario autenticado falha ao listar eventos de delivery alheios
- profissional sem ownership falha ao ler paciente fora do escopo
- admin/compliance seguem politica esperada
- share token expirado falha
- share token revogado falha

### Testes de seguranca

- enumeracao de IDs
- tentativa de acesso cruzado entre profissionais
- tentativa de replay de link compartilhado
- tentativa de trocar `:id` em rotas relacionadas

## Riscos de implementacao

### 1. Quebra de comportamento em ambiente atual

Mitigacao:

- rollout por modulo
- feature flags para enforcement, se necessario

### 2. Falso positivo de negacao para fluxos administrativos

Mitigacao:

- mapear papeis reais antes de endurecer `assistant`, `admin` e `compliance`

### 3. Aumento de complexidade prematuro

Mitigacao:

- atacar primeiro ownership de documentos e pacientes
- deixar grants institucionais para a fase seguinte

## Definicao de pronto

Este item vermelho sera considerado resolvido quando:

- toda rota sensivel tiver policy check por recurso
- documentos e eventos de entrega nao puderem ser lidos por `id` puro
- pacientes deixarem de ser globais para profissionais comuns
- share links usarem token opaco com expiracao
- negacoes de acesso forem auditadas

## Proximo passo recomendado

Transformar a `Fase A: Contencao imediata` em backlog de implementacao no codigo, começando por:

1. `ResourceAccessService`
2. `DocumentAccessGuard`
3. endurecimento de `documents.controller.ts`
4. endurecimento de `delivery.controller.ts`
5. endurecimento de `patients.controller.ts`
