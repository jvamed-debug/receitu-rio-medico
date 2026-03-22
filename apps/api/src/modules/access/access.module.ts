import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { ResourceAccessService } from "./resource-access.service";

@Module({
  imports: [AuditModule],
  providers: [ResourceAccessService],
  exports: [ResourceAccessService]
})
export class AccessModule {}
