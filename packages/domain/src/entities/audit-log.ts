export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorProfessionalId?: string;
  entityType: string;
  entityId: string;
  action: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  origin: "web" | "mobile" | "system" | "integration";
  occurredAt: string;
}

