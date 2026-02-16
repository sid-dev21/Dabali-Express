class ChildModel {
  final String id;
  final String firstName;
  final String lastName;
  final String dateOfBirth;
  final String className;
  final String parentId;
  final String? schoolId;
  final String? studentCode;
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
    this.studentCode,
    required this.status,
    this.qrCode,
    this.createdAt,
    this.updatedAt,
  });

  factory ChildModel.fromJson(Map<String, dynamic> json) {
    final parentId = _extractParentId(json['parent_id'] ?? json['parentId']);
    return ChildModel(
      id: _extractId(json),
      firstName: (json['first_name'] ?? json['firstName'] ?? '').toString(),
      lastName: (json['last_name'] ?? json['lastName'] ?? '').toString(),
      dateOfBirth: (json['date_of_birth'] ?? json['dateOfBirth'] ?? json['birth_date'] ?? json['birthDate'] ?? '').toString(),
      className: (json['class_name'] ?? json['className'] ?? '').toString(),
      parentId: parentId,
      schoolId: _extractSchoolId(json['school_id'] ?? json['schoolId']),
      studentCode: json['student_code']?.toString() ?? json['studentCode'],
      status: _normalizeStatus(json['status'], parentId: parentId),
      qrCode: json['qr_code']?.toString() ?? json['qrCode'],
      createdAt: _parseDate(json['created_at'] ?? json['createdAt']),
      updatedAt: _parseDate(json['updated_at'] ?? json['updatedAt']),
    );
  }

  static final RegExp _objectIdPattern = RegExp(r'[a-fA-F0-9]{24}');

  static String? _extractSchoolId(dynamic rawSchool) {
    if (rawSchool == null) return null;

    if (rawSchool is Map<String, dynamic>) {
      final nestedId = rawSchool['_id'] ?? rawSchool['id'];
      return nestedId?.toString();
    }

    final asString = rawSchool.toString().trim();
    if (asString.isEmpty) return null;

    final matchedId = _objectIdPattern.firstMatch(asString)?.group(0);
    return matchedId ?? asString;
  }

  static String _extractId(Map<String, dynamic> json) {
    final candidates = <dynamic>[
      json['id'],
      json['_id'],
      json['student_id'],
      json['studentId'],
      json['child_id'],
      json['childId'],
    ];

    for (final candidate in candidates) {
      final value = _extractObjectId(candidate);
      if (value.isNotEmpty) return value;
    }

    return '';
  }

  static String _extractParentId(dynamic rawParent) {
    return _extractObjectId(rawParent);
  }

  static String _extractObjectId(dynamic raw) {
    if (raw == null) return '';
    if (raw is Map<String, dynamic>) {
      return (raw['_id'] ?? raw['id'] ?? '').toString();
    }
    final asString = raw.toString().trim();
    if (asString.isEmpty) return '';
    final matchedId = _objectIdPattern.firstMatch(asString)?.group(0);
    return matchedId ?? asString;
  }

  static String _normalizeStatus(dynamic rawStatus, {required String parentId}) {
    final normalized = (rawStatus ?? '').toString().trim().toUpperCase();
    if (normalized == 'APPROVED' || normalized == 'PENDING' || normalized == 'REJECTED') {
      return normalized;
    }
    // Backend Student does not persist approval status; a claimed/linked child is effectively approved.
    return parentId.isNotEmpty ? 'APPROVED' : 'PENDING';
  }

  static DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    final value = raw.toString().trim();
    if (value.isEmpty) return null;
    return DateTime.tryParse(value);
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
      'student_code': studentCode,
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
    String? studentCode,
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
      studentCode: studentCode ?? this.studentCode,
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
