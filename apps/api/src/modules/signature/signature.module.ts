import { Module } from "@nestjs/common";

import { AccessModule } from "../access/access.module";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { PersistenceModule } from "../../persistence/persistence.module";
import { SignatureProviderGateway } from "./signature-provider.gateway";
import { SignatureController } from "./signature.controller";
import { SignatureProviderCallbackController } from "./signature-provider-callback.controller";
import { SignatureService } from "./signature.service";

@Module({
  imports: [AccessModule, AuthModule, AuditModule, ComplianceModule, PersistenceModule],
  controllers: [SignatureController, SignatureProviderCallbackController],
  providers: [SignatureService, SignatureProviderGateway],
  exports: [SignatureService, SignatureProviderGateway]
})
export class SignatureModule {}
