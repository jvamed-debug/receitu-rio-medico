import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AppointmentBillingService } from "./appointment-billing.service";

@Controller("appointments/billing/webhooks")
export class AppointmentBillingWebhookController {
  constructor(
    private readonly billingService: AppointmentBillingService,
    private readonly configService: ConfigService
  ) {}

  @Post("provider")
  async receiveProviderEvent(
    @Headers("x-webhook-secret") secret: string | undefined,
    @Body()
    input: {
      appointmentId: string;
      billingId: string;
      status: "authorized" | "paid" | "cancelled" | "refunded";
    }
  ) {
    const expectedSecret =
      this.configService.get<string>("PAYMENT_PROVIDER_WEBHOOK_SECRET") ??
      "receituario-webhook-secret";

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException("Webhook nao autorizado");
    }

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
}
