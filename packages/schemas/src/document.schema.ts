import { z } from "zod";

export const patientReferenceSchema = z.object({
  patientId: z.string().min(1)
});

export const prescriptionItemSchema = z.object({
  medicationName: z.string().min(2),
  activeIngredient: z.string().optional(),
  dosage: z.string().min(1),
  route: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.string().optional(),
  notes: z.string().optional()
});

export const createPrescriptionSchema = patientReferenceSchema.extend({
  title: z.string().min(3),
  items: z.array(prescriptionItemSchema).min(1)
});

export const createExamRequestSchema = patientReferenceSchema.extend({
  title: z.string().min(3),
  requestedExams: z.array(z.string().min(2)).min(1),
  preparationNotes: z.string().optional()
});

export const createMedicalCertificateSchema = patientReferenceSchema.extend({
  title: z.string().min(3),
  purpose: z.string().min(3),
  restDays: z.number().int().nonnegative().optional(),
  observations: z.string().optional()
});

export const createFreeDocumentSchema = patientReferenceSchema.extend({
  title: z.string().min(3),
  body: z.string().min(10)
});

export const signatureWindowSchema = z.object({
  durationMinutes: z.number().int().min(5).max(480)
});

