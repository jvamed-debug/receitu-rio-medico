import 'package:flutter/material.dart';

import '../../../../shared/models/patient_summary.dart';
import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class FreeDocumentScreen extends StatefulWidget {
  const FreeDocumentScreen({super.key});

  @override
  State<FreeDocumentScreen> createState() => _FreeDocumentScreenState();
}

class _FreeDocumentScreenState extends State<FreeDocumentScreen> {
  final titleController = TextEditingController(text: 'Documento livre');
  final bodyController = TextEditingController(text: 'Texto inicial do documento clinico livre.');
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
      title: 'Documento livre',
      subtitle: 'Formulario mobile conectado ao backend para criar a folha branca.',
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
          TextField(
            controller: titleController,
            decoration: const InputDecoration(labelText: 'Titulo', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: bodyController,
            minLines: 5,
            maxLines: 8,
            decoration: const InputDecoration(labelText: 'Corpo do documento', border: OutlineInputBorder()),
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
                      final created = await api.createFreeDocument(
                        patientId: selectedPatientId!,
                        title: titleController.text,
                        body: bodyController.text,
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
}
