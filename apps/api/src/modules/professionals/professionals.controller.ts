import { Controller, Get } from "@nestjs/common";

@Controller("professionals")
export class ProfessionalsController {
  @Get("status")
  status() {
    return {
      professionalId: "professional-demo",
      status: "pending_validation",
      signatureValidatedAt: null
    };
  }
}

