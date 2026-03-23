import { Controller, Param, Post, UseGuards } from "@nestjs/common";

import { ResourceAccessService } from "../access/resource-access.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { PharmacyService } from "./pharmacy.service";

@UseGuards(AuthGuard)
@Controller("pharmacy")
export class PharmacyController {
  constructor(
    private readonly pharmacyService: PharmacyService,
    private readonly resourceAccessService: ResourceAccessService
  ) {}

  @Post("prescriptions/:documentId/quote")
  async quotePrescription(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("documentId") documentId: string
  ) {
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      documentId,
      "prescription_quote"
    );
    return this.pharmacyService.quotePrescription(documentId);
  }
}
