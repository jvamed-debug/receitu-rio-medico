import 'dart:convert';
import 'dart:io';

import '../models/clinical_document_summary.dart';
import '../models/patient_summary.dart';

class MobileApiClient {
  MobileApiClient({
    String? baseUrl,
    this.accessToken,
  }) : baseUrl = baseUrl ?? const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'http://localhost:3001',
        );

  final String baseUrl;
  final String? accessToken;

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) {
    return post(
      '/auth/login',
      {
        'email': email,
        'password': password,
      },
    );
  }

  Future<Map<String, dynamic>> refresh({
    required String refreshToken,
  }) {
    return post(
      '/auth/refresh',
      {
        'refreshToken': refreshToken,
      },
    );
  }

  Future<Map<String, dynamic>> me() {
    return get('/me');
  }

  Future<Map<String, dynamic>> updateProfessionalProfile(
    Map<String, dynamic> payload,
  ) {
    return patch('/me/professional-profile', payload);
  }

  Future<Map<String, dynamic>> createSignatureMethod(
    Map<String, dynamic> payload,
  ) {
    return post('/me/signature-methods', payload);
  }

  Future<List<PatientSummary>> listPatients() async {
    final response = await getList('/patients');
    return response.map(PatientSummary.fromJson).toList();
  }

  Future<PatientSummary?> getPatient(String id) async {
    final response = await get('/patients/$id');

    if (response.isEmpty) {
      return null;
    }

    return PatientSummary.fromJson(response);
  }

  Future<List<ClinicalDocumentSummary>> listDocuments() async {
    final response = await getList('/documents');
    return response.map(ClinicalDocumentSummary.fromJson).toList();
  }

  Future<ClinicalDocumentSummary> createPrescription({
    required String patientId,
    required String title,
    required List<Map<String, dynamic>> items,
  }) async {
    final response = await post('/documents/prescriptions', {
      'patientId': patientId,
      'title': title,
      'items': items,
    });
    return ClinicalDocumentSummary.fromJson(response);
  }

  Future<ClinicalDocumentSummary> createExamRequest({
    required String patientId,
    required String title,
    required List<String> requestedExams,
    String? preparationNotes,
  }) async {
    final response = await post('/documents/exam-requests', {
      'patientId': patientId,
      'title': title,
      'requestedExams': requestedExams,
      'preparationNotes': preparationNotes,
    });
    return ClinicalDocumentSummary.fromJson(response);
  }

  Future<ClinicalDocumentSummary> createMedicalCertificate({
    required String patientId,
    required String title,
    required String purpose,
    int? restDays,
    String? observations,
  }) async {
    final response = await post('/documents/certificates', {
      'patientId': patientId,
      'title': title,
      'purpose': purpose,
      'restDays': restDays,
      'observations': observations,
    });
    return ClinicalDocumentSummary.fromJson(response);
  }

  Future<ClinicalDocumentSummary> createFreeDocument({
    required String patientId,
    required String title,
    required String body,
  }) async {
    final response = await post('/documents/free', {
      'patientId': patientId,
      'title': title,
      'body': body,
    });
    return ClinicalDocumentSummary.fromJson(response);
  }

  Future<List<ClinicalDocumentSummary>> getHistory() async {
    final response = await get('/history');
    final items = (response['items'] as List<dynamic>? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();
    return items.map(ClinicalDocumentSummary.fromJson).toList();
  }

  Future<List<ClinicalDocumentSummary>> getPatientHistory(String patientId) async {
    final response = await get('/patients/$patientId/history');
    final items = (response['items'] as List<dynamic>? ?? const <dynamic>[])
        .cast<Map<String, dynamic>>();
    return items.map(ClinicalDocumentSummary.fromJson).toList();
  }

  Future<ClinicalDocumentSummary> duplicateDocument(String id) async {
    final response = await post('/documents/$id/duplicate', {});
    return ClinicalDocumentSummary.fromJson(response);
  }

  Future<Map<String, dynamic>> getDocumentPdf(String id) {
    return get('/documents/$id/pdf');
  }

  Future<Map<String, dynamic>> createSignatureWindow(int durationMinutes) {
    return post('/signature/windows', {
      'durationMinutes': durationMinutes,
    });
  }

  Future<Map<String, dynamic>> getActiveSignatureWindow() {
    return get('/signature/windows/active');
  }

  Future<Map<String, dynamic>> signDocument(
    String id, {
    String provider = 'ICP_BRASIL_VENDOR',
  }) {
    return post('/documents/$id/sign', {
      'provider': provider,
    });
  }

  Future<Map<String, dynamic>> deliverDocumentByEmail({
    required String id,
    required String email,
  }) {
    return post('/documents/$id/deliver/email', {
      'email': email,
    });
  }

  Future<Map<String, dynamic>> createShareLink(String id) {
    return post('/documents/$id/deliver/share-link', {});
  }

  Future<List<Map<String, dynamic>>> listTemplates() {
    return getList('/templates');
  }

  Future<Map<String, dynamic>> createTemplate({
    required String name,
    required String type,
    Map<String, dynamic>? structure,
  }) {
    return post('/templates', {
      'name': name,
      'type': type,
      'structure': structure ?? const {},
    });
  }

  Future<List<Map<String, dynamic>>> getList(
    String path,
  ) async {
    final request = await _openRequest('GET', path);
    final response = await request.close();
    final body = await utf8.decoder.bind(response).join();

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException(
        'Request falhou com status ${response.statusCode}: $body',
      );
    }

    if (body.isEmpty) {
      return <Map<String, dynamic>>[];
    }

    final decoded = jsonDecode(body);

    if (decoded is List) {
      return decoded.cast<Map<String, dynamic>>();
    }

    return <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>> get(
    String path,
  ) async {
    final request = await _openRequest('GET', path);
    final response = await request.close();
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final request = await _openRequest('POST', path);
    request.write(jsonEncode(body));
    final response = await request.close();
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    final request = await _openRequest('PATCH', path);
    request.write(jsonEncode(body));
    final response = await request.close();
    return _decodeResponse(response);
  }

  Future<HttpClientRequest> _openRequest(String method, String path) async {
    final client = HttpClient();
    final uri = Uri.parse('$baseUrl/api$path');
    final request = await client.openUrl(method, uri);
    request.headers.contentType = ContentType.json;

    if (accessToken != null && accessToken!.isNotEmpty) {
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $accessToken');
    }

    return request;
  }

  Future<Map<String, dynamic>> _decodeResponse(HttpClientResponse response) async {
    final body = await utf8.decoder.bind(response).join();

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException(
        'Request falhou com status ${response.statusCode}: $body',
      );
    }

    if (body.isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(body);

    if (decoded is Map<String, dynamic>) {
      return decoded;
    }

    return <String, dynamic>{
      'items': decoded,
    };
  }
}
