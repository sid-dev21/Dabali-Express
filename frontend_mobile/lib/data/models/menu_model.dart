class MenuModel {
  final String id;
  final String schoolId;
  final String date;
  final String mealType;
  final String? description;
  final List<String> items;

  MenuModel({
    required this.id,
    required this.schoolId,
    required this.date,
    required this.mealType,
    this.description,
    required this.items,
  });

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    final schoolValue = json['school_id'];
    return MenuModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      schoolId: _stringId(schoolValue),
      date: _normalizeDate((json['date'] ?? '').toString()),
      mealType: (json['meal_type'] ?? '').toString(),
      description: json['description'],
      items: json['items'] != null
          ? List<String>.from(json['items'])
          : [],
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

  // Nom du jour en français
  String get dayName {
    final dateTime = DateTime.parse(date);
    const days = [
      'Lundi', 'Mardi', 'Mercredi',
      'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
    ];
    return days[dateTime.weekday - 1];
  }

  // Date formatée
  String get formattedDate {
    final dateTime = DateTime.parse(date);
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  String get mealTypeLabel {
    switch (mealType) {
      case 'BREAKFAST': return 'Petit déjeuner';
      case 'LUNCH': return 'Déjeuner';
      case 'DINNER': return 'Dîner';
      default: return mealType;
    }
  }
}
