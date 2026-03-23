import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AppointmentBilling } from "@receituario/domain";

import { PrismaService } from "../../../persistence/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { AccessPrincipal } from "../../auth/auth.types";
import { PaymentProviderGateway } from "./payment-provider.gateway";

@Injectable()
export class AppointmentBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly paymentProviderGateway: PaymentProviderGateway
  ) {}

  async listByAppointment(appointmentId: string) {
    const entries = await this.prisma.appointmentBilling.findMany({
      where: { appointmentId },
      orderBy: { createdAt: "desc" }
    });

    return entries.map(mapBillingRecord);
  }

  async createEntry(
    appointmentId: string,
    input: {
      amountCents: number;
      description: string;
      paymentProvider?: string;
    },
    principal: AccessPrincipal
  ) {
    if (input.amountCents <= 0) {
      throw new BadRequestException("Valor da cobranca deve ser maior que zero");
    }

    const entry = await this.prisma.appointmentBilling.create({
      data: {
        appointmentId,
        amountCents: input.amountCents,
        description: input.description,
        paymentProvider: input.paymentProvider ?? "manual"
      }
    });

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment_billing",
      entityId: entry.id,
      action: "appointment_billing_created",
      origin: "api.appointments",
      metadata: {
        appointmentId,
        amountCents: entry.amountCents,
        paymentProvider: entry.paymentProvider
      }
    });

    return mapBillingRecord(entry);
  }

  async authorizeEntry(
    appointmentId: string,
    billingId: string,
    principal: AccessPrincipal
  ) {
    return this.transitionBilling(
      appointmentId,
      billingId,
      "AUTHORIZED",
      "appointment_billing_authorized",
      principal
    );
  }

  async payEntry(
    appointmentId: string,
    billingId: string,
    principal: AccessPrincipal
  ) {
    return this.transitionBilling(
      appointmentId,
      billingId,
      "PAID",
      "appointment_billing_paid",
      principal
    );
  }

  async createCheckout(
    appointmentId: string,
    billingId: string,
    principal: AccessPrincipal
  ) {
    const existing = await this.prisma.appointmentBilling.findFirst({
      where: {
        id: billingId,
        appointmentId
      }
    });

    if (!existing) {
      throw new NotFoundException("Cobranca nao encontrada");
    }

    const paymentProvider = existing.paymentProvider ?? "manual";
    const checkout = await this.paymentProviderGateway.createCheckout({
      billingId: existing.id,
      appointmentId: existing.appointmentId,
      amountCents: existing.amountCents,
      currency: existing.currency,
      description: existing.description,
      paymentProvider,
      existingExternalReference: existing.externalReference
    });

    const updated = await this.prisma.appointmentBilling.update({
      where: { id: billingId },
      data: {
        externalReference: checkout.externalReference,
        metadata: normalizeJsonRecord({
          ...(typeof existing.metadata === "object" && existing.metadata ? existing.metadata : {}),
          checkoutUrl: checkout.checkoutUrl,
          checkoutProvider: paymentProvider,
          checkoutMetadata: normalizeJsonRecord(checkout.providerMetadata)
        })
      }
    });

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment_billing",
      entityId: billingId,
      action: "appointment_billing_checkout_created",
      origin: "api.appointments",
      metadata: {
        appointmentId,
        externalReference: updated.externalReference,
        checkoutUrl: checkout.checkoutUrl
      }
    });

    return mapBillingRecord(updated);
  }

  async reconcileEntry(
    appointmentId: string,
    billingId: string,
    input: {
      status: "authorized" | "paid" | "cancelled" | "refunded";
    },
    principal: AccessPrincipal
  ) {
    const existing = await this.prisma.appointmentBilling.findFirst({
      where: {
        id: billingId,
        appointmentId
      }
    });

    if (!existing) {
      throw new NotFoundException("Cobranca nao encontrada");
    }

    const updated = await this.prisma.appointmentBilling.update({
      where: { id: billingId },
      data: buildBillingReconciliationUpdate(existing, input.status)
    });

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment_billing",
      entityId: billingId,
      action: "appointment_billing_reconciled",
      origin: "api.appointments",
      metadata: {
        appointmentId,
        status: updated.status
      }
    });

    return mapBillingRecord(updated);
  }

  private async transitionBilling(
    appointmentId: string,
    billingId: string,
    nextStatus: "AUTHORIZED" | "PAID",
    auditAction: string,
    principal: AccessPrincipal
  ) {
    const existing = await this.prisma.appointmentBilling.findFirst({
      where: {
        id: billingId,
        appointmentId
      }
    });

    if (!existing) {
      throw new NotFoundException("Cobranca nao encontrada");
    }

    const updated = await this.prisma.appointmentBilling.update({
      where: { id: billingId },
      data: await buildBillingTransitionUpdate(
        existing,
        nextStatus,
        this.paymentProviderGateway
      )
    });

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment_billing",
      entityId: billingId,
      action: auditAction,
      origin: "api.appointments",
      metadata: {
        appointmentId,
        status: updated.status,
        externalReference: updated.externalReference
      }
    });

    return mapBillingRecord(updated);
  }
}

