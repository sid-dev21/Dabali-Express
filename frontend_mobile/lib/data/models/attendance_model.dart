class AttendanceModel {
  final int id;
  final int studentId;
  final int menuId;
  final String date;
  final bool present;

  AttendanceModel({
    required this.id,
    required this.studentId,
    required this.menuId,
    required this.date,
    required this.present,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'],
      studentId: json['student_id'],
      menuId: json['menu_id'],
      date: json['date'],
      present: json['present'] ?? false,
    );
  }

  String get formattedDate {
    final dateTime = DateTime.parse(date);
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  String get presenceLabel => present ? 'Présent' : 'Absent';
}