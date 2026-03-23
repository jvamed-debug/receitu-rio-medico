import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../persistence/persistence.module";
import { AccessModule } from "../access/access.module";
import { AuthModule } from "../auth/auth.module";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";

@Module({
  imports: [PersistenceModule, AuthModule, AccessModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService]
})
export class AppointmentsModule {}
