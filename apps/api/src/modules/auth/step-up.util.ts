import { ForbiddenException } from "@nestjs/common";

import type { AccessPrincipal } from "./auth.types";

export function ensureRecentStepUp(principal: AccessPrincipal, action: string) {
  if (!principal.stepUpUntil || principal.stepUpUntil <= Date.now()) {
    throw new ForbiddenException(
      `A acao ${action} exige revalidacao recente da sessao`
    );
  }
}
