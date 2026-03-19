import 'package:flutter/material.dart';

import '../../app/app.dart';
import '../../features/documents/presentation/screens/documents_home_screen.dart';
import '../../features/history/presentation/screens/history_screen.dart';
import '../../features/patients/presentation/screens/patients_screen.dart';
import 'feature_scaffold.dart';
import 'info_card.dart';
import 'session_scope.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final sessionController = SessionScope.of(context);
    final session = sessionController.session;

    final pages = [
      FeatureScaffold(
        title: 'Dashboard clinico',
        subtitle: 'Visao inicial do app mobile com atalhos para emissao, assinatura, PDF e historico.',
        action: TextButton(
          onPressed: () => Navigator.pushNamed(context, AppRoutes.signaturePanel),
          child: const Text('Assinatura'),
        ),
        children: [
          InfoCard(
            title: 'Operacao do dia',
            items: [
              'Usuario: ${session?.email ?? 'nao autenticado'}',
              'Documentos pendentes de assinatura',
              'Rascunhos recentes sincronizados',
              'Alertas de envio e readiness do provedor',
            ],
          ),
          SizedBox(height: 16),
          InfoCard(
            title: 'Acessos rapidos',
            items: [
              'Nova prescricao',
              'Novo exame',
              'Novo atestado',
              'Documento livre',
            ],
          ),
        ],
      ),
      const DocumentsHomeScreen(),
      const PatientsScreen(),
      const HistoryScreen(),
    ];

    return Scaffold(
      body: SafeArea(child: pages[_currentIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (value) {
          setState(() {
            _currentIndex = value;
          });
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Inicio'),
          NavigationDestination(icon: Icon(Icons.description_outlined), label: 'Docs'),
          NavigationDestination(icon: Icon(Icons.people_outline), label: 'Pacientes'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Historico'),
        ],
      ),
      floatingActionButton: sessionController.isAuthenticated
          ? FloatingActionButton.extended(
              onPressed: () {
                sessionController.logout().then((_) {
                  if (!context.mounted) {
                    return;
                  }

                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    AppRoutes.login,
                    (route) => false,
                  );
                });
              },
              label: const Text('Sair'),
              icon: const Icon(Icons.logout),
            )
          : null,
    );
  }
}
