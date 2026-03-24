import test from "node:test";
import assert from "node:assert/strict";

import { ForbiddenException } from "@nestjs/common";
import {
  DocumentType,
  TemplateLifecycleStatus,
  TemplateScope
} from "@prisma/client";

import { TemplatesService } from "./templates.service";

test("cria template institucional pendente quando autor nao governa a organizacao", async () => {
  const service = new TemplatesService({
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback({
        template: {
          findFirst: async () => null,
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: "tpl-created",
            name: data.name,
            type: data.type,
            version: data.version,
            scope: data.scope,
            lifecycleStatus: data.lifecycleStatus,
            structure: data.structure,
            organizationId: data.organizationId ?? null,
            createdByUserId: data.createdByUserId ?? null,
            reviewedByUserId: null,
            publishedAt: data.publishedAt ?? null,
            archivedAt: null,
            createdAt: new Date("2026-03-24T09:00:00.000Z"),
            updatedAt: new Date("2026-03-24T09:00:00.000Z")
          })
        }
      })
  } as never);

  const created = await service.create(
    {
      userId: "user-1",
      organizationId: "org-1",
      roles: ["professional"]
    },
    {
      name: "Template institucional",
      type: "free-document",
      scope: "institutional",
      structure: {}
    }
  );

  assert.equal(created.scope, "institutional");
  assert.equal(created.lifecycleStatus, "pending_review");
  assert.equal(created.organizationId, "org-1");
});

test("publica template institucional quando usuario tem governanca", async () => {
  const service = new TemplatesService({
    template: {
      findUnique: async () => ({
        id: "tpl-1",
        scope: TemplateScope.INSTITUTIONAL,
        organizationId: "org-1"
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "tpl-1",
        name: "Template",
        type: DocumentType.FREE_DOCUMENT,
        version: 1,
        scope: TemplateScope.INSTITUTIONAL,
        lifecycleStatus: data.lifecycleStatus,
        organizationId: "org-1",
        createdByUserId: "user-2",
        reviewedByUserId: data.reviewedByUserId,
        publishedAt: data.publishedAt,
        archivedAt: data.archivedAt,
        structure: {},
        createdAt: new Date("2026-03-24T10:00:00.000Z"),
        updatedAt: new Date("2026-03-24T10:00:00.000Z")
      })
    }
  } as never);

  const published = await service.publish(
    {
      userId: "user-admin",
      organizationId: "org-1",
      roles: ["admin"]
    },
    "tpl-1"
  );

  assert.equal(published.lifecycleStatus, "published");
  assert.equal(published.reviewedByUserId, "user-admin");
});

test("bloqueia publicacao institucional sem papel administrativo", async () => {
  const service = new TemplatesService({
    template: {
      findUnique: async () => null
    }
  } as never);

  await assert.rejects(
    service.publish(
      {
        userId: "user-1",
        organizationId: "org-1",
        roles: ["professional"]
      },
      "tpl-1"
    ),
    ForbiddenException
  );
});
