class AttendanceModel {
  final String id;
  final String studentId;
  final String? menuId;
  final String date;
  final bool present;
  final String? mealType;
  final String? menuDescription;

  AttendanceModel({
    required this.id,
    required this.studentId,
    this.menuId,
    required this.date,
    required this.present,
    this.mealType,
    this.menuDescription,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    final menuRaw = json['menu_id'];
    final menuId = _stringId(menuRaw);
    final studentId = _stringId(json['student_id']) ?? '';
    return AttendanceModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      studentId: studentId,
      menuId: menuId?.isEmpty == true ? null : menuId,
      date: json['date']?.toString() ?? '',
      present: json['present'] ?? false,
      mealType: menuRaw is Map<String, dynamic> ? menuRaw['meal_type']?.toString() : null,
      menuDescription: menuRaw is Map<String, dynamic> ? menuRaw['description']?.toString() : null,
    );
  }

  static String? _stringId(dynamic raw) {
    if (raw == null) return null;
    if (raw is Map<String, dynamic>) {
      return (raw['_id'] ?? raw['id'] ?? '').toString();
    }
    return raw.toString();
  }

  String get formattedDate {
    final dateTime = DateTime.parse(date);
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  String get presenceLabel => present ? 'Présent' : 'Absent';
}
