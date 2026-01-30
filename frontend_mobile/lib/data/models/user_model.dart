class UserModel {
  final int id;
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
    return UserModel(
      id: json['id'],
      email: json['email'],
      role: json['role'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      phone: json['phone'],
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