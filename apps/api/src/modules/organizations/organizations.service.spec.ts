import assert from "node:assert/strict";
import test from "node:test";

import { ForbiddenException } from "@nestjs/common";

import { OrganizationsService } from "./organizations.service";

test("lista memberships da organizacao atual", async () => {
  const service = new OrganizationsService(
    {
      organizationMembership: {
        findFirst: async () => ({ id: "membership-admin", membershipRole: "owner" }),
        findMany: async () => [
          {
            id: "membership-1",
            organizationId: "org-1",
            membershipRole: "owner",
            isDefault: true,
            createdAt: new Date("2026-03-23T09:00:00.000Z"),
            organization: {
              id: "org-1",
              name: "Clinica Azul",
              slug: "clinica-azul"
            },
            professional: {
              id: "prof-1",
              user: {
                fullName: "Dra. Ana",
                email: "ana@clinica.com"
              }
            }
          }
        ]
      }
    } as never
  );

  const result = await service.listCurrentMemberships({
    userId: "user-1",
    professionalId: "prof-admin",
    organizationId: "org-1",
    roles: ["professional"]
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.organizationName, "Clinica Azul");
  assert.equal(result[0]?.membershipRole, "owner");
});

test("bloqueia gestao de membership sem papel institucional", async () => {
  const service = new OrganizationsService(
    {
      organizationMembership: {
        findFirst: async () => ({ id: "membership-user", membershipRole: "member" })
      }
    } as never
  );

  await assert.rejects(
    service.addMembershipByEmail(
      {
        userId: "user-1",
        professionalId: "prof-1",
        organizationId: "org-1",
        roles: ["professional"]
      },
      {
        email: "novo@clinica.com"
      }
    ),
    ForbiddenException
  );
});

test("atualiza politicas da organizacao atual", async () => {
  const service = new OrganizationsService(
    {
      organizationMembership: {
        findFirst: async () => ({ id: "membership-admin", membershipRole: "owner" })
      },
      organization: {
        findUnique: async () => ({
          id: "org-1",
          name: "Clinica Azul",
          slug: "clinica-azul",
          settings: {
            documentSharePolicy: {
              maxUsesDefault: 3,
              expirationHoursDefault: 72,
              allowHighRiskExternalShare: false
            }
          },
          memberships: [],
          primaryProfiles: []
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "org-1",
          name: "Clinica Azul",
          slug: "clinica-azul",
          settings: data.settings,
          memberships: [],
          primaryProfiles: []
        })
      }
    } as never
  );

  const result = await service.updateCurrentSettings(
    {
      userId: "user-1",
      professionalId: "prof-admin",
      organizationId: "org-1",
      roles: ["professional"]
    },
    {
      documentSharePolicy: {
        maxUsesDefault: 1,
        allowHighRiskExternalShare: true
      },
      overridePolicy: {
        minimumReviewerRole: "admin"
      }
    }
  );

  assert.equal(result.settings?.documentSharePolicy.maxUsesDefault, 1);
  assert.equal(result.settings?.documentSharePolicy.allowHighRiskExternalShare, true);
  assert.equal(result.settings?.overridePolicy.minimumReviewerRole, "admin");
});
