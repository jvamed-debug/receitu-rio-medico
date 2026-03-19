import type { ClinicalDocumentType } from "@receituario/domain";

export interface SignaturePolicy {
  documentType: ClinicalDocumentType;
  signatureLevel: "advanced" | "qualified";
  windowAllowed: boolean;
  requiresIcpBrasil: boolean;
}

export const signaturePolicies: SignaturePolicy[] = [
  {
    documentType: "prescription",
    signatureLevel: "qualified",
    windowAllowed: true,
    requiresIcpBrasil: true
  },
  {
    documentType: "exam-request",
    signatureLevel: "advanced",
    windowAllowed: true,
    requiresIcpBrasil: false
  },
  {
    documentType: "medical-certificate",
    signatureLevel: "advanced",
    windowAllowed: true,
    requiresIcpBrasil: false
  },
  {
    documentType: "free-document",
    signatureLevel: "advanced",
    windowAllowed: true,
    requiresIcpBrasil: false
  }
];

export function getSignaturePolicy(documentType: ClinicalDocumentType) {
  return signaturePolicies.find((policy) => policy.documentType === documentType);
}

