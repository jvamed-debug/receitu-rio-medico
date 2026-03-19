class ClinicalDocumentSummary {
  const ClinicalDocumentSummary({
    required this.id,
    required this.type,
    required this.status,
    required this.patientId,
    required this.title,
    required this.createdAt,
    this.issuedAt,
    this.derivedFromDocumentId,
  });

  final String id;
  final String type;
  final String status;
  final String patientId;
  final String title;
  final String createdAt;
  final String? issuedAt;
  final String? derivedFromDocumentId;

  factory ClinicalDocumentSummary.fromJson(Map<String, dynamic> json) {
    return ClinicalDocumentSummary(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'unknown',
      status: json['status'] as String? ?? 'draft',
      patientId: json['patientId'] as String? ?? '',
      title: json['title'] as String? ?? 'Documento',
      createdAt: json['createdAt'] as String? ?? '',
      issuedAt: json['issuedAt'] as String?,
      derivedFromDocumentId: json['derivedFromDocumentId'] as String?,
    );
  }
}
