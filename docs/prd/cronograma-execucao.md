# Cronograma de Execucao

## Objetivo

Sequenciar a evolucao do MVP de receituario medico digital com foco em compliance, rastreabilidade e paridade entre web e mobile.

## Fases

### Fase A — Auditoria e Delivery Persistidos

Status: concluida em 2026-03-18

- Persistencia de `AuditLog` para criacao, duplicacao, assinatura e entrega
- Persistencia de `DeliveryEvent` para e-mail e link de compartilhamento
- Endpoints de consulta operacional para auditoria e delivery

### Fase B — Compliance Inicial por Tipo Documental

Status: concluida em 2026-03-18

- Modulo `compliance` criado no backend
- Politicas minimas por tipo documental
- Validacao de rascunho antes da criacao
- Bloqueios de assinatura para perfil inativo, metodo ausente e documento fora do estado permitido

### Fase C — Preview/PDF Mais Fiel ao Artefato

Status: concluida em 2026-03-18

- `GET /documents/:id/pdf` passou a refletir layout, hash, artefato e secoes do documento
- Web e mobile passaram a consumir o preview estruturado
- Assinatura continua gerando/garantindo `PdfArtifact`

### Fase D — Templates Reais no Web e Mobile

Status: concluida em 2026-03-18

- Listagem real de templates via API
- Criacao minima de templates no web e no mobile
- Base pronta para futura aplicacao de templates na emissao

### Fase E — Readiness de Deploy e Homologacao

Status: pendente

- Healthchecks finais
- Migrations e seed em ambiente de VPS
- Revisao de variaveis e segredos
- Checklist de homologacao funcional

## Proxima Sequencia Recomendada

1. Rodar `npm run infra:up`
2. Rodar `npm run db:migrate -- --name init`
3. Rodar `npm run db:seed`
4. Subir `api` e `web`
5. Validar jornadas ponta a ponta
6. Fechar readiness de deploy no EasyPanel
