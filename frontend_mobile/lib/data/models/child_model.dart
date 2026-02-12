class ChildModel {
  final String id;
  final String firstName;
  final String lastName;
  final String dateOfBirth;
  final String className;
  final String parentId;
  final String? schoolId;
  final String status; // PENDING, APPROVED, REJECTED
  final String? qrCode;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ChildModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.dateOfBirth,
    required this.className,
    required this.parentId,
    this.schoolId,
    required this.status,
    this.qrCode,
    this.createdAt,
    this.updatedAt,
  });

  factory ChildModel.fromJson(Map<String, dynamic> json) {
    return ChildModel(
      id: json['id']?.toString() ?? '',
      firstName: json['first_name'] ?? json['firstName'] ?? '',
      lastName: json['last_name'] ?? json['lastName'] ?? '',
      dateOfBirth: json['date_of_birth'] ?? json['dateOfBirth'] ?? '',
      className: json['class_name'] ?? json['className'] ?? '',
      parentId: json['parent_id']?.toString() ?? json['parentId'] ?? '',
      schoolId: json['school_id']?.toString(),
      status: json['status'] ?? 'PENDING',
      qrCode: json['qr_code']?.toString() ?? json['qrCode'],
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'first_name': firstName,
      'last_name': lastName,
      'date_of_birth': dateOfBirth,
      'class_name': className,
      'parent_id': parentId,
      'school_id': schoolId,
      'status': status,
      'qr_code': qrCode,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  String get fullName => '$firstName $lastName';

  bool get isApproved => status == 'APPROVED';
  bool get isPending => status == 'PENDING';
  bool get isRejected => status == 'REJECTED';

  ChildModel copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? className,
    String? parentId,
    String? schoolId,
    String? status,
    String? qrCode,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ChildModel(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      className: className ?? this.className,
      parentId: parentId ?? this.parentId,
      schoolId: schoolId ?? this.schoolId,
      status: status ?? this.status,
      qrCode: qrCode ?? this.qrCode,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ChildModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'ChildModel(id: $id, firstName: $firstName, lastName: $lastName, className: $className, status: $status)';
  }
}
