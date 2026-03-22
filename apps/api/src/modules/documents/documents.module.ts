import { Module } from "@nestjs/common";

import { AccessModule } from "../access/access.module";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [AccessModule, AuthModule, AuditModule, ComplianceModule, DeliveryModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService]
})
export class DocumentsModule {}
