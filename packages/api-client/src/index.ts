import type {
  Appointment,
  AppointmentAnalyticsSnapshot,
  AppointmentBilling,
  AppointmentMaintenanceRunSummary,
  AppointmentOperationsSnapshot,
  AppointmentSummary,
  AppointmentReminder,
  ClinicalDocument,
  PharmacyOrder,
  PharmacyQuote
} from "@receituario/domain";
export type {
  Appointment,
  AppointmentAnalyticsSnapshot,
  AppointmentBilling,
  AppointmentMaintenanceRunSummary,
  AppointmentOperationsSnapshot,
  AppointmentSummary,
  AppointmentReminder,
  PharmacyOrder,
  PharmacyQuote
} from "@receituario/domain";
import type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  SessionPrincipal
} from "@receituario/auth-contracts";

export interface PatientSummary {
  id: string;
  fullName: string;
  cpf?: string;
  cns?: string;
  clinicalProfile?: PatientClinicalProfile;
}

export interface PatientClinicalProfile {
  allergies: Array<{
    substance: string;
    reaction?: string;
    severity?: "low" | "moderate" | "high";
  }>;
  conditions: Array<{
    name: string;
    status?: "active" | "controlled" | "resolved";
    notes?: string;
  }>;
  chronicMedications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  carePlan: Array<{
    title: string;
    notes?: string;
  }>;
  summary?: string;
  reviewedByProfessionalId?: string;
  reviewedAt?: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  type: string;
  version: number;
  structure: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFavoriteSummary {
  id: string;
  userId: string;
  presetKey: string;
  label?: string | null;
  category?: string | null;
  templateId?: string | null;
  createdAt: string;
}

export interface ProfessionalProfileSummary {
  id?: string;
  documentNumber?: string | null;
  councilType?: string | null;
  councilState?: string | null;
  rqe?: string | null;
  cbo?: string | null;
  specialty?: string | null;
  cnes?: string | null;
  status?: string | null;
  signatureProvider?: string | null;
  signatureValidatedAt?: string | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface PrescriptionItemInput {
  medicationName: string;
  activeIngredient?: string;
  dosage: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  notes?: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  title: string;
  items: PrescriptionItemInput[];
  context?: {
    encounterType?: "ambulatory" | "telehealth" | "emergency" | "inpatient";
    specialty?: string;
    clinicalReason?: string;
    diagnosisCode?: string;
  };
  cdsOverride?: {
    justification: string;
    acceptedAlertCodes: string[];
  };
}

export interface CreateExamRequestInput {
  patientId: string;
  title: string;
  requestedExams: string[];
  preparationNotes?: string;
  context?: CreatePrescriptionInput["context"];
}

export interface CreateMedicalCertificateInput {
  patientId: string;
  title: string;
  purpose: string;
  restDays?: number;
  observations?: string;
  context?: CreatePrescriptionInput["context"];
}

export interface CreateFreeDocumentInput {
  patientId: string;
  title: string;
  body: string;
  context?: CreatePrescriptionInput["context"];
}

export interface CreateTemplateInput {
  name: string;
  type: "prescription" | "exam-request" | "medical-certificate" | "free-document";
  structure?: Record<string, unknown>;
}

export interface CreateAppointmentInput {
  patientId: string;
  title: string;
  appointmentAt: string;
  durationMinutes?: number;
  notes?: string;
  telehealth?: boolean;
}

export interface CreateAppointmentBillingInput {
  amountCents: number;
  description: string;
  paymentProvider?: string;
}

export interface AppointmentAnalyticsQuery {
  dateFrom?: string;
  dateTo?: string;
  professionalId?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  dependencies: {
    databaseConfigured: boolean;
    prismaClientReady: boolean;
    redisConfigured: boolean;
    storageConfigured: boolean;
    oidcConfigured: boolean;
    signatureConfigured: boolean;
  };
}

export interface PatientDetail extends PatientSummary {
  birthDate?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface HistoryResponse {
  items: ClinicalDocument[];
  filters: string[];
}

export interface PatientHistoryResponse {
  patientId: string;
  items: ClinicalDocument[];
}

export interface DocumentPdfPreview {
  documentId: string;
  title: string;
  documentType: string;
  documentStatus: string;
  layoutVersion: string;
  payloadHash?: string | null;
  issuedAt?: string | null;
  previewMode: "artifact" | "draft";
  previewUrl?: string | null;
  status: string;
  artifact?: {
    id: string;
    storageKey: string;
    sha256: string;
    createdAt: string;
  } | null;
  sections: Array<{
    title: string;
    lines: string[];
  }>;
}

export interface DeliveryEmailResponse {
  documentId: string;
  channel: string;
  target: string;
  status: string;
}

export interface ShareLinkResponse {
  documentId: string;
  url: string;
  status: string;
  expiresAt: string;
  maxUses: number;
}

export interface SharedDocumentResponse {
  tokenId: string;
  purpose: string;
  expiresAt: string;
  remainingUses: number;
  document: {
    id: string;
    title: string;
    type: string;
    status: string;
    issuedAt?: string | null;
    artifact?: {
      id: string;
      storageKey: string;
      sha256: string;
      createdAt: string;
    } | null;
  };
}

export interface CdsOverrideReviewSummary {
  id: string;
  documentId: string;
  organizationId?: string | null;
  status: "pending" | "acknowledged" | "approved" | "rejected";
  justification: string;
  alertCodes: string[];
  resolutionNotes?: string | null;
  requestedByProfessionalId: string;
  reviewedByProfessionalId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureWindowResponse {
  id?: string;
  durationMinutes?: number;
  validUntil?: string;
  active?: boolean;
}

export interface SignDocumentResponse {
  sessionId: string;
  documentId: string;
  status: string;
  issuedAt?: string | null;
  usedWindow: boolean;
  pdfArtifact: {
    id: string;
    storageKey: string;
    sha256: string;
  };
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken?: string
  ) {}

