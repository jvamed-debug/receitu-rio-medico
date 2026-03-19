import 'package:flutter/material.dart';

import '../../../../app/app.dart';
import '../../../../shared/models/clinical_document_summary.dart';
import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/info_card.dart';
import '../../../../shared/widgets/session_scope.dart';

class DocumentsHomeScreen extends StatefulWidget {
  const DocumentsHomeScreen({super.key});

  @override
  State<DocumentsHomeScreen> createState() => _DocumentsHomeScreenState();
}

class _DocumentsHomeScreenState extends State<DocumentsHomeScreen> {
  List<ClinicalDocumentSummary> documents = const [];
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
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    final session = SessionScope.of(context).session;

    if (session == null) {
      setState(() {
        documents = const [];
        loading = false;
        error = 'Sessao nao autenticada.';
      });
      return;
    }

    try {
      final api = MobileApiClient(accessToken: session.accessToken);
      final result = await api.listDocuments();

      if (!mounted) {
        return;
      }

      setState(() {
        documents = result;
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
    final actions = [
      ('Prescricao', AppRoutes.prescription),
      ('Exames', AppRoutes.examRequest),
      ('Atestado', AppRoutes.certificate),
      ('Documento livre', AppRoutes.freeDocument),
      ('Templates', AppRoutes.templates),
    ];

    return FeatureScaffold(
      title: 'Documentos',
      subtitle: 'Hub mobile para emissao, revisao, PDF e compartilhamento seguro.',
      children: [
        const InfoCard(
          title: 'Fluxos do MVP',
          items: [
            'Prescricao medicamentosa',
            'Solicitacao de exames',
            'Atestado medico',
            'Documento livre com metadados minimos',
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: actions
              .map(
                (action) => FilledButton(
                  onPressed: () => Navigator.pushNamed(context, action.$2),
                  child: Text(action.$1),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 20),
        Text(
          'Documentos registrados',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
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
        else if (documents.isEmpty)
          const Text('Nenhum documento encontrado.')
        else
          ...documents.map(
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
                trailing: IconButton(
                  icon: const Icon(Icons.copy_outlined),
                  onPressed: () async {
                    final session = SessionScope.of(context).session;

                    if (session == null) {
                      return;
                    }

                    final api = MobileApiClient(accessToken: session.accessToken);
                    await api.duplicateDocument(document.id);

                    if (!mounted) {
                      return;
                    }

                    await _loadDocuments();
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }
}
