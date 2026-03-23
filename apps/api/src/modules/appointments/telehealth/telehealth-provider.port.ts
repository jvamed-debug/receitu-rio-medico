export type TelehealthRoomProvisionInput = {
  appointmentId: string;
  professionalId: string;
  patientId: string;
  title: string;
  appointmentAt: string;
  durationMinutes: number;
  existingRoomId?: string | null;
};

export type TelehealthRoomProvisionResult = {
  provider: string;
  roomId: string;
  joinUrl: string;
  metadata: Record<string, unknown>;
};
