import 'package:flutter/material.dart';

import '../../../../app/app.dart';
import '../../../../shared/models/patient_summary.dart';
import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({super.key});

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen> {
  List<PatientSummary> patients = const [];
  bool loading = true;
  bool initialized = false;
  String? error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (initialized) {
      return;
    }

    initialized = true;
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    final session = SessionScope.of(context).session;

    if (session == null) {
      setState(() {
        patients = const [];
        loading = false;
        error = 'Sessao nao autenticada.';
      });
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
      title: 'Pacientes',
      subtitle: 'Busca, cadastro resumido e acesso a linha do tempo individual.',
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
        else if (patients.isEmpty)
          const Text('Nenhum paciente encontrado.')
        else
          ...patients.map(
            (patient) => Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              child: ListTile(
                title: Text(patient.fullName),
                subtitle: Text(
                  'CPF: ${patient.cpf ?? 'nao informado'}\nCNS: ${patient.cns ?? 'nao informado'}',
                ),
                isThreeLine: true,
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pushNamed(
                  context,
                  AppRoutes.patientDetail,
                  arguments: patient.id,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
