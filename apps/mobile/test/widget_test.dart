import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:receituario_mobile/features/auth/application/session_controller.dart';
import 'package:receituario_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:receituario_mobile/shared/services/in_memory_session_storage.dart';
import 'package:receituario_mobile/shared/widgets/session_scope.dart';

void main() {
  testWidgets('renderiza fluxo inicial de login', (tester) async {
    await tester.pumpWidget(
      SessionScope(
        controller: SessionController(
          storage: InMemorySessionStorage(),
        ),
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('Acesso profissional'), findsOneWidget);
    expect(find.text('E-mail profissional'), findsOneWidget);
    expect(find.text('Senha'), findsOneWidget);
  });
}
