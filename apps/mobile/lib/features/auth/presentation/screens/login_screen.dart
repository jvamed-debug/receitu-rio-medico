import 'package:flutter/material.dart';

import '../../../../app/app.dart';
import '../../../../shared/widgets/feature_scaffold.dart';
import '../../../../shared/widgets/info_card.dart';
import '../../../../shared/widgets/session_scope.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailController =
      TextEditingController(text: 'profissional.demo@receituario.local');
  final passwordController = TextEditingController(text: 'demo123');
  String? errorMessage;

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);

    return FeatureScaffold(
      title: 'Acesso profissional',
      subtitle:
          'Entrada real do app mobile conectada ao backend de autenticacao.',
      children: [
        const InfoCard(
          title: 'Fluxo inicial',
          items: [
            'Login com e-mail e senha no backend',
            'Sessao local em memoria pronta para evoluir para secure storage',
            'Base pronta para biometria e Face ID no proximo ciclo',
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: emailController,
          decoration: const InputDecoration(
            labelText: 'E-mail profissional',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: passwordController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Senha',
            border: OutlineInputBorder(),
          ),
        ),
        if (errorMessage != null) ...[
          const SizedBox(height: 12),
          Text(
            errorMessage!,
            style: const TextStyle(
              color: Color(0xFFB42318),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: session.isBusy
              ? null
              : () async {
                  setState(() {
                    errorMessage = null;
                  });

                  try {
                    await session.login(
                      email: emailController.text,
                      password: passwordController.text,
                    );

                    if (!mounted) {
                      return;
                    }

                    Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
                  } catch (error) {
                    setState(() {
                      errorMessage = error.toString();
                    });
                  }
                },
          child: Text(session.isBusy ? 'Entrando...' : 'Entrar no app'),
        ),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, AppRoutes.onboarding),
          child: const Text('Primeiro acesso'),
        ),
      ],
    );
  }
}
