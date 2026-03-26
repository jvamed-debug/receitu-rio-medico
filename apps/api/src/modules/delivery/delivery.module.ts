import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PersistenceModule } from "../../persistence/persistence.module";
import { AccessModule } from "../access/access.module";
import { AuthModule } from "../auth/auth.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { DeliveryController, PublicDeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";

@Module({
  imports: [AccessModule, AuditModule, AuthModule, ComplianceModule, PersistenceModule],
  controllers: [DeliveryController, PublicDeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService]
})
export class DeliveryModule {}
