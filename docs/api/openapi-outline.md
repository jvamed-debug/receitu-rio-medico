# API Inicial — Outline

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/biometric/enroll`

## Patients

- `GET /patients`
- `POST /patients`
- `GET /patients/:id`

## Documents

- `POST /documents/prescriptions`
- `POST /documents/exam-requests`
- `POST /documents/certificates`
- `POST /documents/free`
- `POST /documents/:id/duplicate`
- `GET /documents/:id`

## Signature

- `POST /signature/sessions`
- `POST /signature/windows`
- `POST /documents/:id/sign`

