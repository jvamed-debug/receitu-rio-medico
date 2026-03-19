import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = {
      userId: "user-demo",
      professionalId: "professional-demo",
      roles: ["professional"]
    };
    return true;
  }
}

