import 'package:flutter/material.dart';

import '../../../../app/app.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/info_card.dart';
import '../../../../shared/widgets/session_scope.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final documentNumberController = TextEditingController();
  final councilTypeController = TextEditingController(text: 'CRM');
  final councilStateController = TextEditingController(text: 'SP');
  final specialtyController = TextEditingController();
  final cboController = TextEditingController();
  final cnesController = TextEditingController();
  String? message;
  String? error;
  bool initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (initialized) {
      return;
    }

    final session = SessionScope.of(context).session;
    final profile = session?.professionalProfile ?? const <String, dynamic>{};

    documentNumberController.text = (profile['documentNumber'] as String?) ?? '';
    councilTypeController.text = (profile['councilType'] as String?) ?? 'CRM';
    councilStateController.text = (profile['councilState'] as String?) ?? 'SP';
    specialtyController.text = (profile['specialty'] as String?) ?? '';
    cboController.text = (profile['cbo'] as String?) ?? '';
    cnesController.text = (profile['cnes'] as String?) ?? '';
    initialized = true;
  }

  @override
  void dispose() {
    documentNumberController.dispose();
    councilTypeController.dispose();
    councilStateController.dispose();
    specialtyController.dispose();
    cboController.dispose();
    cnesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sessionController = SessionScope.of(context);
    final session = sessionController.session;
    final profile = session?.professionalProfile ?? const <String, dynamic>{};

    return FeatureScaffold(
      title: 'Onboarding profissional',
      subtitle:
          'Jornada inicial do profissional para habilitacao regulatoria e readiness de assinatura.',
      children: [
        InfoCard(
          title: 'Estado atual',
          items: [
            'Usuario: ${session?.email ?? 'nao autenticado'}',
            'Status profissional: ${(profile['status'] as String?) ?? 'desconhecido'}',
            'Preencha conselho, especialidade e identificadores',
            'Depois siga para assinatura digital',
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: documentNumberController,
          decoration: const InputDecoration(
            labelText: 'Numero profissional',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: councilTypeController,
          decoration: const InputDecoration(
            labelText: 'Conselho',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: councilStateController,
          decoration: const InputDecoration(
            labelText: 'UF do conselho',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: specialtyController,
          decoration: const InputDecoration(
            labelText: 'Especialidade',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: cboController,
          decoration: const InputDecoration(
            labelText: 'CBO',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: cnesController,
          decoration: const InputDecoration(
            labelText: 'CNES',
            border: OutlineInputBorder(),
          ),
        ),
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(
            error!,
            style: const TextStyle(
              color: Color(0xFFB42318),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
        if (message != null) ...[
          const SizedBox(height: 12),
          Text(
            message!,
            style: const TextStyle(
              color: Color(0xFF0A7F5A),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: sessionController.isBusy || session == null
              ? null
              : () async {
                  setState(() {
                    error = null;
                    message = null;
                  });

                  try {
                    await sessionController.updateProfessionalProfile({
                      'documentNumber': documentNumberController.text,
                      'councilType': councilTypeController.text,
                      'councilState': councilStateController.text,
                      'specialty': specialtyController.text,
                      'cbo': cboController.text,
                      'cnes': cnesController.text,
                      'status': 'ACTIVE',
                    });

                    setState(() {
                      message = 'Perfil profissional atualizado.';
                    });
                  } catch (submitError) {
                    setState(() {
                      error = submitError.toString();
                    });
                  }
                },
          child: Text(sessionController.isBusy ? 'Salvando...' : 'Salvar perfil'),
        ),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, AppRoutes.signaturePanel),
          child: const Text('Ir para assinatura'),
        ),
      ],
    );
  }
}
