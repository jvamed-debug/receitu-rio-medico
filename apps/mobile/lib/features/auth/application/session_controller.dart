import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../../shared/services/mobile_api_client.dart';
import '../../../shared/services/session_storage.dart';

class AppSession {
  const AppSession({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    required this.email,
    this.fullName,
    this.userId,
    this.professionalId,
    this.roles = const <String>[],
    this.professionalProfile,
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final String email;
  final String? fullName;
  final String? userId;
  final String? professionalId;
  final List<String> roles;
  final Map<String, dynamic>? professionalProfile;

  AppSession copyWith({
    String? accessToken,
    String? refreshToken,
    int? expiresIn,
    String? email,
    String? fullName,
    String? userId,
    String? professionalId,
    List<String>? roles,
    Map<String, dynamic>? professionalProfile,
  }) {
    return AppSession(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      expiresIn: expiresIn ?? this.expiresIn,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      userId: userId ?? this.userId,
      professionalId: professionalId ?? this.professionalId,
      roles: roles ?? this.roles,
      professionalProfile: professionalProfile ?? this.professionalProfile,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'expiresIn': expiresIn,
      'email': email,
      'fullName': fullName,
      'userId': userId,
      'professionalId': professionalId,
      'roles': roles,
      'professionalProfile': professionalProfile,
    };
  }

  static AppSession fromJson(Map<String, dynamic> json) {
    return AppSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: json['expiresIn'] as int,
      email: json['email'] as String,
      fullName: json['fullName'] as String?,
      userId: json['userId'] as String?,
      professionalId: json['professionalId'] as String?,
      roles: ((json['roles'] as List<dynamic>?) ?? const <dynamic>[])
          .map((item) => item.toString())
          .toList(),
      professionalProfile:
          json['professionalProfile'] as Map<String, dynamic>?,
    );
  }
}

class SessionController extends ChangeNotifier {
  SessionController({
    required SessionStorage storage,
  }) : _storage = storage;

  static const _sessionStorageKey = 'receituario.mobile.session';

  final SessionStorage _storage;
  AppSession? _session;
  bool _busy = false;
  bool _hydrating = false;
  bool _hydrated = false;
  String? _error;

  AppSession? get session => _session;
  bool get isAuthenticated => _session != null;
  bool get isBusy => _busy;
  bool get isHydrating => _hydrating;
  bool get isHydrated => _hydrated;
  String? get error => _error;

  Future<void> restoreSession() async {
    _hydrating = true;
    notifyListeners();

    try {
      final rawSession = await _storage.read(_sessionStorageKey);

      if (rawSession == null || rawSession.isEmpty) {
        _session = null;
        return;
      }

      final decoded = jsonDecode(rawSession) as Map<String, dynamic>;
      _session = AppSession.fromJson(decoded);

      try {
        await refreshProfile();
      } catch (_) {
        await logout();
      }
    } finally {
      _hydrating = false;
      _hydrated = true;
      notifyListeners();
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    _setBusy(true);
    _error = null;

    try {
      final publicClient = MobileApiClient();
      final tokens = await publicClient.login(email: email, password: password);
      final accessToken = tokens['accessToken'] as String;
      final refreshToken = tokens['refreshToken'] as String;
      final expiresIn = tokens['expiresIn'] as int;
      final authedClient = MobileApiClient(accessToken: accessToken);
      final me = await authedClient.me();

      _session = AppSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
        email: (me['email'] as String?) ?? email,
        fullName: me['fullName'] as String?,
        userId: me['userId'] as String?,
        professionalId: me['professionalId'] as String?,
        roles: ((me['roles'] as List<dynamic>?) ?? const <dynamic>[])
            .map((item) => item.toString())
            .toList(),
        professionalProfile: me['professionalProfile'] as Map<String, dynamic>?,
      );
      await _persistSession();
    } catch (error) {
      _error = error.toString();
      rethrow;
    } finally {
      _setBusy(false);
    }
  }

  Future<void> refreshProfile() async {
    final currentSession = _session;

    if (currentSession == null) {
      return;
    }

    final me = await MobileApiClient(accessToken: currentSession.accessToken).me();
    _session = currentSession.copyWith(
      email: me['email'] as String? ?? currentSession.email,
      fullName: me['fullName'] as String? ?? currentSession.fullName,
      userId: me['userId'] as String? ?? currentSession.userId,
      professionalId: me['professionalId'] as String? ?? currentSession.professionalId,
      roles: ((me['roles'] as List<dynamic>?) ?? currentSession.roles)
          .map((item) => item.toString())
          .toList(),
      professionalProfile: me['professionalProfile'] as Map<String, dynamic>?,
    );
    await _persistSession();
    notifyListeners();
  }

  Future<void> updateProfessionalProfile(Map<String, dynamic> payload) async {
    final currentSession = _session;

    if (currentSession == null) {
      return;
    }

    _setBusy(true);
    _error = null;

    try {
      await MobileApiClient(accessToken: currentSession.accessToken)
          .updateProfessionalProfile(payload);
      await refreshProfile();
    } catch (error) {
      _error = error.toString();
      rethrow;
    } finally {
      _setBusy(false);
    }
  }

  Future<void> saveSignatureMethod(String provider) async {
    final currentSession = _session;

    if (currentSession == null) {
      return;
    }

    _setBusy(true);
    _error = null;

    try {
      await MobileApiClient(accessToken: currentSession.accessToken)
          .createSignatureMethod({
        'provider': provider,
      });
      await refreshProfile();
    } catch (error) {
      _error = error.toString();
      rethrow;
    } finally {
      _setBusy(false);
    }
  }

  Future<void> logout() async {
    _session = null;
    _error = null;
    _busy = false;
    _hydrated = true;
    await _storage.delete(_sessionStorageKey);
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void _setBusy(bool value) {
    _busy = value;
    notifyListeners();
  }

  Future<void> _persistSession() async {
    final currentSession = _session;

    if (currentSession == null) {
      return;
    }

    await _storage.write(
      _sessionStorageKey,
      jsonEncode(currentSession.toJson()),
    );
  }
}
