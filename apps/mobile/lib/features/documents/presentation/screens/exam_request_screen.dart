import 'package:flutter/material.dart';

import '../../../../shared/models/patient_summary.dart';
import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class ExamRequestScreen extends StatefulWidget {
  const ExamRequestScreen({super.key});

  @override
  State<ExamRequestScreen> createState() => _ExamRequestScreenState();
}

class _ExamRequestScreenState extends State<ExamRequestScreen> {
  final titleController = TextEditingController(text: 'Exames laboratoriais');
  final examsController = TextEditingController(text: 'Hemograma completo\nGlicemia');
  final notesController = TextEditingController(text: 'Jejum de 8 horas');
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
      title: 'Solicitacao de exames',
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
          TextField(
            controller: examsController,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Exames solicitados',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: notesController,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Preparo e observacoes',
              border: OutlineInputBorder(),
            ),
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
                      final created = await api.createExamRequest(
                        patientId: selectedPatientId!,
                        title: titleController.text,
                        requestedExams: examsController.text
                            .split('\n')
                            .map((item) => item.trim())
                            .where((item) => item.isNotEmpty)
                            .toList(),
                        preparationNotes: notesController.text,
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
