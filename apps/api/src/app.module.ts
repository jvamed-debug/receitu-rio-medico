import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuditModule } from "./modules/audit/audit.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandingModule } from "./modules/branding/branding.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { HealthModule } from "./modules/health/health.module";
import { HistoryModule } from "./modules/history/history.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { PharmacyModule } from "./modules/pharmacy/pharmacy.module";
import { ProfessionalsModule } from "./modules/professionals/professionals.module";
import { ObservabilityModule } from "./modules/observability/observability.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { RequestContextMiddleware } from "./modules/observability/request-context.middleware";
import { SignatureModule } from "./modules/signature/signature.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { PersistenceModule } from "./persistence/persistence.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PersistenceModule,
    HealthModule,
    AuthModule,
    ObservabilityModule,
    OrganizationsModule,
    AppointmentsModule,
    ProfessionalsModule,
    PatientsModule,
    PharmacyModule,
    ComplianceModule,
    DocumentsModule,
    TemplatesModule,
    SignatureModule,
    HistoryModule,
    AuditModule,
    DeliveryModule,
    BrandingModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
