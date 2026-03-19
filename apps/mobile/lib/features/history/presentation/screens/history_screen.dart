import 'package:flutter/material.dart';

import '../../../../shared/models/clinical_document_summary.dart';
import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<ClinicalDocumentSummary> items = const [];
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
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final session = SessionScope.of(context).session;

    if (session == null) {
      setState(() {
        items = const [];
        loading = false;
        error = 'Sessao nao autenticada.';
      });
      return;
    }

    try {
      final api = MobileApiClient(accessToken: session.accessToken);
      final result = await api.getHistory();

      if (!mounted) {
        return;
      }

      setState(() {
        items = result;
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
      title: 'Historico',
      subtitle: 'Consulta geral de documentos com filtros, download, reenvio e duplicacao.',
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
        else if (items.isEmpty)
          const Text('Nenhum documento encontrado no historico.')
        else
          ...items.map(
            (document) => Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              child: ListTile(
                title: Text(document.title),
                subtitle: Text(
                  '${document.type} • ${document.status}\nPaciente: ${document.patientId}',
                ),
                isThreeLine: true,
              ),
            ),
          ),
      ],
    );
  }
}
