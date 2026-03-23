import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AppointmentBilling } from "@receituario/domain";

import { PrismaService } from "../../../persistence/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { AccessPrincipal } from "../../auth/auth.types";

@Injectable()
export class AppointmentBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
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
      data: {
        status: nextStatus,
        authorizedAt: nextStatus === "AUTHORIZED" ? new Date() : existing.authorizedAt,
        paidAt: nextStatus === "PAID" ? new Date() : existing.paidAt,
        externalReference:
          existing.externalReference ??
          `${(existing.paymentProvider ?? "manual").toLowerCase()}-${existing.id}`
      }
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

function mapBillingRecord(entry: {
  id: string;
  appointmentId: string;
  status: string;
  amountCents: number;
  currency: string;
  description: string;
  paymentProvider: string | null;
  externalReference: string | null;
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
    authorizedAt: entry.authorizedAt?.toISOString(),
    paidAt: entry.paidAt?.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString()
  };
}
