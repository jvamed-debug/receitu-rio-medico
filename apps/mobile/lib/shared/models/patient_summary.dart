class PatientSummary {
  const PatientSummary({
    required this.id,
    required this.fullName,
    this.cpf,
    this.cns,
    this.birthDate,
    this.phone,
    this.email,
    this.notes,
  });

  final String id;
  final String fullName;
  final String? cpf;
  final String? cns;
  final String? birthDate;
  final String? phone;
  final String? email;
  final String? notes;

  factory PatientSummary.fromJson(Map<String, dynamic> json) {
    return PatientSummary(
      id: json['id'] as String,
      fullName: json['fullName'] as String? ?? 'Paciente',
      cpf: json['cpf'] as String?,
      cns: json['cns'] as String?,
      birthDate: json['birthDate'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      notes: json['notes'] as String?,
    );
  }
}
