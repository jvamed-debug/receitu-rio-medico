import { Injectable } from "@nestjs/common";

import { DocumentsService } from "../documents/documents.service";

@Injectable()
export class HistoryService {
  constructor(private readonly documentsService: DocumentsService) {}

  async getHistory(authorProfessionalId?: string, organizationId?: string) {
    return {
      items: await this.documentsService.listForProfessional(authorProfessionalId, organizationId),
      filters: ["type", "status", "date", "patient", "channel", "author"]
    };
  }

  async getPatientHistory(
    patientId: string,
    authorProfessionalId?: string,
    organizationId?: string
  ) {
    return {
      patientId,
      items: await this.documentsService.listByPatient(
        patientId,
        authorProfessionalId,
        organizationId
      )
    };
  }
}
