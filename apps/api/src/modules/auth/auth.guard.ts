import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";

import { AUTH_PRINCIPAL_KEY } from "./auth.constants";
import { verifyToken } from "./auth.tokens";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      [AUTH_PRINCIPAL_KEY]?: {
        userId: string;
        professionalId?: string;
        roles: string[];
      };
    }>();

    const authorization = request.headers.authorization;
    const token = authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente");
    }

    const payload = verifyToken(
      token,
      process.env.AUTH_TOKEN_SECRET || "receituario-dev-secret"
    );

    if (!payload || payload.type !== "access") {
      throw new UnauthorizedException("Token de acesso invalido");
    }

    request[AUTH_PRINCIPAL_KEY] = {
      userId: payload.sub,
      professionalId: payload.professionalId,
      roles: payload.roles
    };

    return true;
  }
}
