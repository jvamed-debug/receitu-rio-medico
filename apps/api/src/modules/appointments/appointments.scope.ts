import type { Prisma } from "@prisma/client";

import type { AccessPrincipal } from "../auth/auth.types";

export interface AppointmentAnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  professionalId?: string;
}

export function buildAppointmentScope(
  principal: AccessPrincipal,
  filters?: AppointmentAnalyticsFilters
): Prisma.AppointmentWhereInput | undefined {
  const isPrivileged = principal.roles.some(
    (role) => role === "admin" || role === "compliance"
  );
  const where: Prisma.AppointmentWhereInput = {};

  if (!isPrivileged) {
    where.organizationId = principal.organizationId ?? null;
    where.professionalId = principal.professionalId ?? "__no_access__";
  } else if (filters?.professionalId) {
    where.professionalId = filters.professionalId;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.appointmentAt = {};

    if (filters.dateFrom) {
      where.appointmentAt.gte = new Date(filters.dateFrom);
    }

    if (filters.dateTo) {
      where.appointmentAt.lte = new Date(filters.dateTo);
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}
