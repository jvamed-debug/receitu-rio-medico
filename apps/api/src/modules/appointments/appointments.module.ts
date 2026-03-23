import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../persistence/persistence.module";
import { AuditModule } from "../audit/audit.module";
import { AccessModule } from "../access/access.module";
import { AuthModule } from "../auth/auth.module";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentRemindersService } from "./reminders/appointment-reminders.service";
import { AppointmentsService } from "./appointments.service";

@Module({
  imports: [PersistenceModule, AuthModule, AccessModule, AuditModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentRemindersService],
  exports: [AppointmentsService]
})
export class AppointmentsModule {}
