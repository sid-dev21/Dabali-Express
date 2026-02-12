class SubscriptionModel {
  final String id;
  final String studentId;
  final String startDate;
  final String endDate;
  final String mealPlan;
  final double price;
  final String status;

  SubscriptionModel({
    required this.id,
    required this.studentId,
    required this.startDate,
    required this.endDate,
    required this.mealPlan,
    required this.price,
    required this.status,
  });

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    final studentValue = json['student_id'];
    return SubscriptionModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      studentId: _stringId(studentValue),
      startDate: _normalizeDate((json['start_date'] ?? '').toString()),
      endDate: _normalizeDate((json['end_date'] ?? '').toString()),
      mealPlan: (json['meal_plan'] ?? json['type'] ?? 'STANDARD').toString(),
      price: double.parse((json['price'] ?? json['amount'] ?? 0).toString()),
      status: (json['status'] ?? '').toString(),
    );
  }

  static String _stringId(dynamic raw) {
    if (raw == null) return '';
    if (raw is Map<String, dynamic>) {
      return (raw['_id'] ?? raw['id'] ?? '').toString();
    }
    return raw.toString();
  }

  static String _normalizeDate(String raw) {
    if (raw.isEmpty) return raw;
    return raw.length >= 10 ? raw.substring(0, 10) : raw;
  }

  String get typeLabel {
    switch (mealPlan) {
      case 'STANDARD': return 'Standard';
      case 'PREMIUM': return 'Premium';
      case 'VEGETARIAN': return 'Végétarien';
      default: return mealPlan;
    }
  }

  String get statusLabel {
    switch (status) {
      case 'ACTIVE': return 'Actif';
      case 'EXPIRED': return 'Expiré';
      case 'CANCELLED': return 'Annulé';
      default: return status;
    }
  }

  String get formattedAmount {
    return '${price.toStringAsFixed(0)} FCFA';
  }

  bool get isActive => status == 'ACTIVE';
}
