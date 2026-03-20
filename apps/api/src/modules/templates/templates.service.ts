import { Injectable } from "@nestjs/common";
import { DocumentType, Prisma } from "@prisma/client";

import { PrismaService } from "../../persistence/prisma.service";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.template.findMany({
      orderBy: [{ type: "asc" }, { version: "desc" }]
    });
  }

  create(input: {
    name: string;
    type: "prescription" | "exam-request" | "medical-certificate" | "free-document";
    structure?: Record<string, unknown>;
  }) {
    const type = this.mapDocumentType(input.type);

    return this.prisma.$transaction(async (transaction) => {
      const latestTemplate = await transaction.template.findFirst({
        where: {
          name: input.name,
          type
        },
        orderBy: {
          version: "desc"
        }
      });

      return transaction.template.create({
        data: {
          name: input.name,
          type,
          version: (latestTemplate?.version ?? 0) + 1,
          structure: (input.structure ?? {}) as Prisma.InputJsonObject
        }
      });
    });
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
