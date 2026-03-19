import 'package:flutter/material.dart';

import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/info_card.dart';
import '../../../../shared/widgets/session_scope.dart';

class SignaturePanelScreen extends StatefulWidget {
  const SignaturePanelScreen({super.key});

  @override
  State<SignaturePanelScreen> createState() => _SignaturePanelScreenState();
}

class _SignaturePanelScreenState extends State<SignaturePanelScreen> {
  String provider = 'ICP_BRASIL_VENDOR';
  String? message;
  String? error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final session = SessionScope.of(context).session;
    final currentProvider =
        session?.professionalProfile?['signatureProvider'] as String?;

    if (currentProvider != null && currentProvider.isNotEmpty) {
      provider = currentProvider;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionController = SessionScope.of(context);
    final session = sessionController.session;
    final profile = session?.professionalProfile ?? const <String, dynamic>{};

    return FeatureScaffold(
      title: 'Painel de assinatura',
      subtitle:
          'Tela conectada ao backend para readiness do provedor e validacao inicial do metodo.',
      children: [
        InfoCard(
          title: 'Estado atual',
          items: [
            'Usuario: ${session?.email ?? 'nao autenticado'}',
            'Provedor atual: ${(profile['signatureProvider'] as String?) ?? 'nao configurado'}',
            'Ultima validacao: ${(profile['signatureValidatedAt'] as String?) ?? 'pendente'}',
            'A assinatura continua individual por documento',
          ],
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: provider,
          decoration: const InputDecoration(
            labelText: 'Provedor de assinatura',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(
              value: 'ICP_BRASIL_VENDOR',
              child: Text('ICP-Brasil vendor'),
            ),
            DropdownMenuItem(
              value: 'GOVBR_VENDOR',
              child: Text('Gov.br vendor'),
            ),
          ],
          onChanged: (value) {
            if (value == null) {
              return;
            }

            setState(() {
              provider = value;
            });
          },
        ),
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(
            error!,
            style: const TextStyle(
              color: Color(0xFFB42318),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
        if (message != null) ...[
          const SizedBox(height: 12),
          Text(
            message!,
            style: const TextStyle(
              color: Color(0xFF0A7F5A),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: sessionController.isBusy || session == null
              ? null
              : () async {
                  setState(() {
                    error = null;
                    message = null;
                  });

                  try {
                    await sessionController.saveSignatureMethod(provider);

                    setState(() {
                      message = 'Metodo de assinatura validado com sucesso.';
                    });
                  } catch (submitError) {
                    setState(() {
                      error = submitError.toString();
                    });
                  }
                },
          child: Text(
            sessionController.isBusy ? 'Validando...' : 'Salvar metodo',
          ),
        ),
      ],
    );
  }
}
