import 'package:flutter/material.dart';

import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/session_scope.dart';
import '../../../../shared/widgets/feature_scaffold.dart';

class TemplatesScreen extends StatefulWidget {
  const TemplatesScreen({super.key});

  @override
  State<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends State<TemplatesScreen> {
  final nameController = TextEditingController();
  String type = 'prescription';
  List<Map<String, dynamic>> templates = const [];
  String? message;
  String? error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _loadTemplates();
  }

  Future<void> _loadTemplates() async {
    final session = SessionScope.of(context).session;
    if (session == null) {
      return;
    }

    try {
      final api = MobileApiClient(accessToken: session.accessToken);
      final result = await api.listTemplates();
      if (!mounted) return;
      setState(() {
        templates = result;
      });
    } catch (loadError) {
      if (!mounted) return;
      setState(() {
        error = loadError.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context).session;

    return FeatureScaffold(
      title: 'Templates',
      subtitle: 'Biblioteca inicial de modelos pessoais, oficiais e organizacionais.',
      children: <Widget>[
        TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Nome do template',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: type,
          decoration: const InputDecoration(
            labelText: 'Tipo documental',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'prescription', child: Text('Prescricao')),
            DropdownMenuItem(value: 'exam-request', child: Text('Solicitacao de exames')),
            DropdownMenuItem(value: 'medical-certificate', child: Text('Atestado')),
            DropdownMenuItem(value: 'free-document', child: Text('Documento livre')),
          ],
          onChanged: (value) {
            if (value == null) return;
            setState(() => type = value);
          },
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: session == null
              ? null
              : () async {
                  try {
                    final api = MobileApiClient(accessToken: session.accessToken);
                    final created = await api.createTemplate(
                      name: nameController.text,
                      type: type,
                      structure: {
                        'description': 'Template base criado no mobile',
                        'createdFrom': 'mobile-ui',
                      },
                    );
                    if (!mounted) return;
                    setState(() {
                      templates = [created, ...templates];
                      nameController.clear();
                      message = 'Template criado com sucesso.';
                      error = null;
                    });
                  } catch (submitError) {
                    if (!mounted) return;
                    setState(() {
                      error = submitError.toString();
                      message = null;
                    });
                  }
                },
          child: const Text('Criar template'),
        ),
        const SizedBox(height: 16),
        if (error != null)
          Text(error!, style: const TextStyle(color: Color(0xFFB42318), fontWeight: FontWeight.w700)),
        if (message != null)
          Text(message!, style: const TextStyle(color: Color(0xFF0A7F5A), fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        if (templates.isEmpty)
          const Text('Nenhum template cadastrado ainda.')
        else
          ...templates.map(
            (template) => Card(
              child: ListTile(
                title: Text('${template['name'] ?? 'Template'}'),
                subtitle: Text(
                  'Tipo: ${template['type'] ?? 'desconhecido'} | Versao: ${template['version'] ?? 1}',
                ),
              ),
            ),
          ),
      ],
    );
  }
}
