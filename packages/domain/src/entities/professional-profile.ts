export interface ProfessionalProfile {
  id: string;
  userId: string;
  fullName: string;
  documentNumber: string;
  councilType: "CRM" | "CRO" | "COREN" | "OTHER";
  councilState: string;
  cbo?: string;
  specialty?: string;
  cnes?: string;
  signatureProvider?: "icp-brasil-vendor" | "govbr-vendor";
  signatureValidatedAt?: string;
  status: "pending_validation" | "active" | "suspended";
}

