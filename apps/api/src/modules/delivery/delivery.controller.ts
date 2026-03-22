import { Controller, Get, Param, UseGuards } from "@nestjs/common";

import { ResourceAccessService } from "../access/resource-access.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { DeliveryService } from "./delivery.service";

@UseGuards(AuthGuard)
@Controller("delivery")
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly resourceAccessService: ResourceAccessService
  ) {}

  @Get("channels")
  channels() {
    return this.deliveryService.channels();
  }

  @Get("documents/:id/events")
  async listByDocument(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      id,
      "document_delivery_events_read"
    );
    return this.deliveryService.listByDocument(id);
  }
}
