export type ReminderDispatchInput = {
  reminderId: string;
  appointmentId: string;
  channel: "email" | "sms" | "whatsapp";
  target: string;
  message: string;
  scheduledFor: string;
};

export type ReminderDispatchResult = {
  providerReference: string;
  deliveredAt: string;
  providerMetadata: Record<string, unknown>;
};
