import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../persistence/persistence.module";
import { AuthModule } from "../auth/auth.module";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";

@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService]
})
export class ComplianceModule {}
