import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../persistence/persistence.module";
import { AuditModule } from "../audit/audit.module";
import { AccessModule } from "../access/access.module";
import { AuthModule } from "../auth/auth.module";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentBillingService } from "./billing/appointment-billing.service";
import { AppointmentBillingWebhookController } from "./billing/appointment-billing-webhook.controller";
import { PaymentProviderGateway } from "./billing/payment-provider.gateway";
import { AppointmentRemindersService } from "./reminders/appointment-reminders.service";
import { ReminderProviderGateway } from "./reminders/reminder-provider.gateway";
import { AppointmentsService } from "./appointments.service";
import { TelehealthProviderGateway } from "./telehealth/telehealth-provider.gateway";
import { TelehealthService } from "./telehealth/telehealth.service";

@Module({
  imports: [PersistenceModule, AuthModule, AccessModule, AuditModule],
  controllers: [AppointmentsController, AppointmentBillingWebhookController],
  providers: [
    AppointmentsService,
    AppointmentRemindersService,
    ReminderProviderGateway,
    AppointmentBillingService,
    PaymentProviderGateway,
    TelehealthProviderGateway,
    TelehealthService
  ],
  exports: [AppointmentsService]
})
export class AppointmentsModule {}
