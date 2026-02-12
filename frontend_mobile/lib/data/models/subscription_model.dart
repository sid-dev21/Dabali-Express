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
    required this.createdAt,
    required this.updatedAt,
    this.paymentDetails,
  });

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionModel(
      id: json['id'] ?? '',
      childId: json['childId'] ?? '',
      parentId: json['parentId'] ?? '',
      type: _parseSubscriptionType(json['type']),
      amount: (json['amount'] ?? 0).toDouble(),
      startDate: DateTime.parse(json['startDate'] ?? DateTime.now().toIso8601String()),
      endDate: DateTime.parse(json['endDate'] ?? DateTime.now().toIso8601String()),
      status: _parseSubscriptionStatus(json['status']),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      paymentDetails: json['paymentDetails'],
    );
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
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'paymentDetails': paymentDetails,
    };
  }

  static SubscriptionType _parseSubscriptionType(String? type) {
    switch (type) {
      case 'MONTHLY':
        return SubscriptionType.monthly;
      case 'QUARTERLY':
        return SubscriptionType.quarterly;
      case 'YEARLY':
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
    switch (status) {
      case 'PENDING_PAYMENT':
        return SubscriptionStatus.pendingPayment;
      case 'ACTIVE':
        return SubscriptionStatus.active;
      case 'EXPIRED':
        return SubscriptionStatus.expired;
      case 'CANCELLED':
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
