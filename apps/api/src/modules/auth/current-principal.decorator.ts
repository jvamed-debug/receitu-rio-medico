import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { AUTH_PRINCIPAL_KEY } from "./auth.constants";

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request[AUTH_PRINCIPAL_KEY];
  }
);