async function buildBillingTransitionUpdate(
  existing: {
    id: string;
    appointmentId: string;
    amountCents: number;
    currency: string;
    description: string;
    paymentProvider: string | null;
    externalReference: string | null;
    authorizedAt: Date | null;
    metadata: unknown;
  },
  nextStatus: "AUTHORIZED" | "PAID",
  paymentProviderGateway: PaymentProviderGateway
) {
  const paymentProvider = existing.paymentProvider ?? "manual";

  if (nextStatus === "AUTHORIZED") {
    const authorization = await paymentProviderGateway.authorize({
      billingId: existing.id,
      appointmentId: existing.appointmentId,
      amountCents: existing.amountCents,
      currency: existing.currency,
      description: existing.description,
      paymentProvider,
      existingExternalReference: existing.externalReference
    });

    return {
      status: nextStatus,
      authorizedAt: new Date(authorization.authorizedAt),
      paidAt: null,
      externalReference: authorization.externalReference,
      metadata: normalizeJsonRecord({
        ...(typeof existing.metadata === "object" && existing.metadata ? existing.metadata : {}),
        authorizationProvider: paymentProvider,
        authorizationMetadata: normalizeJsonRecord(authorization.providerMetadata)
      })
    };
  }

  const capture = await paymentProviderGateway.capture({
    billingId: existing.id,
    appointmentId: existing.appointmentId,
    externalReference: existing.externalReference,
    amountCents: existing.amountCents,
    currency: existing.currency,
    paymentProvider
  });

  return {
    status: nextStatus,
    authorizedAt: existing.authorizedAt ?? new Date(),
    paidAt: new Date(capture.paidAt),
    externalReference: capture.externalReference,
    metadata: normalizeJsonRecord({
      ...(typeof existing.metadata === "object" && existing.metadata ? existing.metadata : {}),
      captureProvider: paymentProvider,
      captureMetadata: normalizeJsonRecord(capture.providerMetadata)
    })
  };
}

function normalizeJsonRecord(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function buildBillingReconciliationUpdate(
  existing: {
    authorizedAt: Date | null;
    paidAt: Date | null;
  },
  status: "authorized" | "paid" | "cancelled" | "refunded"
) {
  if (status === "authorized") {
    return {
      status: "AUTHORIZED" as const,
      authorizedAt: existing.authorizedAt ?? new Date()
    };
  }

  if (status === "paid") {
    return {
      status: "PAID" as const,
      authorizedAt: existing.authorizedAt ?? new Date(),
      paidAt: existing.paidAt ?? new Date()
    };
  }

  if (status === "refunded") {
    return {
      status: "REFUNDED" as const
    };
  }

  return {
    status: "CANCELLED" as const
  };
}

function mapBillingRecord(entry: {
  id: string;
  appointmentId: string;
  status: string;
  amountCents: number;
  currency: string;
  description: string;
  paymentProvider: string | null;
  externalReference: string | null;
  metadata?: unknown;
  authorizedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AppointmentBilling {
  return {
    id: entry.id,
    appointmentId: entry.appointmentId,
    status: entry.status.toLowerCase() as AppointmentBilling["status"],
    amountCents: entry.amountCents,
    currency: entry.currency,
    description: entry.description,
    paymentProvider: entry.paymentProvider ?? undefined,
    externalReference: entry.externalReference ?? undefined,
    checkoutUrl: readCheckoutUrl(entry.metadata),
    authorizedAt: entry.authorizedAt?.toISOString(),
    paidAt: entry.paidAt?.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString()
  };
}

function readCheckoutUrl(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const checkoutUrl = (metadata as { checkoutUrl?: unknown }).checkoutUrl;
  return typeof checkoutUrl === "string" ? checkoutUrl : undefined;
}
