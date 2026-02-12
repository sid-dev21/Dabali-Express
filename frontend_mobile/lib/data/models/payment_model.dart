enum PaymentMethod { ORANGE_MONEY, MOOV_MONEY, CASH, WAVE }

enum PaymentStatus { PENDING, PROCESSING, SUCCESS, FAILED, CANCELLED, REFUNDED }

class PaymentModel {
  final String id;
  final String subscriptionId;
  final double amount;
  final PaymentMethod method;
  final PaymentStatus status;
  final String? transactionId;
  final String? phoneNumber;
  final String? reference;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? failureReason;
  final Map<String, dynamic>? metadata;

  PaymentModel({
    required this.id,
    required this.subscriptionId,
    required this.amount,
    required this.method,
    required this.status,
    this.transactionId,
    this.phoneNumber,
    this.reference,
    this.createdAt,
    this.updatedAt,
    this.failureReason,
    this.metadata,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id']?.toString() ?? '',
      subscriptionId: json['subscription_id']?.toString() ?? json['subscriptionId'] ?? '',
      amount: (json['amount'] ?? 0.0).toDouble(),
      method: _parsePaymentMethod(json['method'] ?? json['payment_method']),
      status: _parsePaymentStatus(json['status'] ?? json['payment_status']),
      transactionId: json['transaction_id']?.toString() ?? json['transactionId'],
      phoneNumber: json['phone_number']?.toString() ?? json['phoneNumber'],
      reference: json['reference']?.toString(),
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at']) 
          : null,
      failureReason: json['failure_reason']?.toString() ?? json['failureReason'],
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subscription_id': subscriptionId,
      'amount': amount,
      'payment_method': method.name,
      'payment_status': status.name,
      'transaction_id': transactionId,
      'phone_number': phoneNumber,
      'reference': reference,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'failure_reason': failureReason,
      'metadata': metadata,
    };
  }

  static PaymentMethod _parsePaymentMethod(String method) {
    switch (method.toUpperCase()) {
      case 'ORANGE_MONEY':
        return PaymentMethod.ORANGE_MONEY;
      case 'MOOV_MONEY':
        return PaymentMethod.MOOV_MONEY;
      case 'CASH':
        return PaymentMethod.CASH;
      case 'WAVE':
        return PaymentMethod.WAVE;
      default:
        return PaymentMethod.CASH;
    }
  }

  static PaymentStatus _parsePaymentStatus(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'PROCESSING':
        return PaymentStatus.PROCESSING;
      case 'SUCCESS':
        return PaymentStatus.SUCCESS;
      case 'FAILED':
        return PaymentStatus.FAILED;
      case 'CANCELLED':
        return PaymentStatus.CANCELLED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  String get methodDisplayName {
    switch (method) {
      case PaymentMethod.ORANGE_MONEY:
        return 'Orange Money';
      case PaymentMethod.MOOV_MONEY:
        return 'Moov Money';
      case PaymentMethod.CASH:
        return 'Espèces';
      case PaymentMethod.WAVE:
        return 'Wave';
    }
  }

  String get statusDisplayName {
    switch (status) {
      case PaymentStatus.PENDING:
        return 'En attente';
      case PaymentStatus.PROCESSING:
        return 'En cours';
      case PaymentStatus.SUCCESS:
        return 'Succès';
      case PaymentStatus.FAILED:
        return 'Échec';
      case PaymentStatus.CANCELLED:
        return 'Annulé';
      case PaymentStatus.REFUNDED:
        return 'Remboursé';
    }
  }

  bool get isPending => status == PaymentStatus.PENDING;
  bool get isProcessing => status == PaymentStatus.PROCESSING;
  bool get isSuccess => status == PaymentStatus.SUCCESS;
  bool get isFailed => status == PaymentStatus.FAILED;
  bool get isCancelled => status == PaymentStatus.CANCELLED;
  bool get isRefunded => status == PaymentStatus.REFUNDED;

  bool get isCompleted => isSuccess || isRefunded;
  bool get isPendingOrProcessing => isPending || isProcessing;

  String get formattedAmount => '${amount.toStringAsFixed(0)} FCFA';

  PaymentModel copyWith({
    String? id,
    String? subscriptionId,
    double? amount,
    PaymentMethod? method,
    PaymentStatus? status,
    String? transactionId,
    String? phoneNumber,
    String? reference,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? failureReason,
    Map<String, dynamic>? metadata,
  }) {
    return PaymentModel(
      id: id ?? this.id,
      subscriptionId: subscriptionId ?? this.subscriptionId,
      amount: amount ?? this.amount,
      method: method ?? this.method,
      status: status ?? this.status,
      transactionId: transactionId ?? this.transactionId,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      reference: reference ?? this.reference,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      failureReason: failureReason ?? this.failureReason,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is PaymentModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'PaymentModel(id: $id, amount: $amount, method: $method, status: $status)';
  }
}
