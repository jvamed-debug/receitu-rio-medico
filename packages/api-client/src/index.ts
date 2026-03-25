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
  PharmacyOperationsSnapshot,
  PharmacyProviderReadinessResponse,
  PharmacyQuote,
  PatientClinicalEvent,
  PatientEncounter,
  PatientEvolution,
  PatientProblem,
  PatientTimelineEntry
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
  PharmacyOperationsSnapshot,
  PharmacyProviderReadinessResponse,
  PharmacyQuote,
  PatientClinicalEvent,
  PatientEncounter,
  PatientEvolution,
  PatientProblem,
  PatientTimelineEntry
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
  scope: "personal" | "institutional";
  lifecycleStatus: "draft" | "pending_review" | "published" | "archived";
  organizationId?: string | null;
  createdByUserId?: string | null;
  reviewedByUserId?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
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

export interface OrganizationMembershipSummary {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  professionalId: string;
  professionalName: string;
  professionalEmail?: string;
  membershipRole: string;
  status: "active" | "suspended" | "removed";
  isDefault: boolean;
  invitedByUserId?: string | null;
  deactivatedAt?: string | null;
  createdAt: string;
}

export interface OrganizationInvitationSummary {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  email: string;
  membershipRole: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedByUserId?: string | null;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  membershipRole?: string;
  memberCount: number;
  professionalCount: number;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  documentSharePolicy: {
    maxUsesDefault: number;
    expirationHoursDefault: number;
    allowHighRiskExternalShare: boolean;
  };
  documentPolicyMatrix: Record<
    "prescription" | "exam-request" | "medical-certificate" | "free-document",
    {
      allowExternalShare: boolean;
      requireRqe: boolean;
      minimumShareRole: "professional" | "admin" | "compliance";
      requirePatientConsentForExternalShare: boolean;
      shareLinkTtlHours: number;
      shareLinkMaxUses: number;
    }
  >;
  overridePolicy: {
    minimumReviewerRole: "professional" | "admin" | "compliance";
    requireInstitutionalReviewForHighSeverity: boolean;
    requireInstitutionalReviewForModerateInteraction: boolean;
    autoAcknowledgePrivilegedOverride: boolean;
  };
  lgpdPolicy: {
    requireConsentForExternalShare: boolean;
    requireDisposalApproval: boolean;
    retentionReviewWindowDays: number;
  };
  brandingPolicy: {
    allowCustomLogo: boolean;
    lockedLayoutVersion?: string;
  };
}

