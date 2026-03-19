import 'package:flutter/material.dart';

import '../../../../shared/models/clinical_document_summary.dart';
import '../../../../shared/models/patient_summary.dart';
import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class PatientDetailScreen extends StatefulWidget {
  const PatientDetailScreen({super.key});

  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen> {
  PatientSummary? patient;
  List<ClinicalDocumentSummary> history = const [];
  bool loading = true;
  String? error;
  String? patientId;
  bool initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (initialized) {
      return;
    }

    initialized = true;
    patientId = ModalRoute.of(context)?.settings.arguments as String?;
    _loadPatientDetail();
  }

  Future<void> _loadPatientDetail() async {
    final id = patientId;
    final session = SessionScope.of(context).session;

    if (id == null || session == null) {
      setState(() {
        loading = false;
        error = 'Paciente ou sessao indisponivel.';
      });
      return;
    }

    try {
      final api = MobileApiClient(accessToken: session.accessToken);
      final result = await Future.wait([
        api.getPatient(id),
        api.getPatientHistory(id),
      ]);

      if (!mounted) {
        return;
      }

      setState(() {
        patient = result[0] as PatientSummary?;
        history = result[1] as List<ClinicalDocumentSummary>;
        loading = false;
        error = null;
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
    return FeatureScaffold(
      title: 'Perfil do paciente',
      subtitle: 'Linha do tempo individual e reuso seguro de documentos anteriores.',
      children: [
        if (loading)
          const Center(child: CircularProgressIndicator())
        else if (error != null)
          Text(
            error!,
            style: const TextStyle(
              color: Color(0xFFB42318),
              fontWeight: FontWeight.w700,
            ),
          )
        else ...[
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            child: ListTile(
              title: Text(patient?.fullName ?? 'Paciente'),
              subtitle: Text(
                'CPF: ${patient?.cpf ?? 'nao informado'}\n'
                'CNS: ${patient?.cns ?? 'nao informado'}\n'
                'E-mail: ${patient?.email ?? 'nao informado'}',
              ),
              isThreeLine: true,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Historico do paciente',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          if (history.isEmpty)
            const Text('Nenhum documento associado a este paciente.')
          else
            ...history.map(
              (document) => Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: ListTile(
                  title: Text(document.title),
                  subtitle: Text('${document.type} • ${document.status}'),
                ),
              ),
            ),
        ],
      ],
    );
  }
}
