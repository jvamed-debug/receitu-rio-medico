import 'package:flutter/material.dart';

import '../../../../shared/services/mobile_api_client.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/session_scope.dart';

class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({super.key});

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  final documentIdController = TextEditingController();
  final emailController = TextEditingController();
  String? message;
  String? error;
  String? shareLink;

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context).session;

    return FeatureScaffold(
      title: 'Entrega e compartilhamento',
      subtitle: 'Tela operacional para envio por e-mail e geracao de link seguro.',
      children: [
        TextField(
          controller: documentIdController,
          decoration: const InputDecoration(
            labelText: 'Document ID',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: emailController,
          decoration: const InputDecoration(
            labelText: 'E-mail de entrega',
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
                        final result = await api.deliverDocumentByEmail(
                          id: documentIdController.text,
                          email: emailController.text,
                        );
                        setState(() {
                          message = 'Entrega registrada com status ${result['status']}.';
                          error = null;
                        });
                      } catch (submitError) {
                        setState(() {
                          error = submitError.toString();
                          message = null;
                        });
                      }
                    },
              child: const Text('Enviar por e-mail'),
            ),
            FilledButton(
              onPressed: session == null
                  ? null
                  : () async {
                      try {
                        final api = MobileApiClient(accessToken: session.accessToken);
                        final result = await api.createShareLink(documentIdController.text);
                        setState(() {
                          shareLink = result['url'] as String?;
                          message = 'Link seguro gerado.';
                          error = null;
                        });
                      } catch (submitError) {
                        setState(() {
                          error = submitError.toString();
                          message = null;
                        });
                      }
                    },
              child: const Text('Gerar link'),
            ),
          ],
        ),
        if (shareLink != null) ...[
          const SizedBox(height: 16),
          Text('Link: $shareLink'),
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
