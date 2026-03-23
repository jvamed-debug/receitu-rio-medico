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
  createdAt: string;
  updatedAt: string;
  patientName?: string;
}
