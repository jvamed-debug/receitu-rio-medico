import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AUTH_PRINCIPAL_KEY } from "./auth.constants";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const principal = request[AUTH_PRINCIPAL_KEY] as { roles?: string[] } | undefined;
    const roles = principal?.roles ?? [];

    const allowed = requiredRoles.some((role) => roles.includes(role));

    if (!allowed) {
      throw new ForbiddenException("Perfil sem permissao para esta operacao");
    }

    return true;
  }
}
