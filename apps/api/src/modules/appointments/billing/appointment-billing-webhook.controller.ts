import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { BillingStatus } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../persistence/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { AppointmentBillingService } from "./appointment-billing.service";

@Controller("appointments/billing/webhooks")
export class AppointmentBillingWebhookController {
  constructor(
    private readonly billingService: AppointmentBillingService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService
  ) {}

  @Post("provider")
  async receiveProviderEvent(
    @Headers("x-webhook-secret") secret: string | undefined,
    @Body()
    input: {
      eventId?: string;
      appointmentId: string;
      billingId: string;
      providerReference?: string;
      status: "authorized" | "paid" | "cancelled" | "refunded";
    }
  ) {
    const expectedSecret =
      this.configService.get<string>("PAYMENT_PROVIDER_WEBHOOK_SECRET") ??
      "receituario-webhook-secret";

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException("Webhook nao autorizado");
    }

    const eventKey = buildWebhookEventKey(input);
    const existingEvent = await this.prisma.appointmentBillingWebhookEvent.findUnique({
      where: { eventKey }
    });

    if (existingEvent?.processedAt) {
      const currentEntry = await this.resolveCurrentBilling(
        input.appointmentId,
        input.billingId
      );
      if (currentEntry) {
        return currentEntry;
      }
    }

    const webhookEvent =
      existingEvent ??
      (await this.prisma.appointmentBillingWebhookEvent.create({
        data: {
          appointmentId: input.appointmentId,
          billingId: input.billingId,
          eventKey,
          eventId: input.eventId,
          providerReference: input.providerReference,
          status: mapBillingStatus(input.status),
          payload: JSON.parse(JSON.stringify(input))
        }
      }));

    await this.auditService.log({
      actorUserId: "system-webhook",
      entityType: "appointment_billing",
      entityId: input.billingId,
      action: "appointment_billing_webhook_received",
      origin: "api.appointments.webhook",
      metadata: {
        appointmentId: input.appointmentId,
        eventKey,
        eventId: input.eventId ?? null,
        providerReference: input.providerReference ?? null,
        status: input.status
      }
    });

    try {
      const reconciled = await this.billingService.reconcileEntry(
        input.appointmentId,
        input.billingId,
        { status: input.status },
        {
          userId: "system-webhook",
          professionalId: undefined,
          organizationId: undefined,
          roles: ["admin"]
        }
      );

      await this.prisma.appointmentBillingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processedAt: new Date(),
          resultStatus: reconciled.status
        }
      });

      return reconciled;
    } catch (error) {
      await this.prisma.appointmentBillingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          resultStatus: "failed"
        }
      });

      throw error;
    }
  }

  private async resolveCurrentBilling(appointmentId: string, billingId: string) {
    const items = await this.billingService.listByAppointment(appointmentId);
    return items.find((item) => item.id === billingId);
  }
}

function buildWebhookEventKey(input: {
  eventId?: string;
  billingId: string;
  status: "authorized" | "paid" | "cancelled" | "refunded";
  providerReference?: string;
}) {
  return (
    input.eventId ??
    [input.billingId, input.status, input.providerReference ?? "no-provider-ref"].join(":")
  );
}

function mapBillingStatus(status: "authorized" | "paid" | "cancelled" | "refunded") {
  switch (status) {
    case "authorized":
      return BillingStatus.AUTHORIZED;
    case "paid":
      return BillingStatus.PAID;
    case "cancelled":
      return BillingStatus.CANCELLED;
    case "refunded":
      return BillingStatus.REFUNDED;
    default:
      return BillingStatus.PENDING;
  }
}
