import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../../persistence/persistence.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService]
})
export class OrganizationsModule {}
