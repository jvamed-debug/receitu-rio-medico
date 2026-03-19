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
    const typeMap = {
      prescription: DocumentType.PRESCRIPTION,
      "exam-request": DocumentType.EXAM_REQUEST,
      "medical-certificate": DocumentType.MEDICAL_CERTIFICATE,
      "free-document": DocumentType.FREE_DOCUMENT
    } as const;

    return this.prisma.template.create({
      data: {
        name: input.name,
        type: typeMap[input.type],
        structure: (input.structure ?? {}) as Prisma.InputJsonObject
      }
    });
  }
}
