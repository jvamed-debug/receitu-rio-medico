import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { PrismaService } from "../../persistence/prisma.service";

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  channels() {
    return ["email", "share-link", "mobile-native-share"];
  }

  async deliverByEmail(input: { documentId: string; email: string }) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: input.documentId }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    if (!input.email.includes("@")) {
      throw new BadRequestException("E-mail de entrega invalido");
    }

    const deliveryEvent = await this.prisma.deliveryEvent.create({
      data: {
        documentId: input.documentId,
        channel: "email",
        target: input.email,
        status: "queued",
        metadata: {
          mode: "transactional-email"
        }
      }
    });

    return {
      id: deliveryEvent.id,
      documentId: deliveryEvent.documentId,
      channel: deliveryEvent.channel,
      target: deliveryEvent.target,
      status: deliveryEvent.status,
      createdAt: deliveryEvent.createdAt.toISOString()
    };
  }

  async createShareLink(input: { documentId: string }) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: input.documentId }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    const shareUrl = `https://example.local/documents/${input.documentId}/share`;
    const deliveryEvent = await this.prisma.deliveryEvent.create({
      data: {
        documentId: input.documentId,
        channel: "share-link",
        target: shareUrl,
        status: "generated",
        metadata: {
          linkType: "secure-share"
        }
      }
    });

    return {
      id: deliveryEvent.id,
      documentId: input.documentId,
      url: shareUrl,
      status: deliveryEvent.status,
      createdAt: deliveryEvent.createdAt.toISOString()
    };
  }

  async listByDocument(documentId: string) {
    const events = await this.prisma.deliveryEvent.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" }
    });

    return events.map((event) => ({
      id: event.id,
      channel: event.channel,
      target: event.target,
      status: event.status,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString()
    }));
  }
}
