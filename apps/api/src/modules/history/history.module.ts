import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DocumentsModule } from "../documents/documents.module";
import { HistoryController } from "./history.controller";
import { HistoryService } from "./history.service";

@Module({
  imports: [AuthModule, DocumentsModule],
  controllers: [HistoryController],
  providers: [HistoryService]
})
export class HistoryModule {}
