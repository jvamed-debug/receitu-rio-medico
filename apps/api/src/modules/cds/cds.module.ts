import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../persistence/persistence.module";
import { CdsService } from "./cds.service";

@Module({
  imports: [PersistenceModule],
  providers: [CdsService],
  exports: [CdsService]
})
export class CdsModule {}
