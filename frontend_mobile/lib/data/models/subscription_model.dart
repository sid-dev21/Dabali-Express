enum SubscriptionType {
  monthly,
  quarterly,
  yearly,
}

enum SubscriptionStatus {
  pendingPayment,
  active,
  expired,
  cancelled,
}

class SubscriptionModel {
  final String id;
  final String childId;
  final String parentId;
  final SubscriptionType type;
  final double amount;
  final DateTime startDate;
  final DateTime endDate;
  final SubscriptionStatus status;
  final String? paymentMethod;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, dynamic>? paymentDetails;

  const SubscriptionModel({
    required this.id,
    required this.childId,
    required this.parentId,
    required this.type,
    required this.amount,
    required this.startDate,
    required this.endDate,
    required this.status,
    this.paymentMethod,
    required this.createdAt,
    required this.updatedAt,
    this.paymentDetails,
  });

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    final childId = _extractChildId(json);
    final createdAt = _parseDate(json['createdAt'] ?? json['created_at']) ?? DateTime.now();
    final updatedAt = _parseDate(json['updatedAt'] ?? json['updated_at']) ?? createdAt;
    return SubscriptionModel(
      id: _extractId(json),
      childId: childId,
      parentId: _extractParentId(json),
      type: _parseSubscriptionType(json['type'] ?? json['plan_type'] ?? json['subscription_type'] ?? json['meal_plan']),
      amount: _toAmount(json),
      startDate: _parseDate(json['startDate'] ?? json['start_date']) ?? DateTime.now(),
      endDate: _parseDate(json['endDate'] ?? json['end_date']) ?? DateTime.now(),
      status: _parseSubscriptionStatus(json['status']?.toString()),
      paymentMethod: _extractPaymentMethod(json),
      createdAt: createdAt,
      updatedAt: updatedAt,
      paymentDetails: (json['paymentDetails'] ?? json['payment_details']) is Map<String, dynamic>
          ? (json['paymentDetails'] ?? json['payment_details']) as Map<String, dynamic>
          : null,
    );
  }

  static String _extractId(Map<String, dynamic> json) {
    final raw = json['id'] ?? json['_id'];
    if (raw == null) return '';
    if (raw is Map<String, dynamic>) {
      return (raw['_id'] ?? raw['id'] ?? '').toString();
    }
    return raw.toString();
  }

  static String _extractChildId(Map<String, dynamic> json) {
    final direct = json['childId'] ?? json['child_id'] ?? json['studentId'] ?? json['student_id'];
    if (direct is Map<String, dynamic>) {
      return (direct['_id'] ?? direct['id'] ?? '').toString();
    }
    if (direct != null) {
      return direct.toString();
    }
    return '';
  }

  static String _extractParentId(Map<String, dynamic> json) {
    final raw = json['parentId'] ?? json['parent_id'];
    if (raw is Map<String, dynamic>) {
      return (raw['_id'] ?? raw['id'] ?? '').toString();
    }
    return raw?.toString() ?? '';
  }

  static double _toAmount(Map<String, dynamic> json) {
    final raw = json['amount'] ?? json['price'] ?? 0;
    if (raw is num) return raw.toDouble();
    return double.tryParse(raw.toString()) ?? 0;
  }

  static DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }

  static String? _extractPaymentMethod(Map<String, dynamic> json) {
    final directMethod = json['paymentMethod'] ?? json['payment_method'];
    if (directMethod != null && directMethod.toString().trim().isNotEmpty) {
      return directMethod.toString();
    }

    final details = json['paymentDetails'] ?? json['payment_details'];
    if (details is Map<String, dynamic>) {
      final nestedMethod = details['method'] ?? details['paymentMethod'] ?? details['payment_method'];
      if (nestedMethod != null && nestedMethod.toString().trim().isNotEmpty) {
        return nestedMethod.toString();
      }
    }

    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'childId': childId,
      'parentId': parentId,
      'type': _typeToString(type),
      'amount': amount,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'status': _statusToString(status),
      'paymentMethod': paymentMethod,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'paymentDetails': paymentDetails,
    };
  }

  static SubscriptionType _parseSubscriptionType(String? type) {
    switch ((type ?? '').toUpperCase()) {
      case 'MONTHLY':
        return SubscriptionType.monthly;
      case 'QUARTERLY':
        return SubscriptionType.quarterly;
      case 'YEARLY':
      case 'ANNUAL':
        return SubscriptionType.yearly;
      default:
        return SubscriptionType.monthly;
    }
  }

  static String _typeToString(SubscriptionType type) {
    switch (type) {
      case SubscriptionType.monthly:
        return 'MONTHLY';
      case SubscriptionType.quarterly:
        return 'QUARTERLY';
      case SubscriptionType.yearly:
        return 'YEARLY';
    }
  }

  static SubscriptionStatus _parseSubscriptionStatus(String? status) {
    switch ((status ?? '').toUpperCase()) {
      case 'PENDING_PAYMENT':
      case 'PENDING':
      case 'WAITING_ADMIN_VALIDATION':
        return SubscriptionStatus.pendingPayment;
      case 'ACTIVE':
      case 'COMPLETED':
        return SubscriptionStatus.active;
      case 'EXPIRED':
      case 'FAILED':
        return SubscriptionStatus.expired;
      case 'CANCELLED':
      case 'REJECTED':
        return SubscriptionStatus.cancelled;
      default:
        return SubscriptionStatus.pendingPayment;
    }
  }

  static String _statusToString(SubscriptionStatus status) {
    switch (status) {
      case SubscriptionStatus.pendingPayment:
        return 'PENDING_PAYMENT';
      case SubscriptionStatus.active:
        return 'ACTIVE';
      case SubscriptionStatus.expired:
        return 'EXPIRED';
      case SubscriptionStatus.cancelled:
        return 'CANCELLED';
    }
  }

  SubscriptionModel copyWith({
    String? id,
    String? childId,
    String? parentId,
    SubscriptionType? type,
    double? amount,
    DateTime? startDate,
    DateTime? endDate,
    SubscriptionStatus? status,
    String? paymentMethod,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? paymentDetails,
  }) {
    return SubscriptionModel(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      parentId: parentId ?? this.parentId,
      type: type ?? this.type,
      amount: amount ?? this.amount,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      status: status ?? this.status,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      paymentDetails: paymentDetails ?? this.paymentDetails,
    );
  }

  // Getters pour l'affichage
  String get typeDisplayName {
    switch (type) {
      case SubscriptionType.monthly:
        return 'Mensuel';
      case SubscriptionType.quarterly:
        return 'Trimestriel';
      case SubscriptionType.yearly:
        return 'Annuel';
    }
  }

  String get statusDisplayName {
    switch (status) {
      case SubscriptionStatus.pendingPayment:
        return 'En attente de paiement';
      case SubscriptionStatus.active:
        return 'Actif';
      case SubscriptionStatus.expired:
        return 'Expiré';
      case SubscriptionStatus.cancelled:
        return 'Annulé';
    }
  }

  bool get isActive => status == SubscriptionStatus.active;
  bool get isPendingPayment => status == SubscriptionStatus.pendingPayment;
  bool get isExpired => status == SubscriptionStatus.expired;
  bool get isCancelled => status == SubscriptionStatus.cancelled;

  DateTime get calculatedEndDate {
    switch (type) {
      case SubscriptionType.monthly:
        return startDate.add(const Duration(days: 30));
      case SubscriptionType.quarterly:
        return startDate.add(const Duration(days: 90));
      case SubscriptionType.yearly:
        return startDate.add(const Duration(days: 365));
    }
  }

  int get daysUntilExpiry {
    final now = DateTime.now();
    if (endDate.isBefore(now)) return 0;
    return endDate.difference(now).inDays;
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is SubscriptionModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'SubscriptionModel(id: $id, type: $type, status: $status, amount: $amount)';
  }
}
