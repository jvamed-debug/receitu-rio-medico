import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  DocumentType,
  Prisma,
  TemplateLifecycleStatus,
  TemplateScope
} from "@prisma/client";

import { PrismaService } from "../../persistence/prisma.service";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(input: {
    userId: string;
    organizationId?: string;
    roles: string[];
  }) {
    const canGovernInstitutionalTemplates = hasInstitutionalGovernanceRole(input.roles);

    return this.prisma.template.findMany({
      where: {
        OR: [
          {
            scope: TemplateScope.PERSONAL,
            createdByUserId: input.userId
          },
          ...(input.organizationId
            ? [
                {
                  scope: TemplateScope.INSTITUTIONAL,
                  organizationId: input.organizationId,
                  ...(canGovernInstitutionalTemplates
                    ? {}
                    : {
                        OR: [
                          { lifecycleStatus: TemplateLifecycleStatus.PUBLISHED },
                          { createdByUserId: input.userId }
                        ]
                      })
                }
              ]
            : [])
        ]
      },
      orderBy: [{ type: "asc" }, { version: "desc" }]
    }).then((templates) => templates.map(toTemplateSummary));
  }

  create(
    principal: {
      userId: string;
      organizationId?: string;
      roles: string[];
    },
    input: {
    name: string;
    type: "prescription" | "exam-request" | "medical-certificate" | "free-document";
    scope?: "personal" | "institutional";
    structure?: Record<string, unknown>;
    }
  ) {
    const type = this.mapDocumentType(input.type);
    const scope = input.scope === "institutional" ? TemplateScope.INSTITUTIONAL : TemplateScope.PERSONAL;
    const canGovernInstitutionalTemplates = hasInstitutionalGovernanceRole(principal.roles);

    if (scope === TemplateScope.INSTITUTIONAL && !principal.organizationId) {
      throw new ForbiddenException("Template institucional exige organizacao ativa");
    }

    return this.prisma.$transaction(async (transaction) => {
      const latestTemplate = await transaction.template.findFirst({
        where: {
          name: input.name,
          type,
          scope,
          organizationId:
            scope === TemplateScope.INSTITUTIONAL ? principal.organizationId : null,
          createdByUserId:
            scope === TemplateScope.PERSONAL ? principal.userId : undefined
        },
        orderBy: {
          version: "desc"
        }
      });

      const created = await transaction.template.create({
        data: {
          name: input.name,
          type,
          scope,
          lifecycleStatus:
            scope === TemplateScope.INSTITUTIONAL
              ? canGovernInstitutionalTemplates
                ? TemplateLifecycleStatus.PUBLISHED
                : TemplateLifecycleStatus.PENDING_REVIEW
              : TemplateLifecycleStatus.PUBLISHED,
          organizationId:
            scope === TemplateScope.INSTITUTIONAL ? principal.organizationId ?? null : null,
          createdByUserId: principal.userId,
          publishedAt:
            scope === TemplateScope.INSTITUTIONAL
              ? canGovernInstitutionalTemplates
                ? new Date()
                : null
              : new Date(),
          version: (latestTemplate?.version ?? 0) + 1,
          structure: (input.structure ?? {}) as Prisma.InputJsonObject
        }
      });

      return toTemplateSummary(created);
    });
  }

  async publish(
    principal: {
      userId: string;
      organizationId?: string;
      roles: string[];
    },
    templateId: string
  ) {
    if (!hasInstitutionalGovernanceRole(principal.roles)) {
      throw new ForbiddenException("Publicacao institucional exige papel administrativo");
    }

    const template = await this.prisma.template.findUnique({
      where: { id: templateId }
    });

    if (
      !template ||
      template.scope !== TemplateScope.INSTITUTIONAL ||
      !principal.organizationId ||
      template.organizationId !== principal.organizationId
    ) {
      throw new NotFoundException("Template institucional nao encontrado");
    }

    return this.prisma.template.update({
      where: { id: template.id },
      data: {
        lifecycleStatus: TemplateLifecycleStatus.PUBLISHED,
        reviewedByUserId: principal.userId,
        publishedAt: new Date(),
        archivedAt: null
      }
    }).then(toTemplateSummary);
  }

  async archive(
    principal: {
      userId: string;
      organizationId?: string;
      roles: string[];
    },
    templateId: string
  ) {
    if (!hasInstitutionalGovernanceRole(principal.roles)) {
      throw new ForbiddenException("Arquivamento institucional exige papel administrativo");
    }

    const template = await this.prisma.template.findUnique({
      where: { id: templateId }
    });

    if (
      !template ||
      template.scope !== TemplateScope.INSTITUTIONAL ||
      !principal.organizationId ||
      template.organizationId !== principal.organizationId
    ) {
      throw new NotFoundException("Template institucional nao encontrado");
    }

    return this.prisma.template.update({
      where: { id: template.id },
      data: {
        lifecycleStatus: TemplateLifecycleStatus.ARCHIVED,
        reviewedByUserId: principal.userId,
        archivedAt: new Date()
      }
    }).then(toTemplateSummary);
  }

  listFavorites(userId: string) {
    return this.prisma.userTemplateFavorite.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { presetKey: "asc" }]
    });
  }

  async saveFavorite(userId: string, input: {
    presetKey: string;
    label?: string;
    category?: string;
    templateId?: string;
  }) {
    return this.prisma.userTemplateFavorite.upsert({
      where: {
        userId_presetKey: {
          userId,
          presetKey: input.presetKey
        }
      },
      update: {
        label: input.label ?? null,
        category: input.category ?? null,
        templateId: input.templateId ?? null
      },
      create: {
        userId,
        presetKey: input.presetKey,
        label: input.label ?? null,
        category: input.category ?? null,
        templateId: input.templateId ?? null
      }
    });
  }

  async removeFavorite(userId: string, presetKey: string) {
    await this.prisma.userTemplateFavorite.deleteMany({
      where: {
        userId,
        presetKey
      }
    });

    return {
      removed: true,
      presetKey
    };
  }

  private mapDocumentType(type: "prescription" | "exam-request" | "medical-certificate" | "free-document") {
    const typeMap = {
      prescription: DocumentType.PRESCRIPTION,
      "exam-request": DocumentType.EXAM_REQUEST,
      "medical-certificate": DocumentType.MEDICAL_CERTIFICATE,
      "free-document": DocumentType.FREE_DOCUMENT
    } as const;

    return typeMap[type];
  }
}

