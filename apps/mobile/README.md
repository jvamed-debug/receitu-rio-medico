# Mobile

App Flutter do Receituario Medico Digital.

## Rotas base

- `login`
- `onboarding`
- `dashboard`
- `signature-panel`
- `documents`
- `documents/prescription`
- `documents/exam-request`
- `documents/certificate`
- `documents/free-document`
- `templates`
- `patients`
- `patients/detail`
- `history`
- `pdf-preview`
- `delivery`

## Estrutura inicial

- `lib/app`: bootstrap e tabela de rotas
- `lib/features/auth`: login real, onboarding, painel de assinatura e sessao
- `lib/features/documents`: emissao, templates, PDF e entrega
- `lib/features/patients`: lista e detalhe do paciente
- `lib/features/history`: historico geral
- `lib/shared/widgets`: shell, cards reutilizaveis e escopo de sessao
- `lib/shared/services`: cliente HTTP simples para a API e storage seguro da sessao

## Observacao

- A sessao agora esta preparada para persistencia via `flutter_secure_storage`
- O Flutter SDK continua necessario para rodar `flutter pub get`, `flutter test` e `flutter run`
- Este ambiente ainda nao permite validar compilacao Flutter de ponta a ponta
