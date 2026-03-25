import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";

import { ResourceAccessService } from "../access/resource-access.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { ensureRecentStepUp } from "../auth/step-up.util";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ComplianceService } from "./compliance.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller("compliance")
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly resourceAccessService: ResourceAccessService
  ) {}

  @RequireRoles("professional", "admin", "compliance")
  @Get("policies")
  listPolicies(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.complianceService.listPoliciesForPrincipal(principal);
  }

  @RequireRoles("professional", "admin", "compliance")
  @Get("policies/:documentType")
  getPolicy(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("documentType") documentType: string
  ) {
    return this.complianceService.getPolicyForPrincipal(documentType as never, principal);
  }

  @RequireRoles("admin", "compliance")
  @Get("retention")
  getRetentionPolicy(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.complianceService.getRetentionPolicySnapshot(principal.organizationId);
  }

  @RequireRoles("admin", "compliance")
  @Get("retention/operations")
  getRetentionOperations(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.complianceService.getRetentionOperationsSummary(principal);
  }

  @RequireRoles("admin", "compliance")
  @Get("analytics/anonymized")
  getAnonymizedAnalytics(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Query()
    query?: {
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    return this.complianceService.getAnonymizedAnalyticsSnapshot(principal, query);
  }

  @RequireRoles("professional", "admin", "compliance")
  @Get("patients/:patientId/consents")
  async listPatientConsents(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("patientId") patientId: string
  ) {
    await this.resourceAccessService.assertPatientAccess(
      principal,
      patientId,
      "patient_consent_list"
    );
    return this.complianceService.listPatientConsents(patientId, principal);
  }

  @RequireRoles("professional", "admin", "compliance")
  @Post("patients/:patientId/consents")
  async createPatientConsent(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("patientId") patientId: string,
    @Body()
    input: {
      consentType: "external_document_share" | "communication" | "analytics" | "optional_services";
      purpose: string;
      legalBasis: string;
      expiresAt?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    ensureRecentStepUp(principal, "create_patient_consent");
    await this.resourceAccessService.assertPatientAccess(
      principal,
      patientId,
      "patient_consent_create"
    );
    return this.complianceService.createPatientConsent(patientId, principal, input);
  }

  @RequireRoles("professional", "admin", "compliance")
  @Post("patients/:patientId/consents/:consentId/revoke")
  async revokePatientConsent(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("patientId") patientId: string,
    @Param("consentId") consentId: string,
    @Body() input: { reason?: string }
  ) {
    ensureRecentStepUp(principal, "revoke_patient_consent");
    await this.resourceAccessService.assertPatientAccess(
      principal,
      patientId,
      "patient_consent_revoke"
    );
    return this.complianceService.revokePatientConsent(patientId, consentId, input, principal);
  }

  @RequireRoles("admin", "compliance")
  @Get("retention/reviews")
  listRetentionReviews(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Query() query?: { status?: "pending" | "approved" | "rejected" | "executed" }
  ) {
    return this.complianceService.listRetentionReviews(principal, query);
  }

  @RequireRoles("admin", "compliance")
  @Post("retention/reviews/run")
  runRetentionReviewSweep(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body() input?: { limit?: number }
  ) {
    return this.complianceService.runRetentionReviewSweep(principal, input);
  }

  @RequireRoles("admin", "compliance")
  @Post("retention/reviews/:reviewId/resolve")
  resolveRetentionReview(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("reviewId") reviewId: string,
    @Body()
    input: {
      decision: "approved" | "rejected" | "executed";
      resolutionNotes?: string;
    }
  ) {
    ensureRecentStepUp(principal, "resolve_retention_review");
    return this.complianceService.resolveRetentionReview(reviewId, principal, input);
  }
}
