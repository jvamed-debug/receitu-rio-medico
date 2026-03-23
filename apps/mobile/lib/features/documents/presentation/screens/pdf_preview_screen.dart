import 'package:flutter/material.dart';

import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class PdfPreviewScreen extends StatefulWidget {
  const PdfPreviewScreen({super.key});

  @override
  State<PdfPreviewScreen> createState() => _PdfPreviewScreenState();
}

class _PdfPreviewScreenState extends State<PdfPreviewScreen> {
  final documentIdController = TextEditingController();
  final durationController = TextEditingController(text: '30');
  String provider = 'ICP_BRASIL_VENDOR';
  String? message;
  String? error;
  Map<String, dynamic>? preview;
  Map<String, dynamic>? activeWindow;

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context).session;

    return FeatureScaffold(
      title: 'Preview do PDF',
      subtitle: 'Tela operacional para preview, janela temporaria e assinatura por documento.',
      children: [
        TextField(
          controller: documentIdController,
          decoration: const InputDecoration(
            labelText: 'Document ID',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: provider,
          decoration: const InputDecoration(
            labelText: 'Provedor',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'ICP_BRASIL_VENDOR', child: Text('ICP-Brasil vendor')),
            DropdownMenuItem(value: 'GOVBR_VENDOR', child: Text('Gov.br vendor')),
          ],
          onChanged: (value) {
            if (value == null) return;
            setState(() => provider = value);
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: durationController,
          decoration: const InputDecoration(
            labelText: 'Janela temporaria (minutos)',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            FilledButton(
              onPressed: session == null
                  ? null
                  : () async {
                      try {
                        final api = MobileApiClient(accessToken: session.accessToken);
                        final result = await api.getDocumentPdf(documentIdController.text);
                        setState(() {
                          preview = result;
                          message = 'Preview carregado.';
                          error = null;
                        });
                      } catch (submitError) {
                        setState(() {
                          error = submitError.toString();
                          message = null;
                        });
                      }
                    },
              child: const Text('Carregar preview'),
            ),
            FilledButton(
              onPressed: session == null
                  ? null
                  : () async {
                      try {
                        final api = MobileApiClient(accessToken: session.accessToken);
                        final result = await api.createSignatureWindow(int.tryParse(durationController.text) ?? 30);
                        setState(() {
                          activeWindow = result;
                          message = 'Janela criada ate ${result['validUntil']}.';
                          error = null;
                        });
                      } catch (submitError) {
                        setState(() {
                          error = submitError.toString();
                          message = null;
                        });
                      }
                    },
              child: const Text('Abrir janela'),
            ),
            FilledButton(
              onPressed: session == null
                  ? null
                  : () async {
                      try {
                        final api = MobileApiClient(accessToken: session.accessToken);
                        final result = await api.signDocument(
                          documentIdController.text,
                          provider: provider,
                        );
                        setState(() {
                          message =
                              'Documento assinado com status ${result['status']}. Janela usada: ${result['usedWindow']}.';
                          error = null;
                        });
                      } catch (submitError) {
                        setState(() {
                          error = submitError.toString();
                          message = null;
                        });
                      }
                    },
              child: const Text('Assinar'),
            ),
          ],
        ),
        if (preview != null) ...[
          const SizedBox(height: 16),
          Text('Documento: ${preview!['title'] ?? 'nao identificado'}'),
          Text('Status: ${preview!['status'] ?? 'desconhecido'}'),
          Text('Layout: ${preview!['layoutVersion'] ?? 'nao informado'}'),
          Text('Payload: ${preview!['payloadVersion'] ?? 'nao informado'}'),
          Text('Schema: ${preview!['schemaVersion'] ?? 'nao informado'}'),
          Text('Contrato: ${preview!['contractVersion'] ?? 'nao informado'}'),
          Text('Modo: ${preview!['previewMode'] ?? 'nao informado'}'),
          Text('Artefato: ${preview!['artifact']?['storageKey'] ?? 'ainda nao emitido'}'),
          Text('Hash: ${preview!['payloadHash'] ?? 'nao calculado'}'),
          const SizedBox(height: 8),
          ...((preview!['sections'] as List<dynamic>? ?? const []).map((section) {
            final item = section as Map<String, dynamic>;
            final lines = (item['lines'] as List<dynamic>? ?? const []).map((line) => '$line').toList();
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['title']?.toString() ?? 'Secao',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  if (lines.isEmpty)
                    const Text('Nenhum conteudo adicional nesta secao.')
                  else
                    ...lines.map(Text.new),
                ],
              ),
            );
          })),
        ],
        if (activeWindow != null) ...[
          const SizedBox(height: 16),
          Text('Janela ativa ate: ${activeWindow!['validUntil'] ?? 'nao disponivel'}'),
        ],
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(error!, style: const TextStyle(color: Color(0xFFB42318), fontWeight: FontWeight.w700)),
        ],
        if (message != null) ...[
          const SizedBox(height: 12),
          Text(message!, style: const TextStyle(color: Color(0xFF0A7F5A), fontWeight: FontWeight.w700)),
        ],
      ],
    );
  }
}
