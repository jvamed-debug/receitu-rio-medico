import {
  createExamRequestSchema,
  createFreeDocumentSchema,
  createMedicalCertificateSchema,
  createPrescriptionSchema
} from "@receituario/schemas";
import type { z } from "zod";

export type CreatePrescriptionDto = z.infer<typeof createPrescriptionSchema>;
export type CreateExamRequestDto = z.infer<typeof createExamRequestSchema>;
export type CreateMedicalCertificateDto = z.infer<typeof createMedicalCertificateSchema>;
export type CreateFreeDocumentDto = z.infer<typeof createFreeDocumentSchema>;

