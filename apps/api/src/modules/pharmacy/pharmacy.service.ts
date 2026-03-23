import { Injectable, NotFoundException } from "@nestjs/common";
import { PharmacyOrderStatus } from "@prisma/client";
import type {
  PharmacyOperationsSnapshot,
  PharmacyOrder,
  PharmacyQuote,
  PrescriptionDocument
} from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { PharmacyProviderGateway } from "./pharmacy-provider.gateway";

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    private readonly pharmacyProviderGateway: PharmacyProviderGateway
  ) {}

  async quotePrescription(documentId: string): Promise<PharmacyQuote> {
    return this.quotePrescriptionWithRouting(documentId, {});
  }

  async getProviderReadiness() {
    return this.pharmacyProviderGateway.getReadiness();
  }

  async quotePrescriptionWithRouting(
    documentId: string,
    input: {
      routeStrategy?: "best-value" | "lowest-price" | "fastest";
      preferredPartnerKey?: string;
    }
  ): Promise<PharmacyQuote> {
    const document = await this.documentsService.getById(documentId);

    if (document.type !== "prescription") {
      throw new NotFoundException("Cotacao farmaceutica disponivel apenas para prescricoes");
    }

    const quote = await this.pharmacyProviderGateway.quotePrescription({
      documentId,
      routeStrategy: input.routeStrategy,
      preferredPartnerKey: input.preferredPartnerKey,
      items: document.items.map((item: PrescriptionDocument["items"][number]) => ({
        medicationName: item.medicationName,
        quantity: item.quantity
      }))
    });

    return {
      ...quote,
      warnings: normalizeWarnings(quote)
    };
  }

  async createOrderForPrescription(
    documentId: string,
    input: {
      routeStrategy?: "best-value" | "lowest-price" | "fastest";
      preferredPartnerKey?: string;
    } = {}
  ): Promise<PharmacyOrder> {
    const quote = await this.quotePrescriptionWithRouting(documentId, input);
    const order = await this.pharmacyProviderGateway.createOrderFromQuote({
      documentId,
      quote,
      routeStrategy: input.routeStrategy,
      preferredPartnerKey: input.preferredPartnerKey
    });

    const created = await this.prisma.pharmacyOrder.create({
      data: {
        documentId,
        provider: order.provider,
        providerMode: order.providerMode,
        metadata: {
          ...(order.metadata ?? {}),
          partnerKey: order.partnerKey ?? quote.selectedPartnerKey ?? null,
          routeStrategy: order.routeStrategy ?? quote.routeStrategy ?? null
        } as never,
        quoteId: order.quoteId,
        status: toPrismaOrderStatus(order.status),
        externalReference: order.externalReference,
        checkoutUrl: order.checkoutUrl,
        partnerOrderUrl: order.partnerOrderUrl,
        totalPriceCents: order.totalPriceCents,
        currency: order.currency,
        items: order.items as never,
        warnings: order.warnings as never
      }
    });

    return toDomainOrder(created);
  }

  async getOrder(orderId: string): Promise<PharmacyOrder> {
    const order = await this.prisma.pharmacyOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException("Pedido farmaceutico nao encontrado");
    }

    return toDomainOrder(order);
  }

  async getOrderScope(orderId: string) {
    const order = await this.prisma.pharmacyOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        documentId: true
      }
    });

    if (!order) {
      throw new NotFoundException("Pedido farmaceutico nao encontrado");
    }

    return order;
  }

  async syncOrder(orderId: string): Promise<PharmacyOrder> {
    const order = await this.prisma.pharmacyOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException("Pedido farmaceutico nao encontrado");
    }

    const providerStatus = await this.pharmacyProviderGateway.getOrderStatus({
      orderId: order.id,
      externalReference: order.externalReference
    });

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: order.id },
      data: {
        status: toPrismaOrderStatus(providerStatus.status),
        externalReference: providerStatus.externalReference ?? order.externalReference,
        checkoutUrl: providerStatus.checkoutUrl ?? order.checkoutUrl,
        partnerOrderUrl: providerStatus.partnerOrderUrl ?? order.partnerOrderUrl,
        warnings: providerStatus.warnings as never,
        metadata: {
          ...(order.metadata && typeof order.metadata === "object" ? order.metadata : {}),
          ...(providerStatus.metadata ?? {}),
          syncedAt: new Date().toISOString()
        } as never
      }
    });

    return toDomainOrder(updated);
  }

  async syncPendingOrders(input: { limit?: number }) {
    const orders = await this.prisma.pharmacyOrder.findMany({
      where: {
        status: {
          in: [
            PharmacyOrderStatus.PENDING,
            PharmacyOrderStatus.CHECKOUT_READY,
            PharmacyOrderStatus.ORDER_PLACED
          ]
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: Math.min(Math.max(input.limit ?? 20, 1), 100)
    });

    const results: PharmacyOrder[] = [];

    for (const order of orders) {
      results.push(await this.syncOrder(order.id));
    }

    return {
      processed: results.length,
      results
    };
  }

  async getOperationsSnapshot(): Promise<PharmacyOperationsSnapshot> {
    const [readiness, pending, checkoutReady, orderPlaced, failed, confirmedToday, recentOrders] =
      await Promise.all([
        this.pharmacyProviderGateway.getReadiness(),
        this.prisma.pharmacyOrder.count({
          where: {
            status: PharmacyOrderStatus.PENDING
          }
        }),
        this.prisma.pharmacyOrder.count({
          where: {
            status: PharmacyOrderStatus.CHECKOUT_READY
          }
        }),
        this.prisma.pharmacyOrder.count({
          where: {
            status: PharmacyOrderStatus.ORDER_PLACED
          }
        }),
        this.prisma.pharmacyOrder.count({
          where: {
            status: PharmacyOrderStatus.FAILED
          }
        }),
        this.prisma.pharmacyOrder.count({
          where: {
            status: PharmacyOrderStatus.CONFIRMED,
            updatedAt: {
              gte: startOfToday()
            }
          }
        }),
        this.prisma.pharmacyOrder.findMany({
          orderBy: {
            updatedAt: "desc"
          },
          take: 10
        })
      ]);

    const alerts = [...readiness.issues];

    if (failed > 0) {
      alerts.push(`Existem ${failed} pedidos farmaceuticos com falha para revisao.`);
    }

    if (pending + checkoutReady + orderPlaced > 20) {
      alerts.push("Fila farmaceutica acima do esperado; revisar sincronizacao e parceiros.");
    }

    return {
      checkedAt: new Date().toISOString(),
      readiness,
      queue: {
        pending,
        checkoutReady,
        orderPlaced,
        failed,
        confirmedToday
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        documentId: order.documentId,
        partnerKey: extractOrderMetadata(order.metadata).partnerKey,
        status: order.status.toLowerCase() as PharmacyOrder["status"],
        totalPriceCents: order.totalPriceCents,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
      })),
      alerts
    };
  }
}

