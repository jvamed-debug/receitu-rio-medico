export interface MedicationRequestEnvelope {
  resourceType: "MedicationRequest";
  status: string;
  intent: "order";
  subject: {
    reference: string;
  };
  requester: {
    reference: string;
  };
}