function hasInstitutionalGovernanceRole(roles: string[]) {
  return roles.some((role) => role === "admin" || role === "compliance");
}

function toTemplateSummary(template: {
  id: string;
  name: string;
  type: DocumentType;
  version: number;
  scope: TemplateScope;
  lifecycleStatus: TemplateLifecycleStatus;
  structure: unknown;
  organizationId: string | null;
  createdByUserId: string | null;
  reviewedByUserId: string | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: template.id,
    name: template.name,
    type: mapDocumentTypeToContract(template.type),
    version: template.version,
    scope: template.scope.toLowerCase(),
    lifecycleStatus: template.lifecycleStatus.toLowerCase(),
    structure:
      template.structure && typeof template.structure === "object" && !Array.isArray(template.structure)
        ? (template.structure as Record<string, unknown>)
        : {},
    organizationId: template.organizationId,
    createdByUserId: template.createdByUserId,
    reviewedByUserId: template.reviewedByUserId,
    publishedAt: template.publishedAt?.toISOString() ?? null,
    archivedAt: template.archivedAt?.toISOString() ?? null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString()
  };
}

function mapDocumentTypeToContract(type: DocumentType) {
  const typeMap = {
    [DocumentType.PRESCRIPTION]: "prescription",
    [DocumentType.EXAM_REQUEST]: "exam-request",
    [DocumentType.MEDICAL_CERTIFICATE]: "medical-certificate",
    [DocumentType.FREE_DOCUMENT]: "free-document"
  } as const;

  return typeMap[type];
}