  private withApiPrefix(path: string) {
    return `/api${path}`;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${this.withApiPrefix(path)}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`GET ${path} falhou com status ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${this.withApiPrefix(path)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`POST ${path} falhou com status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${this.withApiPrefix(path)}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`PATCH ${path} falhou com status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  getHealth() {
    return this.get<HealthStatus>("/health");
  }

  register(input: RegisterRequest) {
    return this.post("/auth/register", input);
  }

  login(input: LoginRequest) {
    return this.post<AuthTokens>("/auth/login", input);
  }

  refresh(refreshToken: string) {
    return this.post<AuthTokens>("/auth/refresh", { refreshToken });
  }

  me() {
    return this.get<
      SessionPrincipal & {
        email?: string;
        fullName?: string;
        professionalProfile?: ProfessionalProfileSummary;
        organization?: OrganizationSummary | null;
      }
    >("/me");
  }

  listPatients() {
    return this.get<PatientSummary[]>("/patients");
  }

  listAppointments() {
    return this.get<Appointment[]>("/appointments");
  }

  getAppointmentSummary() {
    return this.get<AppointmentSummary>("/appointments/summary");
  }

  getAppointmentOperations() {
    return this.get<AppointmentOperationsSnapshot>("/appointments/operations");
  }

  getAppointmentAnalytics(query?: AppointmentAnalyticsQuery) {
    return this.get<AppointmentAnalyticsSnapshot>(
      `/appointments/analytics${buildQueryString(query)}`
    );
  }

  runAppointmentMaintenance() {
    return this.post<AppointmentMaintenanceRunSummary>(
      "/appointments/operations/run-maintenance",
      {}
    );
  }

  createAppointment(input: CreateAppointmentInput) {
    return this.post<Appointment>("/appointments", input);
  }

  updateAppointmentStatus(
    id: string,
    input: {
      status: Appointment["status"];
      notes?: string;
    }
  ) {
    return this.patch<Appointment>(`/appointments/${id}/status`, input);
  }

  listAppointmentReminders(id: string) {
    return this.get<AppointmentReminder[]>(`/appointments/${id}/reminders`);
  }

  listAppointmentBilling(id: string) {
    return this.get<AppointmentBilling[]>(`/appointments/${id}/billing`);
  }

  createAppointmentBilling(id: string, input: CreateAppointmentBillingInput) {
    return this.post<AppointmentBilling>(`/appointments/${id}/billing`, input);
  }

  authorizeAppointmentBilling(id: string, billingId: string) {
    return this.post<AppointmentBilling>(
      `/appointments/${id}/billing/${billingId}/authorize`,
      {}
    );
  }

  markAppointmentBillingPaid(id: string, billingId: string) {
    return this.post<AppointmentBilling>(
      `/appointments/${id}/billing/${billingId}/pay`,
      {}
    );
  }

  createAppointmentBillingCheckout(id: string, billingId: string) {
    return this.post<AppointmentBilling>(
      `/appointments/${id}/billing/${billingId}/checkout`,
      {}
    );
  }

  reconcileAppointmentBilling(
    id: string,
    billingId: string,
    input: {
      status: "authorized" | "paid" | "cancelled" | "refunded";
    }
  ) {
    return this.post<AppointmentBilling>(
      `/appointments/${id}/billing/${billingId}/reconcile`,
      input
    );
  }

  createTelehealthRoom(id: string) {
    return this.post<Appointment>(`/appointments/${id}/telehealth/room`, {});
  }

  createAppointmentReminder(
    id: string,
    input: {
      channel: "email" | "sms" | "whatsapp";
      scheduledFor: string;
      message?: string;
    }
  ) {
    return this.post<AppointmentReminder>(`/appointments/${id}/reminders`, input);
  }

  sendAppointmentReminder(id: string, reminderId: string) {
    return this.post<AppointmentReminder>(`/appointments/${id}/reminders/${reminderId}/send`, {});
  }

  retryAppointmentReminder(id: string, reminderId: string) {
    return this.post<AppointmentReminder>(`/appointments/${id}/reminders/${reminderId}/retry`, {});
  }

  getPatient(id: string) {
    return this.get<PatientDetail | null>(`/patients/${id}`);
  }

  updatePatientClinicalProfile(id: string, input: PatientClinicalProfile) {
    return this.patch<PatientClinicalProfile>(`/patients/${id}/clinical-profile`, input);
  }

  listDocuments() {
    return this.get<ClinicalDocument[]>("/documents");
  }

  getDocument(id: string) {
    return this.get<ClinicalDocument>(`/documents/${id}`);
  }

  duplicateDocument(id: string) {
    return this.post<ClinicalDocument>(`/documents/${id}/duplicate`, {});
  }

  getDocumentPdf(id: string) {
    return this.get<DocumentPdfPreview>(`/documents/${id}/pdf`);
  }

  createSignatureSession(documentId: string, provider: string) {
    return this.post("/signature/sessions", {
      documentId,
      provider
    });
  }

  createSignatureWindow(durationMinutes: number) {
    return this.post<SignatureWindowResponse>("/signature/windows", {
      durationMinutes
    });
  }

  getActiveSignatureWindow() {
    return this.get<SignatureWindowResponse>("/signature/windows/active");
  }

  signDocument(id: string, provider?: string) {
    return this.post<SignDocumentResponse>(`/documents/${id}/sign`, {
      provider
    });
  }

  listDocumentSignatures(id: string) {
    return this.get<
      Array<{
        id: string;
        provider: string;
        signatureLevel?: string | null;
        policyVersion?: string | null;
        status: string;
        signedAt?: string | null;
        expiresAt?: string | null;
        providerReference?: string | null;
        evidence?: Record<string, unknown> | null;
        createdAt: string;
      }>
    >(`/documents/${id}/signatures`);
  }

  deliverDocumentByEmail(id: string, email: string) {
    return this.post<DeliveryEmailResponse>(`/documents/${id}/deliver/email`, { email });
  }

  createShareLink(id: string) {
    return this.post<ShareLinkResponse>(`/documents/${id}/deliver/share-link`, {});
  }

  revokeShareLinks(id: string) {
    return this.post<{ documentId: string; revoked: number }>(
      `/delivery/documents/${id}/share-links/revoke`,
      {}
    );
  }

  getHistory() {
    return this.get<HistoryResponse>("/history");
  }

  getPatientHistory(id: string) {
    return this.get<PatientHistoryResponse>(`/patients/${id}/history`);
  }

  createPrescription(input: CreatePrescriptionInput) {
    return this.post<ClinicalDocument>("/documents/prescriptions", input);
  }

  createExamRequest(input: CreateExamRequestInput) {
    return this.post<ClinicalDocument>("/documents/exam-requests", input);
  }

  createMedicalCertificate(input: CreateMedicalCertificateInput) {
    return this.post<ClinicalDocument>("/documents/certificates", input);
  }

  createFreeDocument(input: CreateFreeDocumentInput) {
    return this.post<ClinicalDocument>("/documents/free", input);
  }

  createPrescriptionQuote(documentId: string) {
    return this.post<PharmacyQuote>(`/pharmacy/prescriptions/${documentId}/quote`, {});
  }

  createPrescriptionOrder(documentId: string) {
    return this.post<PharmacyOrder>(`/pharmacy/prescriptions/${documentId}/orders`, {});
  }

  getPharmacyOrder(orderId: string) {
    return this.get<PharmacyOrder>(`/pharmacy/orders/${orderId}`);
  }

  syncPharmacyOrder(orderId: string) {
    return this.post<PharmacyOrder>(`/pharmacy/orders/${orderId}/sync`, {});
  }

  listPendingCdsOverrideReviews() {
    return this.get<CdsOverrideReviewSummary[]>("/documents/override-reviews");
  }

  resolveCdsOverrideReview(
    reviewId: string,
    input: {
      decision: "acknowledged" | "approved" | "rejected";
      resolutionNotes?: string;
    }
  ) {
    return this.post<CdsOverrideReviewSummary>(
      `/documents/override-reviews/${reviewId}/resolve`,
      input
    );
  }

  syncSignatureSession(sessionId: string) {
    return this.post<{
      sessionId: string;
      status: string;
      issuedAt?: string | null;
      providerStatus?: string;
      providerReference?: string | null;
      pdfArtifact?: {
        id: string;
        storageKey: string;
        sha256: string;
      };
    }>(`/signature/sessions/${sessionId}/sync`, {});
  }

  listTemplates() {
    return this.get<TemplateSummary[]>("/templates");
  }

  createTemplate(input: CreateTemplateInput) {
    return this.post<TemplateSummary>("/templates", input);
  }

  listTemplateFavorites() {
    return this.get<TemplateFavoriteSummary[]>("/templates/favorites");
  }

  saveTemplateFavorite(input: {
    presetKey: string;
    label?: string;
    category?: string;
    templateId?: string;
  }) {
    return this.post<TemplateFavoriteSummary>("/templates/favorites", input);
  }

  async removeTemplateFavorite(presetKey: string) {
    const response = await fetch(
      `${this.baseUrl}${this.withApiPrefix(`/templates/favorites/${encodeURIComponent(presetKey)}`)}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`DELETE /templates/favorites/${presetKey} falhou com status ${response.status}`);
    }

    return response.json() as Promise<{ removed: boolean; presetKey: string }>;
  }

  private getAuthHeaders() {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers.authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }
}

function buildQueryString(
  query?: Record<string, string | undefined> | AppointmentAnalyticsQuery
) {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
