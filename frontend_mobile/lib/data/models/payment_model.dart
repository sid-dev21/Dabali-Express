class PaymentModel {
  final String id;
  final String subscriptionId;
  final String? studentId;
  final String? studentName;
  final String parentId;
  final double amount;
  final String method;
  final String status;
  final String? reference;
  final String? paidAt;

  PaymentModel({
    required this.id,
    required this.subscriptionId,
    this.studentId,
    this.studentName,
    required this.parentId,
    required this.amount,
    required this.method,
    required this.status,
    this.reference,
    this.paidAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    final subscriptionValue = json['subscription_id'];
    final studentId = _extractStudentId(subscriptionValue);
    final studentName = _extractStudentName(subscriptionValue);
    final parentValue = json['parent_id'];
    return PaymentModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      subscriptionId: _stringId(subscriptionValue),
      studentId: studentId,
      studentName: studentName,
      parentId: _stringId(parentValue),
      amount: double.parse(json['amount'].toString()),
      method: json['method'],
      status: json['status'],
      reference: json['reference'],
      paidAt: json['paid_at']?.toString(),
    );
  }

  static String _stringId(dynamic raw) {
    if (raw == null) return '';
    if (raw is Map<String, dynamic>) {
      return (raw['_id'] ?? raw['id'] ?? '').toString();
    }
    return raw.toString();
  }

  static String? _extractStudentId(dynamic subscriptionRaw) {
    if (subscriptionRaw is Map<String, dynamic>) {
      return _stringId(subscriptionRaw['student_id']);
    }
    return null;
  }

  static String? _extractStudentName(dynamic subscriptionRaw) {
    if (subscriptionRaw is! Map<String, dynamic>) return null;
    final studentRaw = subscriptionRaw['student_id'];
    if (studentRaw is Map<String, dynamic>) {
      final firstName = (studentRaw['first_name'] ?? '').toString().trim();
      final lastName = (studentRaw['last_name'] ?? '').toString().trim();
      final fullName = '$firstName $lastName'.trim();
      return fullName.isEmpty ? null : fullName;
    }
    return null;
  }

  String get methodLabel {
    switch (method) {
      case 'MOBILE_MONEY': return 'Mobile Money';
      case 'CREDIT_CARD': return 'Carte';
      case 'BANK_TRANSFER': return 'Virement';
      case 'CASH': return 'Espèces';
      default: return method;
    }
  }

  String get statusLabel {
    switch (status) {
      case 'COMPLETED': return 'Réussi';
      case 'PENDING': return 'En attente';
      case 'FAILED': return 'Échoué';
      case 'REFUNDED': return 'Remboursé';
      default: return status;
    }
  }

  String get formattedAmount {
    return '${amount.toStringAsFixed(0)} FCFA';
  }

  bool get isSuccess => status == 'COMPLETED';
}
