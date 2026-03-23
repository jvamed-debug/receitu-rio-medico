import { Module } from "@nestjs/common";

import { AccessModule } from "../access/access.module";
import { DocumentsModule } from "../documents/documents.module";
import { PharmacyController } from "./pharmacy.controller";
import { PharmacyProviderGateway } from "./pharmacy-provider.gateway";
import { PharmacyService } from "./pharmacy.service";

@Module({
  imports: [AccessModule, DocumentsModule],
  controllers: [PharmacyController],
  providers: [PharmacyService, PharmacyProviderGateway],
  exports: [PharmacyService]
})
export class PharmacyModule {}
