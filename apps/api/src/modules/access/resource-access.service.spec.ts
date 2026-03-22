import test from "node:test";
import assert from "node:assert/strict";

import { NotFoundException } from "@nestjs/common";

import type { AccessPrincipal } from "../auth/auth.types";
import { ResourceAccessService } from "./resource-access.service";

test("permite acesso ao documento do proprio profissional", async () => {
  const service = createService({
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-1",
        patientId: "patient-1",
        authorProfessionalId: "prof-1"
      })
    }
  });

  const principal = createPrincipal({ professionalId: "prof-1" });

  const document = await service.assertDocumentAccess(principal, "doc-1", "document_read");

  assert.equal(document.id, "doc-1");
});

test("nega acesso a documento de outro profissional e audita a negacao", async () => {
  const auditCalls: unknown[] = [];
  const service = createService(
    {
      clinicalDocument: {
        findUnique: async () => ({
          id: "doc-2",
          patientId: "patient-2",
          authorProfessionalId: "prof-2"
        })
      }
    },
    {
      log: async (input: unknown) => {
        auditCalls.push(input);
      }
    }
  );

  const principal = createPrincipal({ professionalId: "prof-1" });

  await assert.rejects(
    service.assertDocumentAccess(principal, "doc-2", "document_read"),
    NotFoundException
  );

  assert.equal(auditCalls.length, 1);
});

test("permite acesso ao paciente pelo owner primario", async () => {
  const service = createService({
    patient: {
      findUnique: async () => ({
        id: "patient-1",
        primaryProfessionalId: "prof-1"
      })
    }
  });

  const principal = createPrincipal({ professionalId: "prof-1" });

  const patient = await service.assertPatientAccess(principal, "patient-1", "patient_read");

  assert.equal(patient.id, "patient-1");
});

test("permite acesso ao paciente quando o profissional ja possui documento associado", async () => {
  const service = createService({
    patient: {
      findUnique: async () => ({
        id: "patient-2",
        primaryProfessionalId: "prof-owner"
      })
    },
    clinicalDocument: {
      findUnique: async () => {
        throw new Error("nao deveria consultar documento por id neste teste");
      },
      findFirst: async () => ({
        id: "doc-allowed"
      })
    }
  });

  const principal = createPrincipal({ professionalId: "prof-1" });

  const patient = await service.assertPatientAccess(principal, "patient-2", "patient_read");

  assert.equal(patient.id, "patient-2");
});

test("nega acesso ao paciente fora do escopo", async () => {
  const auditCalls: unknown[] = [];
  const service = createService(
    {
      patient: {
        findUnique: async () => ({
          id: "patient-3",
          primaryProfessionalId: "prof-owner"
        })
      },
      clinicalDocument: {
        findUnique: async () => {
          throw new Error("nao deveria consultar documento por id neste teste");
        },
        findFirst: async () => null
      }
    },
    {
      log: async (input: unknown) => {
        auditCalls.push(input);
      }
    }
  );

  const principal = createPrincipal({ professionalId: "prof-1" });

  await assert.rejects(
    service.assertPatientAccess(principal, "patient-3", "patient_read"),
    NotFoundException
  );

  assert.equal(auditCalls.length, 1);
});

test("buildPatientScope restringe profissional comum e libera admin", () => {
  const service = createService();

  const professionalScope = service.buildPatientScope(
    createPrincipal({ professionalId: "prof-1" })
  );
  const adminScope = service.buildPatientScope(
    createPrincipal({ roles: ["admin"], professionalId: undefined })
  );

  assert.deepEqual(professionalScope, {
    OR: [
      {
        primaryProfessionalId: "prof-1"
      },
      {
        documents: {
          some: {
            authorProfessionalId: "prof-1"
          }
        }
      }
    ]
  });
  assert.equal(adminScope, undefined);
});

function createService(
  prismaOverrides?: Partial<{
    clinicalDocument: {
      findUnique?: (...args: unknown[]) => Promise<unknown>;
      findFirst?: (...args: unknown[]) => Promise<unknown>;
    };
    patient: {
      findUnique?: (...args: unknown[]) => Promise<unknown>;
    };
  }>,
  auditOverrides?: Partial<{
    log: (input: unknown) => Promise<void>;
  }>
) {
  const prisma = {
    clinicalDocument: {
      findUnique: async () => null,
      findFirst: async () => null,
      ...prismaOverrides?.clinicalDocument
    },
    patient: {
      findUnique: async () => null,
      ...prismaOverrides?.patient
    }
  };

  const audit = {
    log: async () => undefined,
    ...auditOverrides
  };

  return new ResourceAccessService(
    prisma as never,
    audit as never
  );
}

function createPrincipal(
  overrides?: Partial<AccessPrincipal>
): AccessPrincipal {
  return {
    userId: "user-1",
    professionalId: "prof-1",
    roles: ["professional"],
    ...overrides
  };
}
