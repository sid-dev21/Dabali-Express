class SchoolModel {
  final String id;
  final String name;
  final String? city;
  final String? address;

  SchoolModel({
    required this.id,
    required this.name,
    this.city,
    this.address,
  });

  factory SchoolModel.fromJson(Map<String, dynamic> json) {
    return SchoolModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      city: json['city']?.toString(),
      address: json['address']?.toString(),
    );
  }
}
