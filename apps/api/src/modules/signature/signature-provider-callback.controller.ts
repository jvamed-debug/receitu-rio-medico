import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException
} from "@nestjs/common";

import { SignatureProviderGateway } from "./signature-provider.gateway";
import { SignatureService } from "./signature.service";

@Controller("signature/providers")
export class SignatureProviderCallbackController {
  constructor(
    private readonly signatureService: SignatureService,
    private readonly signatureProviderGateway: SignatureProviderGateway
  ) {}

  @Post("callback")
  receiveCallback(
    @Headers("x-signature-callback-secret") secret: string | undefined,
    @Headers("x-signature-callback-timestamp") timestamp: string | undefined,
    @Headers("x-signature-callback-signature") signature: string | undefined,
    @Body()
    input: {
      sessionId: string;
      status: "signed" | "failed";
      externalReference?: string;
      signedAt?: string;
      evidence?: Record<string, unknown>;
    }
  ) {
    const callbackAuthorized = this.signatureProviderGateway.verifyCallback({
      secret,
      timestamp,
      signature,
      payload: input
    });

    if (!callbackAuthorized) {
      throw new UnauthorizedException("Callback de assinatura nao autorizado");
    }

    return this.signatureService.handleProviderCallback(input);
  }
}
