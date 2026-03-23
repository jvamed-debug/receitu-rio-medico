import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SignatureService } from "./signature.service";

@Controller("signature/providers")
export class SignatureProviderCallbackController {
  constructor(
    private readonly signatureService: SignatureService,
    private readonly configService: ConfigService
  ) {}

  @Post("callback")
  receiveCallback(
    @Headers("x-signature-callback-secret") secret: string | undefined,
    @Body()
    input: {
      sessionId: string;
      status: "signed" | "failed";
      externalReference?: string;
      signedAt?: string;
      evidence?: Record<string, unknown>;
    }
  ) {
    const expectedSecret =
      this.configService.get<string>("SIGNATURE_PROVIDER_CALLBACK_SECRET") ??
      "receituario-signature-callback";

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException("Callback de assinatura nao autorizado");
    }

    return this.signatureService.handleProviderCallback(input);
  }
}
