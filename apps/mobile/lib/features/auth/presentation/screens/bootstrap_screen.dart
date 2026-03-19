import 'package:flutter/material.dart';

import '../../../../app/app.dart';
import '../../../../shared/widgets/session_scope.dart';

class BootstrapScreen extends StatefulWidget {
  const BootstrapScreen({super.key});

  @override
  State<BootstrapScreen> createState() => _BootstrapScreenState();
}

class _BootstrapScreenState extends State<BootstrapScreen> {
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_started) {
      return;
    }

    _started = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _bootstrap();
    });
  }

  Future<void> _bootstrap() async {
    final sessionController = SessionScope.of(context);
    await sessionController.restoreSession();

    if (!mounted) {
      return;
    }

    Navigator.pushReplacementNamed(
      context,
      sessionController.isAuthenticated ? AppRoutes.dashboard : AppRoutes.login,
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Inicializando app seguro...'),
          ],
        ),
      ),
    );
  }
}
