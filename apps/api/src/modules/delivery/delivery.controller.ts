import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";

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

  @Post("documents/:id/share-links/revoke")
  async revokeShareLinks(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      id,
      "document_share_links_revoke"
    );
    return this.deliveryService.revokeShareLinks(id);
  }
}

@Controller("delivery/share")
export class PublicDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get(":token")
  resolveShareLink(@Param("token") token: string) {
    return this.deliveryService.resolveShareLink(token);
  }
}
