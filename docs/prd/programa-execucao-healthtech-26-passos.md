# Programa de Execucao da Healthtech: 26 Passos

## Objetivo

Consolidar a transformacao do `receitu-rio-medico` em uma healthtech regulada, segura e escalavel, conectando:

- produto clinico
- seguranca
- compliance
- operacao
- ecossistema
- escala

Este documento funciona como checklist executiva do programa, marcando:

- o que ja foi entregue no codigo
- o que esta em progresso real
- o que vem na fila imediata

## Status geral

### Concluidos

- 1. congelar escopo do core
- 2. revisar a arquitetura atual
- 3. criar trilhas formais
- 4. endurecer autenticacao e autorizacao inicial
- 5. blindar leitura por recurso e conter IDOR interno
- 19. agenda clinica inicial

### Em progresso forte

- 6. blindar documentos e links compartilhados
- 7. fechar matriz regulatoria por tipo documental
- 8. fortalecer LGPD operacional
- 9. evoluir o modelo de dados
- 10. tipar melhor os documentos
- 11. criar engine de templates seria
- 12. melhorar prontuario
- 13. integrar provedor real ICP-Brasil
- 14. criar trilha probatoria
- 15. separar autenticacao e assinatura
- 16. refinar UX clinica
- 17. criar biblioteca clinica forte
- 18. incluir CDS basico
- 20. financeiro
- 21. comunicacao
- 22. integracao farmaceutica
- 23. analytics
- 24. multitenancy
- 25. observabilidade
- 26. filas, eventos e operacao segura

### Proximos da fila

- 13. provider real de assinatura e homologacao ponta a ponta
- 18. CDS com interacoes graves e regras mais finas por especialidade
- 22. provider farmaceutico real, rede parceira e conciliacao de pedidos

## Checklist dos 26 passos

## Trilha 1: Fundacao e seguranca

### 1. Congelar escopo do core

Status: concluido

Core atual estabilizado:

- auth
- professionals
- patients
- documents
- templates
- signature
- delivery
- audit
- compliance
- appointments

### 2. Revisar a arquitetura atual

Status: concluido

Artefatos:

- [mapa-verde-amarelo-vermelho.md](/c:/Users/jvame/.antigravity/receitu-rio-medico/docs/prd/mapa-verde-amarelo-vermelho.md)

### 3. Criar trilhas formais

Status: concluido

Trilhas em uso:

- seguranca e compliance
- core clinico
- operacao da clinica
- integracoes e escala

### 4. Endurecer autenticacao e autorizacao

Status: concluido

Ja entregue:

- principal tipado
- `ResourceAccessService`
- policy por recurso em `documents`, `patients`, `history` e `delivery`
- ownership minimo por paciente
- auditoria de acesso negado

### 5. Blindar documentos e leituras por `id`

Status: concluido

Ja entregue:

- leitura de documento exige policy
- preview PDF exige policy
- duplicate exige policy
- delivery events exige policy
- share links com token opaco

### 6. Blindar links compartilhados

Status: em progresso avancado

Ja entregue:

- token opaco
- hash persistido
- expiracao
- limite de uso
- revogacao
- endpoint publico controlado para resolucao do link

Falta para fechar:

- trilha de IP/user-agent na resolucao do token
- politica diferenciada por risco do documento
- renderizacao publica ainda mais restrita do artefato final

### 7. Fechar matriz regulatoria

Status: em progresso avancado

Ja entregue:

- politica por tipo documental em `compliance`
- bloqueios de assinatura por provider inadequado
- readiness profissional para assinatura
- politica de compartilhamento externo por tipo documental

Falta para fechar:

- justificativa formal de override
- regras mais finas por papel e tenant
- matriz mais rica para documentos de maior risco

### 8. Fortalecer LGPD

Status: em progresso avancado

Ja entregue:

- segregacao inicial de acesso
- auditoria de acesso e acao
- reducao de exposicao por recurso e link
- snapshot de retencao e descarte
- analytics anonimizados por periodo
- parametrizacao de retention por categoria documental

