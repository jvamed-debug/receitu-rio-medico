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

export type ReminderProviderReadinessResult = {
  mode: "mock" | "remote";
  checkedAt: string;
  configured: boolean;
  capabilities: {
    dispatch: boolean;
    deliveryCallbackSupport: boolean;
  };
  connectivity: {
    status: "mock" | "ok" | "degraded" | "unavailable";
    httpStatus?: number;
  };
  issues: string[];
  metadata: Record<string, unknown>;
};
