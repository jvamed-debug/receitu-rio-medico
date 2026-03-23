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
  authorizedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}
