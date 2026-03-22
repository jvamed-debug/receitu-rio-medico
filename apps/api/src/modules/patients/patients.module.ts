import { Module } from "@nestjs/common";

import { AccessModule } from "../access/access.module";
import { AuthModule } from "../auth/auth.module";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";

@Module({
  imports: [AccessModule, AuthModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService]
})
export class PatientsModule {}
