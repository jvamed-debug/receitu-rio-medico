export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  organizationId?: string;
  title: string;
  status: AppointmentStatus;
  appointmentAt: string;
  durationMinutes: number;
  notes?: string;
  telehealth: boolean;
  telehealthUrl?: string;
  telehealthProvider?: string;
  telehealthRoomId?: string;
  billingEntries?: AppointmentBilling[];
  createdAt: string;
  updatedAt: string;
  patientName?: string;
}

export type AppointmentReminderStatus = "pending" | "sent" | "failed" | "cancelled";

export interface AppointmentReminder {
  id: string;
  appointmentId: string;
  channel: "email" | "sms" | "whatsapp";
  status: AppointmentReminderStatus;
  target?: string;
  scheduledFor: string;
  sentAt?: string;
  nextAttemptAt?: string;
  attemptCount: number;
  lastError?: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentBillingStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "cancelled"
  | "refunded";

export interface AppointmentBilling {
  id: string;
  appointmentId: string;
  status: AppointmentBillingStatus;
  amountCents: number;
  currency: string;
  description: string;
  paymentProvider?: string;
  externalReference?: string;
  checkoutUrl?: string;
  authorizedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentSummary {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  telehealth: number;
  remindersPending: number;
  billingPendingCount: number;
  billingAuthorizedCount: number;
  billingPaidCount: number;
  billingPendingCents: number;
  billingAuthorizedCents: number;
  billingPaidCents: number;
}

export interface AppointmentBillingWebhookEventSummary {
  id: string;
  appointmentId: string;
  billingId: string;
  eventId?: string;
  providerReference?: string;
  status: AppointmentBillingStatus;
  resultStatus?: string;
  processedAt?: string;
  createdAt: string;
}

export interface AppointmentOperationsSnapshot {
  failedReminders: number;
  remindersAwaitingRetry: number;
  webhookFailures: number;
  pendingWebhookProcessing: number;
  recentWebhookEvents: AppointmentBillingWebhookEventSummary[];
}