Falta para fechar:

- logs com base legal e finalidade onde fizer sentido
- governanca mais forte para consentimento
- descarte automatizado com workflow de aprovacao

## Trilha 2: Dominio clinico

### 9. Evoluir o modelo de dados

Status: em progresso

Ja entregue:

- `PatientClinicalProfile`
- alergias
- condicoes
- medicacoes cronicas
- plano de cuidado
- resumo clinico
- agenda, cobranca, lembretes e teleconsulta

Falta para fechar:

- encounters
- timeline clinica mais formal
- problemas e eventos com estrutura longitudinal

### 10. Tipar melhor os documentos

Status: em progresso

Ja entregue:

- `schemaVersion` no contrato de dominio
- `context` clinico opcional por documento
- `cdsSummary` no contrato documental
- schemas de criacao com `context`
- payload versionado com metadados reservados

Falta para fechar:

- contratos ainda mais especificos por tipo
- evolucao de versionamento por layout/payload
- menor dependencia de chaves genericas internas

### 11. Criar engine de templates seria

Status: em progresso avancado

Ja entregue:

- favoritos por usuario
- templates institucionais e pessoais
- versionamento inicial
- importacao institucional
- presets por especialidade

Falta para fechar:

- governanca por clinica
- aprovacao/publicacao institucional
- lifecycle mais forte para templates oficiais

### 12. Melhorar prontuario

Status: em progresso

Ja entregue:

- perfil clinico estruturado
- historico por paciente
- vinculo entre paciente, documentos e agenda

Falta para fechar:

- timeline real do atendimento
- evolucao clinica
- encounters e consolidacao longitudinal

## Trilha 3: Assinatura e validade juridica

### 13. Integrar provedor real ICP-Brasil

Status: em progresso

Ja entregue:

- gateway de provider configuravel
- modos `mock` e `remote`
- referencia e evidencia persistidas
- `callbackUrl` e `callbackSecret` no fluxo remoto
- endpoint publico de callback para provider
- sincronizacao manual de sessao remota por status
- endpoint protegido para reconciliar sessao pendente

Falta para fechar:

- provider real
- credenciais e contratos de homologacao
- homologacao ponta a ponta com retorno assinado do provider

### 14. Criar trilha probatoria

Status: em progresso

Ja entregue:

- `signatureLevel`
- `policyVersion`
- `providerReference`
- `signedAt`
- `evidence`
- snapshot regulatorio persistido

Falta para fechar:

- carimbo temporal forte
- cadeia probatoria mais completa
- consolidacao juridica do artefato final

### 15. Separar autenticacao e assinatura

Status: em progresso avancado

Ja entregue:

- step-up auth
- janela elevada
- enforcement em acoes sensiveis

Falta para fechar:

- binding ainda mais forte entre janela e ato de assinatura real
- regras de expiracao mais finas por provider

## Trilha 4: Produto clinico de uso diario

### 16. Refinar UX clinica

Status: em progresso avancado

Ja entregue:

- dashboard
- onboarding
- assinatura
- templates
- presets
- agenda operacional

Falta para fechar:

- fluxo ainda mais curto por contexto assistencial
- atalhos por especialidade e perfil

### 17. Criar biblioteca clinica forte

Status: em progresso avancado

Ja entregue:

- grupos laboratoriais
- paineis rapidos
- modelos padronizados
- modelos por especialidade
- biblioteca juridico-clinica

Falta para fechar:

- curadoria institucional
- validacao clinica mais forte

### 18. Incluir CDS basico

Status: em progresso avancado

Ja entregue:

- CDS basico para prescricoes
- alerta de alergia por correspondencia simples
- alerta de duplicidade com medicacao cronica
- alerta por condicao clinica em contexto gestacional, renal e hepatica
- suporte a override justificado no contrato documental
- severidade resumida no documento
- abertura automatica de revisao institucional para override critico
- listagem e resolucao de revisoes de override

Falta para fechar:

