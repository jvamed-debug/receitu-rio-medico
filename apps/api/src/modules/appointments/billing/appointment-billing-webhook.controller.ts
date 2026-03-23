import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AuditService } from "../../audit/audit.service";
import { AppointmentBillingService } from "./appointment-billing.service";

@Controller("appointments/billing/webhooks")
export class AppointmentBillingWebhookController {
  constructor(
    private readonly billingService: AppointmentBillingService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
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

    if (input.eventId) {
      const existingAuditEntries = await this.auditService.listByEntity(
        "appointment_billing",
        input.billingId
      );
      const duplicateEvent = existingAuditEntries.some(
        (entry) =>
          entry.action === "appointment_billing_webhook_received" &&
          readEventId(entry.metadata) === input.eventId
      );

      if (duplicateEvent) {
        const currentEntry = await this.resolveCurrentBilling(
          input.appointmentId,
          input.billingId
        );
        if (currentEntry) {
          return currentEntry;
        }
      }
    }

    await this.auditService.log({
      actorUserId: "system-webhook",
      entityType: "appointment_billing",
      entityId: input.billingId,
      action: "appointment_billing_webhook_received",
      origin: "api.appointments.webhook",
      metadata: {
        appointmentId: input.appointmentId,
        eventId: input.eventId ?? null,
        providerReference: input.providerReference ?? null,
        status: input.status
      }
    });

    return this.billingService.reconcileEntry(
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
  }

  private async resolveCurrentBilling(appointmentId: string, billingId: string) {
    const items = await this.billingService.listByAppointment(appointmentId);
    return items.find((item) => item.id === billingId);
  }
}

function readEventId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const eventId = (metadata as { eventId?: unknown }).eventId;
  return typeof eventId === "string" ? eventId : undefined;
}
