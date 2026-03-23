import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../persistence/prisma.service";
import { RequestContextService } from "../observability/request-context.service";

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService
  ) {}

  async log(input: {
    actorUserId?: string;
    actorProfessionalId?: string;
    entityType: string;
    entityId: string;
    action: string;
    correlationId?: string;
    origin: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorProfessionalId: input.actorProfessionalId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        correlationId:
          input.correlationId ??
          this.requestContextService.getCorrelationId() ??
          `corr-${Date.now()}`,
        origin: input.origin,
        metadata: input.metadata ?? {}
      }
    });
  }

  async listRecent(limit = 50) {
    const items = await this.prisma.auditLog.findMany({
      orderBy: { occurredAt: "desc" },
      take: limit
    });

    return items.map((item) => ({
      id: item.id,
      actorUserId: item.actorUserId,
      actorProfessionalId: item.actorProfessionalId,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      correlationId: item.correlationId,
      origin: item.origin,
      metadata: item.metadata,
      occurredAt: item.occurredAt.toISOString()
    }));
  }

  async listByEntity(entityType: string, entityId: string) {
    const items = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { occurredAt: "desc" }
    });

    return items.map((item) => ({
      id: item.id,
      actorUserId: item.actorUserId,
      actorProfessionalId: item.actorProfessionalId,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      correlationId: item.correlationId,
      origin: item.origin,
      metadata: item.metadata,
      occurredAt: item.occurredAt.toISOString()
    }));
  }
}
