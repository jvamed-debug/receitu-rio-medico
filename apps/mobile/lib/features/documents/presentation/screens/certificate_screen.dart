import 'package:flutter/material.dart';

import '../../../../shared/models/patient_summary.dart';
import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class CertificateScreen extends StatefulWidget {
  const CertificateScreen({super.key});

  @override
  State<CertificateScreen> createState() => _CertificateScreenState();
}

class _CertificateScreenState extends State<CertificateScreen> {
  final titleController = TextEditingController(text: 'Atestado clinico');
  final purposeController = TextEditingController(text: 'Afastamento laboral');
  final restDaysController = TextEditingController(text: '2');
  final observationsController = TextEditingController(text: 'Repouso domiciliar');
  List<PatientSummary> patients = const [];
  String? selectedPatientId;
  bool loading = true;
  String? error;
  String? message;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    final session = SessionScope.of(context).session;

    if (session == null || !loading) {
      return;
    }

    try {
      final api = MobileApiClient(accessToken: session.accessToken);
      final result = await api.listPatients();

      if (!mounted) {
        return;
      }

      setState(() {
        patients = result;
        selectedPatientId = result.isNotEmpty ? result.first.id : null;
        loading = false;
      });
    } catch (loadError) {
      if (!mounted) {
        return;
      }

      setState(() {
        loading = false;
        error = loadError.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context).session;

    return FeatureScaffold(
      title: 'Novo atestado',
      subtitle: 'Formulario mobile conectado ao backend para criar o rascunho inicial.',
      children: [
        if (loading)
          const Center(child: CircularProgressIndicator())
        else ...[
          DropdownButtonFormField<String>(
            value: selectedPatientId,
            decoration: const InputDecoration(labelText: 'Paciente', border: OutlineInputBorder()),
            items: patients
                .map((patient) => DropdownMenuItem(value: patient.id, child: Text(patient.fullName)))
                .toList(),
            onChanged: (value) => setState(() => selectedPatientId = value),
          ),
          const SizedBox(height: 12),
          _field(titleController, 'Titulo'),
          const SizedBox(height: 12),
          _field(purposeController, 'Finalidade'),
          const SizedBox(height: 12),
          _field(restDaysController, 'Dias de afastamento'),
          const SizedBox(height: 12),
          TextField(
            controller: observationsController,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Observacoes', border: OutlineInputBorder()),
          ),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(error!, style: const TextStyle(color: Color(0xFFB42318), fontWeight: FontWeight.w700)),
          ],
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(message!, style: const TextStyle(color: Color(0xFF0A7F5A), fontWeight: FontWeight.w700)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: session == null || selectedPatientId == null
                ? null
                : () async {
                    try {
                      final api = MobileApiClient(accessToken: session.accessToken);
                      final created = await api.createMedicalCertificate(
                        patientId: selectedPatientId!,
                        title: titleController.text,
                        purpose: purposeController.text,
                        restDays: int.tryParse(restDaysController.text),
                        observations: observationsController.text,
                      );

                      setState(() {
                        message = 'Rascunho ${created.title} criado com sucesso.';
                        error = null;
                      });
                    } catch (submitError) {
                      setState(() {
                        error = submitError.toString();
                        message = null;
                      });
                    }
                  },
            child: const Text('Criar rascunho'),
          ),
        ],
      ],
    );
  }

  Widget _field(TextEditingController controller, String label) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    );
  }
}
