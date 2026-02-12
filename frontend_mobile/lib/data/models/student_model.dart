class StudentModel {
  final String id;
  final String firstName;
  final String lastName;
  final String? className;
  final String schoolId;
  final String parentId;
  final String? photoUrl;
  final SchoolInfo? school;
  final SubscriptionInfo? activeSubscription;

  StudentModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.className,
    required this.schoolId,
    required this.parentId,
    this.photoUrl,
    this.school,
    this.activeSubscription,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    final schoolValue = json['school_id'];
    final schoolPayload = json['school'] is Map<String, dynamic>
        ? json['school'] as Map<String, dynamic>
        : (schoolValue is Map<String, dynamic> ? schoolValue : null);
    final parentValue = json['parent_id'];
    return StudentModel(
      id: _stringId(json['id'] ?? json['_id']),
      firstName: json['first_name'],
      lastName: json['last_name'],
      className: json['class_name'],
      schoolId: _stringId(schoolValue),
      parentId: _stringId(parentValue),
      photoUrl: json['photo_url'],
      school: schoolPayload != null ? SchoolInfo.fromJson(schoolPayload) : null,
      activeSubscription: json['active_subscription'] != null
          ? SubscriptionInfo.fromJson(json['active_subscription'])
          : null,
    );
  }

  static String _stringId(dynamic raw) {
    if (raw == null) return '';
    if (raw is Map<String, dynamic>) {
      return (raw['_id'] ?? raw['id'] ?? '').toString();
    }
    return raw.toString();
  }

  String get fullName => '$firstName $lastName';
  bool get hasActiveSubscription => activeSubscription != null;
}

// Info école (nested dans Student)
class SchoolInfo {
  final String id;
  final String name;

  SchoolInfo({required this.id, required this.name});

  factory SchoolInfo.fromJson(Map<String, dynamic> json) {
    return SchoolInfo(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
    );
  }
}

// Info abonnement (nested dans Student)
class SubscriptionInfo {
  final String id;
  final String type;
  final String status;
  final String endDate;

  SubscriptionInfo({
    required this.id,
    required this.type,
    required this.status,
    required this.endDate,
  });

  factory SubscriptionInfo.fromJson(Map<String, dynamic> json) {
    return SubscriptionInfo(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      type: (json['type'] ?? json['meal_plan'] ?? 'STANDARD').toString(),
      status: json['status'],
      endDate: (json['end_date'] ?? '').toString(),
    );
  }

  String get typeLabel {
    switch (type) {
      case 'STANDARD': return 'Standard';
      case 'PREMIUM': return 'Premium';
      case 'VEGETARIAN': return 'Végétarien';
      default: return type;
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
}
