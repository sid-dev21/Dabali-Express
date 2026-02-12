class Subscription {
  final String id;
  final String childId;
  final String parentId;
  final String planId;
  final String planName;
  final double amount;
  final String currency;
  final String status; // pending_payment, active, expired, cancelled
  final DateTime? startDate;
  final DateTime? endDate;
  final String? paymentMethod;
  final DateTime? paymentDate;
  final String? transactionId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Subscription({
    required this.id,
    required this.childId,
    required this.parentId,
    required this.planId,
    required this.planName,
    required this.amount,
    required this.currency,
    required this.status,
    this.startDate,
    this.endDate,
    this.paymentMethod,
    this.paymentDate,
    this.transactionId,
    this.createdAt,
    this.updatedAt,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      childId: json['childId'] as String? ?? '',
      parentId: json['parentId'] as String? ?? '',
      planId: json['planId'] as String? ?? '',
      planName: json['planName'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'XOF',
      status: json['status'] as String? ?? 'pending_payment',
      startDate: json['startDate'] != null 
          ? DateTime.parse(json['startDate'] as String) 
          : null,
      endDate: json['endDate'] != null 
          ? DateTime.parse(json['endDate'] as String) 
          : null,
      paymentMethod: json['paymentMethod'] as String?,
      paymentDate: json['paymentDate'] != null 
          ? DateTime.parse(json['paymentDate'] as String) 
          : null,
      transactionId: json['transactionId'] as String?,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : null,
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'childId': childId,
      'parentId': parentId,
      'planId': planId,
      'planName': planName,
      'amount': amount,
      'currency': currency,
      'status': status,
      'startDate': startDate?.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'paymentMethod': paymentMethod,
      'paymentDate': paymentDate?.toIso8601String(),
      'transactionId': transactionId,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Subscription copyWith({
    String? id,
    String? childId,
    String? parentId,
    String? planId,
    String? planName,
    double? amount,
    String? currency,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
    String? paymentMethod,
    DateTime? paymentDate,
    String? transactionId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Subscription(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      parentId: parentId ?? this.parentId,
      planId: planId ?? this.planId,
      planName: planName ?? this.planName,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      status: status ?? this.status,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paymentDate: paymentDate ?? this.paymentDate,
      transactionId: transactionId ?? this.transactionId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get isPendingPayment => status == 'pending_payment';
  bool get isActive => status == 'active';
  bool get isExpired => status == 'expired';
  bool get isCancelled => status == 'cancelled';

  String get statusDisplay {
    switch (status) {
      case 'pending_payment':
        return 'En attente de paiement';
      case 'active':
        return 'Actif';
      case 'expired':
        return 'Expiré';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  }

  String get formattedAmount => '$amount $currency';

  bool get isPaid => paymentDate != null && transactionId != null;

  int get daysUntilExpiry {
    if (endDate == null) return 0;
    final now = DateTime.now();
    final difference = endDate!.difference(now);
    return difference.inDays;
  }

  bool get expiresSoon {
    if (!isActive || endDate == null) return false;
    return daysUntilExpiry <= 7;
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Subscription && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'Subscription(id: $id, planName: $planName, status: $status)';
  }
}
