import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";

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
    @Param("documentId") documentId: string,
    @Body()
    input: {
      routeStrategy?: "best-value" | "lowest-price" | "fastest";
      preferredPartnerKey?: string;
    }
  ) {
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      documentId,
      "prescription_quote"
    );
    return this.pharmacyService.quotePrescriptionWithRouting(documentId, input ?? {});
  }

  @Post("prescriptions/:documentId/orders")
  async createPrescriptionOrder(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("documentId") documentId: string,
    @Body()
    input: {
      routeStrategy?: "best-value" | "lowest-price" | "fastest";
      preferredPartnerKey?: string;
    }
  ) {
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      documentId,
      "prescription_order_create"
    );
    return this.pharmacyService.createOrderForPrescription(documentId, input ?? {});
  }

  @Post("orders/:orderId/sync")
  async syncOrder(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("orderId") orderId: string
  ) {
    const order = await this.pharmacyService.getOrderScope(orderId);
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      order.documentId,
      "prescription_order_sync"
    );
    return this.pharmacyService.syncOrder(orderId);
  }

  @Get("orders/:orderId")
  async getOrder(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("orderId") orderId: string
  ) {
    const order = await this.pharmacyService.getOrderScope(orderId);
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      order.documentId,
      "prescription_order_read"
    );
    return this.pharmacyService.getOrder(orderId);
  }

  @Post("orders/sync-pending")
  async syncPendingOrders(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body() input: { limit?: number }
  ) {
    if (!principal.roles.includes("admin") && !principal.roles.includes("compliance")) {
      throw new ForbiddenException("Sincronizacao pendente restrita a perfis operacionais");
    }

    return this.pharmacyService.syncPendingOrders(input ?? {});
  }

  @Get("provider/readiness")
  async getProviderReadiness(@CurrentPrincipal() principal: AccessPrincipal) {
    if (!principal.roles.includes("admin") && !principal.roles.includes("compliance")) {
      throw new ForbiddenException("Readiness farmaceutico restrito a perfis operacionais");
    }

    return this.pharmacyService.getProviderReadiness();
  }

  @Get("operations")
  async getOperations(@CurrentPrincipal() principal: AccessPrincipal) {
    if (!principal.roles.includes("admin") && !principal.roles.includes("compliance")) {
      throw new ForbiddenException("Operacao farmaceutica restrita a perfis operacionais");
    }

    return this.pharmacyService.getOperationsSnapshot();
  }
}
