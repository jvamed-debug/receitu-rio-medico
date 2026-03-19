import { Controller, Get, Param, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { DeliveryService } from "./delivery.service";

@UseGuards(AuthGuard)
@Controller("delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get("channels")
  channels() {
    return this.deliveryService.channels();
  }

  @Get("documents/:id/events")
  listByDocument(@Param("id") id: string) {
    return this.deliveryService.listByDocument(id);
  }
}
