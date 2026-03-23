import { Injectable, NotFoundException } from "@nestjs/common";
import type { PharmacyQuote, PrescriptionDocument } from "@receituario/domain";

import { DocumentsService } from "../documents/documents.service";
import { PharmacyProviderGateway } from "./pharmacy-provider.gateway";

@Injectable()
export class PharmacyService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pharmacyProviderGateway: PharmacyProviderGateway
  ) {}

  async quotePrescription(documentId: string): Promise<PharmacyQuote> {
    const document = await this.documentsService.getById(documentId);

    if (document.type !== "prescription") {
      throw new NotFoundException("Cotacao farmaceutica disponivel apenas para prescricoes");
    }

    return this.pharmacyProviderGateway.quotePrescription({
      documentId,
      items: document.items.map((item: PrescriptionDocument["items"][number]) => ({
        medicationName: item.medicationName,
        quantity: item.quantity
      }))
    });
  }
}
