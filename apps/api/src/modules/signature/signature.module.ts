import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { PersistenceModule } from "../../persistence/persistence.module";
import { SignatureController } from "./signature.controller";
import { SignatureService } from "./signature.service";

@Module({
  imports: [AuthModule, AuditModule, ComplianceModule, PersistenceModule],
  controllers: [SignatureController],
  providers: [SignatureService],
  exports: [SignatureService]
})
export class SignatureModule {}
