class Child {
  final String id;
  final String firstName;
  final String lastName;
  final String dateOfBirth;
  final String className;
  final String schoolId;
  final String schoolName;
  final String parentId;
  final String status; // pending, approved, rejected
  final String? photoUrl;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Child({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.dateOfBirth,
    required this.className,
    required this.schoolId,
    required this.schoolName,
    required this.parentId,
    required this.status,
    this.photoUrl,
    this.createdAt,
    this.updatedAt,
  });

  factory Child.fromJson(Map<String, dynamic> json) {
    return Child(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      dateOfBirth: json['dateOfBirth'] as String? ?? '',
      className: json['className'] as String? ?? '',
      schoolId: json['schoolId'] as String? ?? '',
      schoolName: json['schoolName'] as String? ?? '',
      parentId: json['parentId'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      photoUrl: json['photoUrl'] as String?,
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
      'firstName': firstName,
      'lastName': lastName,
      'dateOfBirth': dateOfBirth,
      'className': className,
      'schoolId': schoolId,
      'schoolName': schoolName,
      'parentId': parentId,
      'status': status,
      'photoUrl': photoUrl,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Child copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? className,
    String? schoolId,
    String? schoolName,
    String? parentId,
    String? status,
    String? photoUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Child(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      className: className ?? this.className,
      schoolId: schoolId ?? this.schoolId,
      schoolName: schoolName ?? this.schoolName,
      parentId: parentId ?? this.parentId,
      status: status ?? this.status,
      photoUrl: photoUrl ?? this.photoUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  String get fullName => '$firstName $lastName';

  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';

  String get statusDisplay {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'approved':
        return 'Validé';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Child && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'Child(id: $id, fullName: $fullName, status: $status)';
  }
}