function normalizeWarnings(quote: PharmacyQuote) {
  const warnings = [...quote.warnings];

  if (quote.unavailableItems > 0 && !warnings.some((warning) => warning.includes("dispon"))) {
    warnings.push("Existem itens indisponiveis na cotacao normalizada.");
  }

  if (!quote.checkoutUrl && !quote.partnerOrderUrl) {
    warnings.push("Cotacao sem link de continuidade transacional.");
  }

  return warnings;
}

function toPrismaOrderStatus(status: PharmacyOrder["status"]) {
  switch (status) {
    case "checkout_ready":
      return PharmacyOrderStatus.CHECKOUT_READY;
    case "order_placed":
      return PharmacyOrderStatus.ORDER_PLACED;
    case "confirmed":
      return PharmacyOrderStatus.CONFIRMED;
    case "fulfilled":
      return PharmacyOrderStatus.FULFILLED;
    case "cancelled":
      return PharmacyOrderStatus.CANCELLED;
    case "failed":
      return PharmacyOrderStatus.FAILED;
    default:
      return PharmacyOrderStatus.PENDING;
  }
}

function toDomainOrder(order: {
  id: string;
  documentId: string;
  provider: string;
  providerMode: string | null;
  quoteId: string;
  status: PharmacyOrderStatus;
  externalReference: string | null;
  checkoutUrl: string | null;
  partnerOrderUrl: string | null;
  totalPriceCents: number;
  currency: string;
  items: unknown;
  warnings: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): PharmacyOrder {
  const metadata = extractOrderMetadata(order.metadata);

  return {
    id: order.id,
    documentId: order.documentId,
    provider: order.provider,
    providerMode:
      order.providerMode === "mock" || order.providerMode === "remote"
        ? order.providerMode
        : undefined,
    partnerKey: metadata.partnerKey,
    quoteId: order.quoteId,
    routeStrategy: metadata.routeStrategy,
    status: order.status.toLowerCase() as PharmacyOrder["status"],
    externalReference: order.externalReference ?? undefined,
    checkoutUrl: order.checkoutUrl ?? undefined,
    partnerOrderUrl: order.partnerOrderUrl ?? undefined,
    totalPriceCents: order.totalPriceCents,
    currency: order.currency,
    items: Array.isArray(order.items) ? (order.items as PharmacyOrder["items"]) : [],
    warnings: Array.isArray(order.warnings)
      ? order.warnings.filter((item): item is string => typeof item === "string")
      : [],
    metadata:
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString()
  };
}

function extractOrderMetadata(metadata: unknown): {
  partnerKey?: string;
  routeStrategy?: PharmacyOrder["routeStrategy"];
} {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return {
    partnerKey:
      typeof (metadata as Record<string, unknown>).partnerKey === "string"
        ? ((metadata as Record<string, unknown>).partnerKey as string)
        : undefined,
    routeStrategy:
      typeof (metadata as Record<string, unknown>).routeStrategy === "string"
        ? ((metadata as Record<string, unknown>).routeStrategy as PharmacyOrder["routeStrategy"])
        : undefined
  };
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
