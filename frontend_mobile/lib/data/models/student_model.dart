class StudentModel {
  final int id;
  final String firstName;
  final String lastName;
  final String? className;
  final int schoolId;
  final int parentId;
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
    return StudentModel(
      id: json['id'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      className: json['class_name'],
      schoolId: json['school_id'],
      parentId: json['parent_id'],
      photoUrl: json['photo_url'],
      school: json['school'] != null 
          ? SchoolInfo.fromJson(json['school']) 
          : null,
      activeSubscription: json['active_subscription'] != null
          ? SubscriptionInfo.fromJson(json['active_subscription'])
          : null,
    );
  }

  String get fullName => '$firstName $lastName';
  bool get hasActiveSubscription => activeSubscription != null;
}

// Info école (nested dans Student)
class SchoolInfo {
  final int id;
  final String name;

  SchoolInfo({required this.id, required this.name});

  factory SchoolInfo.fromJson(Map<String, dynamic> json) {
    return SchoolInfo(
      id: json['id'],
      name: json['name'],
    );
  }
}

// Info abonnement (nested dans Student)
class SubscriptionInfo {
  final int id;
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
      id: json['id'],
      type: json['type'],
      status: json['status'],
      endDate: json['end_date'],
    );
  }

  String get typeLabel {
    switch (type) {
      case 'DAILY': return 'Journalier';
      case 'WEEKLY': return 'Hebdomadaire';
      case 'MONTHLY': return 'Mensuel';
      case 'TRIMESTER': return 'Trimestriel';
      default: return type;
    }
  }

  String get statusLabel {
    switch (status) {
      case 'ACTIVE': return 'Actif';
      case 'EXPIRED': return 'Expiré';
      case 'SUSPENDED': return 'Suspendu';
      default: return status;
    }
  }
}