export interface PatientConsentRecordSummary {
  id: string;
  patientId: string;
  organizationId?: string | null;
  professionalId: string;
  consentType: "external_document_share" | "communication" | "analytics" | "optional_services";
  status: "granted" | "revoked" | "expired";
  purpose: string;
  legalBasis: string;
  grantedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRetentionReviewSummary {
  id: string;
  documentId: string;
  organizationId?: string | null;
  documentType: string;
  retentionCategory: string;
  reviewType: "archive" | "disposal";
  status: "pending" | "approved" | "rejected" | "executed";
  dueAt: string;
  rationale?: string | null;
  requestedByUserId?: string | null;
  resolvedByUserId?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalDocumentAnalyticsSnapshot {
  range: {
    dateFrom?: string;
    dateTo?: string;
  };
  total: number;
  signed: number;
  issued: number;
  delivered: number;
  funnel: {
    createdToSignedRate: number;
    signedToIssuedRate: number;
    issuedToDeliveredRate: number;
  };
  byType: Array<{
    type: string;
    total: number;
    signed: number;
    issued: number;
    delivered: number;
  }>;
  byStatus: Array<{
    status: string;
    total: number;
  }>;
  recentDays: Array<{
    day: string;
    created: number;
    issued: number;
    delivered: number;
  }>;
  organizations: Array<{
    organizationId?: string;
    organizationName?: string;
    total: number;
    signed: number;
    issued: number;
    delivered: number;
  }>;
  cohorts: Array<{
    cohort: string;
    total: number;
    signed: number;
    issued: number;
    delivered: number;
  }>;
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
  treatmentIntent?: "acute" | "continuous" | "tapering" | "supportive";
  followUpInstructions?: string;
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
  indication?: string;
  priority?: "routine" | "urgent" | "stat";
  context?: CreatePrescriptionInput["context"];
}

export interface CreateMedicalCertificateInput {
  patientId: string;
  title: string;
  purpose: string;
  restDays?: number;
  observations?: string;
  certificateKind?: "attendance" | "rest" | "accompaniment" | "fitness";
  workRestrictionNotes?: string;
  fitToReturnDate?: string;
  context?: CreatePrescriptionInput["context"];
}

export interface CreateFreeDocumentInput {
  patientId: string;
  title: string;
  body: string;
  documentKind?: "clinical-report" | "referral" | "declaration" | "opinion";
  audience?: "patient" | "employer" | "insurer" | "specialist" | "general";
  closingStatement?: string;
  context?: CreatePrescriptionInput["context"];
}

export interface CreateTemplateInput {
  name: string;
  type: "prescription" | "exam-request" | "medical-certificate" | "free-document";
  scope?: "personal" | "institutional";
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

export interface ClinicalDocumentAnalyticsQuery {
  dateFrom?: string;
  dateTo?: string;
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

export interface PatientTimelineResponse {
  patientId: string;
  items: PatientTimelineEntry[];
}

export interface DocumentPdfPreview {
  documentId: string;
  title: string;
  documentType: string;
  documentStatus: string;
  layoutVersion: string;
  payloadVersion: string;
  schemaVersion: string;
  contractVersion: string;
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

export interface SignatureProviderReadinessResponse {
  mode: "mock" | "remote";
  provider: string;
  checkedAt: string;
  configured: boolean;
  callbackVerificationMode: "shared-secret" | "hmac";
  capabilities: {
    createSignature: boolean;
    statusLookup: boolean;
    callbackSupport: boolean;
    hmacVerification: boolean;
  };
  connectivity: {
    status: "mock" | "ok" | "degraded" | "unavailable";
    httpStatus?: number;
  };
  issues: string[];
  metadata: Record<string, unknown>;
}

export interface SignatureOperationsSnapshot {
  checkedAt: string;
  readiness: SignatureProviderReadinessResponse;
  queue: {
    pending: number;
    failed: number;
    signedToday: number;
  };
  recentSessions: Array<{
    id: string;
    documentId: string;
    provider: string;
    status: string;
    providerReference?: string | null;
    createdAt: string;
    signedAt?: string | null;
  }>;
  alerts: string[];
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

  listPatientEncounters(id: string) {
    return this.get<PatientEncounter[]>(`/patients/${id}/encounters`);
  }

  listPatientEvolutions(id: string) {
    return this.get<PatientEvolution[]>(`/patients/${id}/evolutions`);
  }

  listPatientProblems(id: string) {
    return this.get<PatientProblem[]>(`/patients/${id}/problems`);
  }

  listPatientClinicalEvents(id: string) {
    return this.get<PatientClinicalEvent[]>(`/patients/${id}/clinical-events`);
  }

  createPatientEncounter(
    id: string,
    input: {
      type:
        | "consultation"
        | "follow_up"
        | "telehealth"
        | "triage"
        | "procedure"
        | "clinical_note";
      title: string;
      summary?: string;
      notes?: string;
      occurredAt?: string;
    }
  ) {
    return this.post<PatientEncounter>(`/patients/${id}/encounters`, input);
  }

  createPatientEvolution(
    id: string,
    input: {
      encounterId?: string;
      title: string;
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      tags?: string[];
      occurredAt?: string;
    }
  ) {
    return this.post<PatientEvolution>(`/patients/${id}/evolutions`, input);
  }

  createPatientProblem(
    id: string,
    input: {
      title: string;
      status?: "active" | "controlled" | "resolved" | "inactive";
      severity?: string;
      notes?: string;
      tags?: string[];
      onsetDate?: string;
      resolvedAt?: string;
    }
  ) {
    return this.post<PatientProblem>(`/patients/${id}/problems`, input);
  }

  createPatientClinicalEvent(
    id: string,
    input: {
      eventType?:
        | "observation"
        | "lab_result"
        | "vital_sign"
        | "procedure"
        | "incident"
        | "communication"
        | "administrative";
      title: string;
      summary?: string;
      payload?: Record<string, unknown>;
      encounterId?: string;
      evolutionId?: string;
      occurredAt?: string;
    }
  ) {
    return this.post<PatientClinicalEvent>(`/patients/${id}/clinical-events`, input);
  }

  getPatientTimeline(id: string) {
    return this.get<PatientTimelineResponse>(`/patients/${id}/timeline`);
  }

  getClinicalDocumentAnalytics(query?: ClinicalDocumentAnalyticsQuery) {
    return this.get<ClinicalDocumentAnalyticsSnapshot>(
      `/documents/analytics${buildQueryString(query)}`
    );
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

  createPrescriptionQuoteWithRouting(
    documentId: string,
    input: {
      routeStrategy?: "best-value" | "lowest-price" | "fastest";
      preferredPartnerKey?: string;
    }
  ) {
    return this.post<PharmacyQuote>(`/pharmacy/prescriptions/${documentId}/quote`, input);
  }

  createPrescriptionOrder(
    documentId: string,
    input?: {
      routeStrategy?: "best-value" | "lowest-price" | "fastest";
      preferredPartnerKey?: string;
    }
  ) {
    return this.post<PharmacyOrder>(`/pharmacy/prescriptions/${documentId}/orders`, input ?? {});
  }

  getPharmacyOrder(orderId: string) {
    return this.get<PharmacyOrder>(`/pharmacy/orders/${orderId}`);
  }

  getPharmacyProviderReadiness() {
    return this.get<PharmacyProviderReadinessResponse>("/pharmacy/provider/readiness");
  }

  getPharmacyOperations() {
    return this.get<PharmacyOperationsSnapshot>("/pharmacy/operations");
  }

  syncPharmacyOrder(orderId: string) {
    return this.post<PharmacyOrder>(`/pharmacy/orders/${orderId}/sync`, {});
  }

  syncPendingPharmacyOrders(input?: { limit?: number }) {
    return this.post<{ processed: number; results: PharmacyOrder[] }>(
      "/pharmacy/orders/sync-pending",
      input ?? {}
    );
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

  getSignatureProviderReadiness(provider?: string) {
    return this.get<SignatureProviderReadinessResponse>(
      `/signature/provider/readiness${provider ? `?provider=${encodeURIComponent(provider)}` : ""}`
    );
  }

  getSignatureOperations(provider?: string) {
    return this.get<SignatureOperationsSnapshot>(
      `/signature/operations${provider ? `?provider=${encodeURIComponent(provider)}` : ""}`
    );
  }

  listTemplates() {
    return this.get<TemplateSummary[]>("/templates");
  }

  createTemplate(input: CreateTemplateInput) {
    return this.post<TemplateSummary>("/templates", input);
  }

  publishTemplate(id: string) {
    return this.post<TemplateSummary>(`/templates/${id}/publish`, {});
  }

  archiveTemplate(id: string) {
    return this.post<TemplateSummary>(`/templates/${id}/archive`, {});
  }

  listTemplateFavorites() {
    return this.get<TemplateFavoriteSummary[]>("/templates/favorites");
  }

  listMyOrganizations() {
    return this.get<OrganizationSummary[]>("/organizations");
  }

  getCurrentOrganization() {
    return this.get<OrganizationDetail>("/organizations/current");
  }

  listCurrentOrganizationMemberships() {
    return this.get<OrganizationMembershipSummary[]>("/organizations/current/memberships");
  }

  listCurrentOrganizationInvitations() {
    return this.get<OrganizationInvitationSummary[]>("/organizations/current/invitations");
  }

  addOrganizationMembershipByEmail(input: {
    email: string;
    membershipRole?: string;
    isDefault?: boolean;
  }) {
    return this.post<OrganizationMembershipSummary>("/organizations/current/memberships", input);
  }

  createOrganizationInvitation(input: {
    email: string;
    membershipRole?: string;
    expiresAt?: string;
  }) {
    return this.post<OrganizationInvitationSummary>(
      "/organizations/current/invitations",
      input
    );
  }

  updateOrganizationMembership(
    membershipId: string,
    input: {
      membershipRole?: string;
      isDefault?: boolean;
      status?: "active" | "suspended" | "removed";
    }
  ) {
    return this.patch<OrganizationMembershipSummary>(
      `/organizations/current/memberships/${membershipId}`,
      input
    );
  }

  revokeOrganizationInvitation(invitationId: string) {
    return this.post<OrganizationInvitationSummary>(
      `/organizations/current/invitations/${invitationId}/revoke`,
      {}
    );
  }

  switchOrganization(organizationId: string) {
    return this.post<AuthTokens>("/me/organization/switch", { organizationId });
  }

  updateCurrentOrganizationSettings(input: OrganizationSettings) {
    return this.patch<OrganizationDetail>("/organizations/current/settings", input);
  }

  listPatientConsents(patientId: string) {
    return this.get<PatientConsentRecordSummary[]>(`/compliance/patients/${patientId}/consents`);
  }

  createPatientConsent(
    patientId: string,
    input: {
      consentType: "external_document_share" | "communication" | "analytics" | "optional_services";
      purpose: string;
      legalBasis: string;
      expiresAt?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.post<PatientConsentRecordSummary>(`/compliance/patients/${patientId}/consents`, input);
  }

  revokePatientConsent(patientId: string, consentId: string, input?: { reason?: string }) {
    return this.post<PatientConsentRecordSummary>(
      `/compliance/patients/${patientId}/consents/${consentId}/revoke`,
      input ?? {}
    );
  }

  listRetentionReviews(query?: { status?: "pending" | "approved" | "rejected" | "executed" }) {
    return this.get<ComplianceRetentionReviewSummary[]>(
      `/compliance/retention/reviews${buildQueryString(query)}`
    );
  }

  runRetentionReviewSweep(input?: { limit?: number }) {
    return this.post<{ created: number; reviews: ComplianceRetentionReviewSummary[] }>(
      "/compliance/retention/reviews/run",
      input ?? {}
    );
  }

  resolveRetentionReview(
    reviewId: string,
    input: {
      decision: "approved" | "rejected" | "executed";
      resolutionNotes?: string;
    }
  ) {
    return this.post<ComplianceRetentionReviewSummary>(
      `/compliance/retention/reviews/${reviewId}/resolve`,
      input
    );
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
