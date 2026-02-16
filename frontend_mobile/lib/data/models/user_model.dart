class UserModel {
  final String id;
  final String email;
  final String role;
  final String firstName;
  final String lastName;
  final String? phone;

  UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.firstName,
    required this.lastName,
    this.phone,
  });

  // Créer depuis JSON (réponse API backend)
  factory UserModel.fromJson(Map<String, dynamic> json) {
    final resolvedId = (json['id'] ?? json['_id'] ?? '').toString();
    return UserModel(
      id: resolvedId,
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      firstName: (json['first_name'] ?? json['firstName'] ?? '').toString(),
      lastName: (json['last_name'] ?? json['lastName'] ?? '').toString(),
      phone: json['phone']?.toString(),
    );
  }

  // Convertir en JSON (pour envoyer au backend)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role,
      'first_name': firstName,
      'last_name': lastName,
      'phone': phone,
    };
  }

  String get fullName => '$firstName $lastName';
}
