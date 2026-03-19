import 'package:flutter/material.dart';

import '../features/auth/application/session_controller.dart';
import '../features/auth/presentation/screens/bootstrap_screen.dart';
import '../features/auth/presentation/screens/login_screen.dart';
import '../features/auth/presentation/screens/onboarding_screen.dart';
import '../features/auth/presentation/screens/signature_panel_screen.dart';
import '../features/documents/presentation/screens/certificate_screen.dart';
import '../features/documents/presentation/screens/delivery_screen.dart';
import '../features/documents/presentation/screens/documents_home_screen.dart';
import '../features/documents/presentation/screens/exam_request_screen.dart';
import '../features/documents/presentation/screens/free_document_screen.dart';
import '../features/documents/presentation/screens/pdf_preview_screen.dart';
import '../features/documents/presentation/screens/prescription_screen.dart';
import '../features/documents/presentation/screens/templates_screen.dart';
import '../features/history/presentation/screens/history_screen.dart';
import '../features/patients/presentation/screens/patient_detail_screen.dart';
import '../features/patients/presentation/screens/patients_screen.dart';
import '../shared/services/secure_session_storage.dart';
import '../shared/widgets/app_shell.dart';
import '../shared/widgets/session_scope.dart';

class AppRoutes {
  static const bootstrap = '/bootstrap';
  static const login = '/login';
  static const onboarding = '/onboarding';
  static const dashboard = '/';
  static const signaturePanel = '/signature-panel';
  static const documents = '/documents';
  static const prescription = '/documents/prescription';
  static const examRequest = '/documents/exam-request';
  static const certificate = '/documents/certificate';
  static const freeDocument = '/documents/free-document';
  static const templates = '/templates';
  static const patients = '/patients';
  static const patientDetail = '/patients/detail';
  static const history = '/history';
  static const pdfPreview = '/pdf-preview';
  static const delivery = '/delivery';
}

class ReceituarioApp extends StatefulWidget {
  const ReceituarioApp({
    super.key,
    this.sessionController,
  });

  final SessionController? sessionController;

  @override
  State<ReceituarioApp> createState() => _ReceituarioAppState();
}

class _ReceituarioAppState extends State<ReceituarioApp> {
  late final SessionController sessionController;

  @override
  void initState() {
    super.initState();
    sessionController =
        widget.sessionController ??
        SessionController(
          storage: SecureSessionStorage(),
        );
  }

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      controller: sessionController,
      child: MaterialApp(
        title: 'Receituario Medico Digital',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0A7F5A)),
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xFFF4F7F5),
          cardTheme: const CardThemeData(
            color: Colors.white,
            elevation: 0,
            margin: EdgeInsets.zero,
          ),
        ),
        initialRoute: AppRoutes.bootstrap,
        routes: {
          AppRoutes.bootstrap: (_) => const BootstrapScreen(),
          AppRoutes.login: (_) => const LoginScreen(),
          AppRoutes.onboarding: (_) => const OnboardingScreen(),
          AppRoutes.dashboard: (_) => const AppShell(),
          AppRoutes.signaturePanel: (_) => const SignaturePanelScreen(),
          AppRoutes.documents: (_) => const DocumentsHomeScreen(),
          AppRoutes.prescription: (_) => const PrescriptionScreen(),
          AppRoutes.examRequest: (_) => const ExamRequestScreen(),
          AppRoutes.certificate: (_) => const CertificateScreen(),
          AppRoutes.freeDocument: (_) => const FreeDocumentScreen(),
          AppRoutes.templates: (_) => const TemplatesScreen(),
          AppRoutes.patients: (_) => const PatientsScreen(),
          AppRoutes.patientDetail: (_) => const PatientDetailScreen(),
          AppRoutes.history: (_) => const HistoryScreen(),
          AppRoutes.pdfPreview: (_) => const PdfPreviewScreen(),
          AppRoutes.delivery: (_) => const DeliveryScreen(),
        },
      ),
    );
  }
}
