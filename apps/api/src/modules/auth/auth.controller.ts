import { Body, Controller, Get, Headers, Patch, Post } from "@nestjs/common";

import { AuthService } from "./auth.service";
import {
  BiometricEnrollmentInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  StepUpInput
} from "./auth.types";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/register")
  register(@Body() input: RegisterInput) {
    return this.authService.register(input);
  }

  @Post("auth/login")
  login(@Body() input: LoginInput) {
    return this.authService.login(input);
  }

  @Post("auth/refresh")
  refresh(@Body() input: RefreshInput) {
    return this.authService.refresh(input);
  }

  @Post("auth/step-up")
  stepUp(
    @Headers("authorization") authorization: string | undefined,
    @Body() input: StepUpInput
  ) {
    return this.authService.stepUp(authorization, input);
  }

  @Post("auth/biometric/enroll")
  enrollBiometric(@Body() input: BiometricEnrollmentInput) {
    return this.authService.enrollBiometric(input);
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    return this.authService.me(authorization);
  }

  @Patch("me/professional-profile")
  updateProfessionalProfile(
    @Headers("authorization") authorization: string | undefined,
    @Body() input: Record<string, unknown>
  ) {
    return this.authService.updateProfessionalProfile(authorization, input);
  }

  @Post("me/signature-methods")
  createSignatureMethod(
    @Headers("authorization") authorization: string | undefined,
    @Body() input: Record<string, unknown>
  ) {
    return this.authService.createSignatureMethod(authorization, input);
  }

  @Post("me/organization/switch")
  switchOrganization(
    @Headers("authorization") authorization: string | undefined,
    @Body() input: { organizationId: string }
  ) {
    return this.authService.switchOrganization(authorization, input.organizationId);
  }
}
