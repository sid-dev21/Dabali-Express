class SchoolModel {
  final String id;
  final String name;
  final String address;
  final String city;
  final String? adminName;
  final String? adminPhone;
  final String? adminEmail;
  final int studentCount;
  final String status; // active, inactive
  final DateTime? createdAt;
  final DateTime? updatedAt;

  SchoolModel({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    this.adminName,
    this.adminPhone,
    this.adminEmail,
    required this.studentCount,
    required this.status,
    this.createdAt,
    this.updatedAt,
  });

  factory SchoolModel.fromJson(Map<String, dynamic> json) {
    return SchoolModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      adminName: json['admin_name']?.toString() ?? json['adminName'],
      adminPhone: json['admin_phone']?.toString() ?? json['adminPhone'],
      adminEmail: json['admin_email']?.toString() ?? json['adminEmail'],
      studentCount: json['student_count'] ?? json['studentCount'] ?? 0,
      status: json['status'] ?? 'inactive',
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
      'name': name,
      'address': address,
      'city': city,
      'admin_name': adminName,
      'admin_phone': adminPhone,
      'admin_email': adminEmail,
      'student_count': studentCount,
      'status': status,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  String get fullAddress => '$address, $city';

  bool get isActive => status == 'active';
  bool get isInactive => status == 'inactive';

  String get statusDisplayName {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      default:
        return 'Inconnu';
    }
  }

  SchoolModel copyWith({
    String? id,
    String? name,
    String? address,
    String? city,
    String? adminName,
    String? adminPhone,
    String? adminEmail,
    int? studentCount,
    String? status,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SchoolModel(
      id: id ?? this.id,
      name: name ?? this.name,
      address: address ?? this.address,
      city: city ?? this.city,
      adminName: adminName ?? this.adminName,
      adminPhone: adminPhone ?? this.adminPhone,
      adminEmail: adminEmail ?? this.adminEmail,
      studentCount: studentCount ?? this.studentCount,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is SchoolModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'SchoolModel(id: $id, name: $name, city: $city, status: $status, studentCount: $studentCount)';
  }
}
