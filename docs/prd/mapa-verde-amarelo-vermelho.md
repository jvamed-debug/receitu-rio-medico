# Mapa Verde / Amarelo / Vermelho do Receitu-rio-Medico

## Objetivo

Classificar a codebase atual em:

- `Verde`: manter e evoluir
- `Amarelo`: refatorar antes de escalar
- `Vermelho`: reescrever pontualmente ou endurecer com prioridade alta

O objetivo nao e recomeçar do zero. E identificar com precisao o que ja serve como fundacao e o que precisa ser corrigido para transformar o projeto em uma healthtech regulada, segura e escalavel.

## Criterios usados

### Verde

Componentes que:

- ja refletem uma boa direcao arquitetural
- tem baixo risco estrutural
- podem crescer com refatoracoes incrementais

### Amarelo

Componentes que:

- funcionam para MVP
- mas ainda estao simplificados demais para escala/regulacao
- exigem endurecimento antes de receber mais funcionalidades

### Vermelho

Componentes que:

- hoje representam risco tecnico, regulatorio ou operacional relevante
- ou estao corretos apenas como simulacao
- ou exigem reescrita localizada para suportar produto real

## Mapa Consolidado

## Verde

### 1. Estrutura do monorepo

Arquivos de referencia:

- [package.json](/c:/Users/jvame/.antigravity/receitu-rio-medico/package.json)
- [README.md](/c:/Users/jvame/.antigravity/receitu-rio-medico/README.md)

Motivo:

- separacao correta entre `apps/api`, `apps/web`, `apps/mobile` e `packages/*`
- boa base para evolucao de produto multiplataforma
- facilita compartilhamento de contratos, dominio e componentes

Decisao:

- manter
- apenas endurecer pipelines, padroes e governanca

### 2. Modularizacao do backend

Arquivo de referencia:

- [app.module.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/app.module.ts)

Motivo:

- backend ja dividido em modulos clinicos e operacionais relevantes
- boa base para separar dominios como `auth`, `documents`, `patients`, `signature`, `audit`, `delivery`, `templates`

Decisao:

- manter a modularizacao atual
- evoluir para limites de dominio mais fortes sem trocar o framework

### 3. Escolha de stack

Arquivos de referencia:

- [package.json](/c:/Users/jvame/.antigravity/receitu-rio-medico/package.json)
- [app.dart](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/mobile/lib/app/app.dart)

Motivo:

- `NestJS + Next.js + Flutter + PostgreSQL + Prisma` e uma stack valida para uma healthtech em fase de crescimento
- boa produtividade para MVP e fase de consolidacao

Decisao:

- manter stack
- nao abrir projeto novo por motivo tecnologico

### 4. Modelo inicial de dominio

Arquivo de referencia:

- [schema.prisma](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/prisma/schema.prisma)

Motivo:

- ja existe um nucleo com `User`, `ProfessionalProfile`, `Patient`, `ClinicalDocument`, `Template`, `SignatureSession`, `PdfArtifact`, `DeliveryEvent`, `AuditLog`
- suficiente como base de MVP regulado

Decisao:

- manter como ponto de partida
- amadurecer gradualmente

### 5. Web e mobile como canais ja validados

Arquivos de referencia:

- [dashboard/page.tsx](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/web/src/app/(authenticated)/dashboard/page.tsx)
- [app_shell.dart](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/mobile/lib/shared/widgets/app_shell.dart)

Motivo:

- o produto ja tem dois canais reais
- isso acelera iteracao de UX, onboarding e operacao

Decisao:

- manter
- evoluir a experiencia, nao reescrever o canal

## Amarelo

### 6. Auth e sessao

Arquivos de referencia:

- [auth.module.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/auth/auth.module.ts)
- [auth.guard.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/auth/auth.guard.ts)

Motivo:

- autenticacao atual funciona para MVP
- mas autorizacao ainda e muito simples para um produto clinico com risco regulatorio
- falta granularidade por recurso, step-up auth e controle de sessao mais forte

Riscos:

- acesso indevido a documentos ou pacientes
- dificuldade de escalar para clinicas, assistentes e compliance

Decisao:

- refatorar cedo
- nao reescrever tudo
- priorizar autorizacao contextual

### 7. Servico de documentos

Arquivo de referencia:

- [documents.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/documents/documents.service.ts)

Motivo:

- o fluxo atual de criacao e bom para MVP
- mas ainda depende demais de payload generico e regras minimas
- o dominio documental ainda esta raso para regulacao e escalabilidade

Riscos:

- dificuldade de evoluir regras por documento
- fragilidade em versoes futuras
- acoplamento entre payload e renderizacao

Decisao:

- refatorar para contratos mais fortes por tipo documental

### 8. Compliance

Arquivo de referencia:

- [compliance.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/compliance/compliance.service.ts)

Motivo:

