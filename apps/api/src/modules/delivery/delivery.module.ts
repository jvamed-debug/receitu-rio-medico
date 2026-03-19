import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../persistence/persistence.module";
import { AuthModule } from "../auth/auth.module";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";

@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService]
})
export class DeliveryModule {}