- interacoes graves
- graduacao mais fina de override
- workflow institucional com regras por tenant e papel

## Trilha 5: Operacao da clinica

### 19. Agenda

Status: concluido no baseline e em evolucao continua

Ja entregue:

- agenda clinica inicial
- status da consulta
- teleconsulta
- lembretes
- filtros operacionais

### 20. Financeiro

Status: em progresso

Ja entregue:

- cobranca por consulta
- authorize/pay
- checkout
- conciliacao manual
- webhook de cobranca
- resumo financeiro da agenda

Falta para fechar:

- conciliacao automatica mais rica
- painel financeiro expandido
- provider real

### 21. Comunicacao

Status: em progresso

Ja entregue:

- lembretes por email/sms/whatsapp
- provider gateway configuravel
- retry de lembretes falhos
- visibilidade operacional de falhas

Falta para fechar:

- provider real
- politicas de cadencia
- templates transacionais centralizados

## Trilha 6: Ecossistema e monetizacao

### 22. Integracao farmaceutica

Status: em progresso avancado

Ja entregue:

- gateway de farmacia configuravel
- cotacao mock por prescricao
- endpoint de quote no backend
- contrato compartilhado de cotacao
- camada anti-corruption para quote remoto
- normalizacao de provider, disponibilidade, warnings e links de continuidade
- criacao de pedido farmaceutico a partir da prescricao
- persistencia e leitura de pedido farmaceutico
- sincronizacao de status do pedido

Falta para fechar:

- provider real
- roteamento para rede/farmacia
- disponibilidade e status de pedido
- pedidos e conciliacao de status por parceiro

### 23. Analytics

Status: em progresso avancado

Ja entregue:

- metricas da API
- resumo financeiro da agenda
- snapshot operacional
- analytics por periodo
- visao por profissional
- serie diaria de consultas e receita

Falta para fechar:

- funil operacional e clinico
- visao por profissional e tenant
- cohort e tendencia longitudinal

### 24. Multitenancy

Status: em progresso

Ja entregue:

- `Organization`
- `OrganizationMembership`
- `primaryOrganizationId`
- `organizationId` em pacientes, documentos e appointments
- scoping por organizacao na agenda e no core

Falta para fechar:

- governanca completa por tenant
- politicas institucionais mais fortes
- administracao de memberships pela UI

## Trilha 7: Escala e governanca

### 25. Observabilidade

Status: em progresso avancado

Ja entregue:

- `requestId`
- `correlationId`
- metricas in-memory
- contexto operacional
- auditoria herdando correlacao
- dashboard com alertas operacionais
- severidade consolidada de anomalias externas

Falta para fechar:

- alertas reais
- tracing distribuido
- exportacao para stack externa de observabilidade

### 26. Filas, eventos e operacao segura

Status: em progresso avancado

Ja entregue:

- inbox de webhook de cobranca
- idempotencia por `eventKey`
- retries de lembrete
- visibilidade operacional de falhas
- job runner leve para retries pendentes
- reprocessamento de webhooks pendentes/falhos

Falta para fechar:

- workers
- retries automaticos centralizados
- circuit breaker
- playbooks de incidente

## Proximos passos recomendados

### Bloco imediato

1. passo 13: provider real de assinatura e homologacao ponta a ponta
2. passo 18: CDS com interacoes graves e regras mais finas por especialidade
3. passo 22: provider farmaceutico real, rede parceira e conciliacao de pedidos

### Bloco seguinte

4. aprofundar passo 20 com provider real de pagamentos
5. aprofundar passo 21 com provider real de mensageria
6. aprofundar passo 24 com governanca institucional na UI

### Bloco posterior

7. aprofundar passo 22 com disponibilidade, compra e pos-compra
8. aprofundar LGPD operacional
9. aprofundar governanca institucional

## Regra de execucao

Nao abrir novas frentes pesadas de ecossistema antes de concluir:

- contratos mais fortes por tipo documental
- provider real de assinatura
- CDS basico
- operacao segura mais madura