- a direcao esta correta
- mas ainda e uma camada minima de validacao
- nao substitui uma matriz regulatoria real por tipo de documento e contexto assistencial

Riscos:

- regra regulatoria insuficiente
- falsa sensacao de conformidade

Decisao:

- refatorar para policy engine mais explicita

### 9. Pacientes e historico

Arquivos de referencia:

- [patients.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/patients/patients.service.ts)
- [history.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/history/history.service.ts)

Motivo:

- hoje o cadastro e a timeline existem
- mas ainda estao muito proximos de um CRUD basico
- falta prontuario clinico mais rico

Riscos:

- produto estacionar como emissor documental
- pouca diferenciacao frente a concorrentes

Decisao:

- refatorar o dominio de paciente para prontuario leve e timeline clinica real

### 10. Delivery

Arquivo de referencia:

- [delivery.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/delivery/delivery.service.ts)

Motivo:

- a camada existe e isso e bom
- mas ainda esta em modo MVP/simulacao
- links e canais ainda nao estao com seguranca e robustez de produto real

Riscos:

- vazamento de documento por compartilhamento inseguro
- rastreabilidade insuficiente

Decisao:

- endurecer e integrar com canais reais depois do core

### 11. Auditoria

Arquivo de referencia:

- [audit.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/audit/audit.service.ts)

Motivo:

- trilha de auditoria ja existe
- mas ainda e transacional e simples
- nao e ainda um mecanismo forte de evidencias e correlacao enterprise

Riscos:

- baixa capacidade de investigacao de incidentes
- trilha insuficiente para disputas ou auditorias mais duras

Decisao:

- refatorar sem remover a base existente

## Vermelho

### 12. Assinatura real e validade juridica

Arquivo de referencia:

- [signature.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/signature/signature.service.ts)

Motivo:

- o desenho do fluxo e util
- mas a implementacao atual ainda e essencialmente simulada para produto real
- nao ha integracao juridicamente robusta com provider ICP-Brasil ponta a ponta

Riscos:

- invalidez juridica do documento em cenario real
- trilha de assinatura insuficiente
- falsa prontidao regulatoria

Decisao:

- reescrita localizada
- manter o contrato e o fluxo conceitual, trocar a implementacao

### 13. Autorizacao por recurso

Arquivos de referencia:

- [auth.guard.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/auth/auth.guard.ts)
- [documents.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/documents/documents.service.ts)

Motivo:

- o sistema ainda nao esta blindado como deveria contra acesso indevido por contexto
- isso e uma fragilidade critica para uma healthtech

Riscos:

- risco de exposicao de dados sensiveis
- risco tipo IDOR/logical access flaw

Decisao:

- atacar com prioridade maxima

### 14. Prontuario clinico completo

Arquivos de referencia:

- [schema.prisma](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/prisma/schema.prisma)
- [patients.service.ts](/c:/Users/jvame/.antigravity/receitu-rio-medico/apps/api/src/modules/patients/patients.service.ts)

Motivo:

- o projeto ainda nao possui prontuario clinico real no nivel que a proposta de valor pede
- isso nao e bug, mas e uma lacuna estrutural

Riscos:

- app virar apenas emissor melhorado
- perda de vantagem competitiva frente ao objetivo de plataforma hibrida

Decisao:

- construir como nova camada de dominio, nao como remendo

### 15. CDS real

Motivo:

- o produto-alvo fala em suporte a decisao clinica
- a base atual ainda nao tem um motor de CDS real, apenas preparacao indireta

Riscos:

- prometer mais do que o produto entrega
- risco clinico se a base medicamentosa/alertas forem simplificados demais

Decisao:

- tratar como trilha nova e especializada

## Recomendacao pratica

## O que manter sem medo

- monorepo
- stack
- apps web/mobile/api
- modularizacao do backend
- nucleo inicial do schema
- trilha de auditoria como ponto de partida
- pipeline de deploy atual enquanto o time e pequeno

## O que refatorar antes de crescer muito

- auth e autorizacao
- documentos e contracts
- compliance
- pacientes e historico
- templates como governanca institucional
- delivery
- observabilidade

## O que precisa de reescrita localizada

- assinatura juridicamente valida
- autorizacao fina por recurso
- camada de prontuario clinico real
- CDS real

## Ordem recomendada

1. `Vermelho` seguranca e assinatura
2. `Amarelo` dominio clinico e compliance
3. `Amarelo` prontuario, historico, templates institucionais
4. `Vermelho` CDS e integracoes sensiveis
5. agenda, financeiro, mensageria e ecossistema

## Conclusao

O sistema atual nao deve ser descartado.

Ele deve ser tratado como:

- base valida de MVP
- fundacao parcial de produto
- ponto de partida para hardening e especializacao

A decisao correta e:

- `nao recomecar do zero`
- `continuar nesta codebase`
- `refatorar por trilhas e prioridades`
