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

    const quote = await this.pharmacyProviderGateway.quotePrescription({
      documentId,
      items: document.items.map((item: PrescriptionDocument["items"][number]) => ({
        medicationName: item.medicationName,
        quantity: item.quantity
      }))
    });

    return {
      ...quote,
      warnings: normalizeWarnings(quote)
    };
  }
}

function normalizeWarnings(quote: PharmacyQuote) {
  const warnings = [...quote.warnings];

  if (quote.unavailableItems > 0 && !warnings.some((warning) => warning.includes("dispon"))) {
    warnings.push("Existem itens indisponiveis na cotacao normalizada.");
  }

  if (!quote.checkoutUrl && !quote.partnerOrderUrl) {
    warnings.push("Cotacao sem link de continuidade transacional.");
  }

  return warnings;
}
