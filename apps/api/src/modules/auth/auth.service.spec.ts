import test from "node:test";
import assert from "node:assert/strict";

import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ProfessionalStatus, UserRole } from "@prisma/client";

import { hashPassword } from "./auth.crypto";
import { AuthService } from "./auth.service";
import { signToken } from "./auth.tokens";

test("step-up emite token com janela elevada", async () => {
  const secret = process.env.AUTH_TOKEN_SECRET || "receituario-dev-secret";
  const passwordHash = hashPassword("Senha@123");

  const service = createService({
    user: {
      findUnique: async ({ where }) => {
        if (where?.id === "user-1") {
          return {
            id: "user-1",
            email: "teste@receituario.app",
            fullName: "Teste",
            role: UserRole.PROFESSIONAL,
            passwordHash,
            professionalProfile: {
              id: "prof-1"
            }
          };
        }

        return null;
      }
    }
  });

  const accessToken = signToken(
    {
      sub: "user-1",
      email: "teste@receituario.app",
      roles: ["professional"],
      professionalId: "prof-1",
      type: "access",
      exp: Date.now() + 60_000
    },
    secret
  );

  const result = await service.stepUp(`Bearer ${accessToken}`, {
    password: "Senha@123"
  });

  assert.ok(result.accessToken);
  assert.ok(result.refreshToken);
});

test("updateProfessionalProfile exige step-up recente", async () => {
  const secret = process.env.AUTH_TOKEN_SECRET || "receituario-dev-secret";
  const service = createService();

  const accessToken = signToken(
    {
      sub: "user-1",
      email: "teste@receituario.app",
      roles: ["professional"],
      professionalId: "prof-1",
      type: "access",
      exp: Date.now() + 60_000
    },
    secret
  );

  await assert.rejects(
    service.updateProfessionalProfile(`Bearer ${accessToken}`, {
      documentNumber: "123456"
    }),
    ForbiddenException
  );
});

test("step-up falha com senha incorreta", async () => {
  const secret = process.env.AUTH_TOKEN_SECRET || "receituario-dev-secret";
  const passwordHash = hashPassword("Senha@123");

  const service = createService({
    user: {
      findUnique: async ({ where }) => {
        if (where?.id === "user-1") {
          return {
            id: "user-1",
            email: "teste@receituario.app",
            fullName: "Teste",
            role: UserRole.PROFESSIONAL,
            passwordHash,
            professionalProfile: {
              id: "prof-1"
            }
          };
        }

        return null;
      }
    }
  });

  const accessToken = signToken(
    {
      sub: "user-1",
      email: "teste@receituario.app",
      roles: ["professional"],
      professionalId: "prof-1",
      type: "access",
      exp: Date.now() + 60_000
    },
    secret
  );

  await assert.rejects(
    service.stepUp(`Bearer ${accessToken}`, {
      password: "SenhaErrada"
    }),
    UnauthorizedException
  );
});

function createService(
  prismaOverrides?: Partial<{
    user: {
      findUnique?: (...args: any[]) => Promise<any>;
    };
    professionalProfile: {
      update?: (...args: any[]) => Promise<any>;
    };
  }>
) {
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "user-1",
        email: "teste@receituario.app",
        fullName: "Teste",
        role: UserRole.PROFESSIONAL,
        passwordHash: hashPassword("Senha@123"),
        professionalProfile: {
          id: "prof-1",
          documentNumber: "123456",
          councilType: "CRM",
          councilState: "SP",
          status: ProfessionalStatus.PENDING_VALIDATION
        }
      }),
      ...prismaOverrides?.user
    },
    professionalProfile: {
      update: async () => ({
        id: "prof-1"
      }),
      ...prismaOverrides?.professionalProfile
    }
  };

  return new AuthService(prisma as never);
}
