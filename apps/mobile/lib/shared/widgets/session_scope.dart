import 'package:flutter/widgets.dart';

import '../../features/auth/application/session_controller.dart';

class SessionScope extends InheritedNotifier<SessionController> {
  const SessionScope({
    required SessionController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static SessionController of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<SessionScope>();

    assert(scope != null, 'SessionScope nao encontrado na arvore.');
    return scope!.notifier!;
  }
}
