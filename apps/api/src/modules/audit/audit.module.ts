import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../persistence/persistence.module";
import { AuthModule } from "../auth/auth.module";
import { ObservabilityModule } from "../observability/observability.module";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

@Module({
  imports: [AuthModule, PersistenceModule, ObservabilityModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
