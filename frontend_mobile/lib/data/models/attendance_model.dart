enum AttendanceStatus { PRESENT, ABSENT, LATE, EXCUSED }

class AttendanceModel {
  final String id;
  final String childId;
  final String menuId;
  final AttendanceStatus status;
  final DateTime date;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  AttendanceModel({
    required this.id,
    required this.childId,
    required this.menuId,
    required this.status,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id']?.toString() ?? '',
      childId: json['child_id']?.toString() ?? json['childId'] ?? '',
      menuId: json['menu_id']?.toString() ?? json['menuId'] ?? '',
      status: _parseAttendanceStatus(json['status'] ?? json['attendance_status']),
      date: DateTime.parse(json['date'] ?? json['attendance_date']),
      checkInTime: json['check_in_time'] != null 
          ? DateTime.parse(json['check_in_time']) 
          : json['checkInTime'] != null 
              ? DateTime.parse(json['checkInTime'])
              : null,
      checkOutTime: json['check_out_time'] != null 
          ? DateTime.parse(json['check_out_time']) 
          : json['checkOutTime'] != null 
              ? DateTime.parse(json['checkOutTime'])
              : null,
      notes: json['notes']?.toString(),
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
      'child_id': childId,
      'menu_id': menuId,
      'attendance_status': status.name,
      'attendance_date': date.toIso8601String(),
      'check_in_time': checkInTime?.toIso8601String(),
      'check_out_time': checkOutTime?.toIso8601String(),
      'notes': notes,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  static AttendanceStatus _parseAttendanceStatus(String status) {
    switch (status.toUpperCase()) {
      case 'PRESENT':
        return AttendanceStatus.PRESENT;
      case 'ABSENT':
        return AttendanceStatus.ABSENT;
      case 'LATE':
        return AttendanceStatus.LATE;
      case 'EXCUSED':
        return AttendanceStatus.EXCUSED;
      default:
        return AttendanceStatus.ABSENT;
    }
  }

  String get statusDisplayName {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'Présent';
      case AttendanceStatus.ABSENT:
        return 'Absent';
      case AttendanceStatus.LATE:
        return 'En retard';
      case AttendanceStatus.EXCUSED:
        return 'Excusé';
    }
  }

  bool get isPresent => status == AttendanceStatus.PRESENT;
  bool get isAbsent => status == AttendanceStatus.ABSENT;
  bool get isLate => status == AttendanceStatus.LATE;
  bool get isExcused => status == AttendanceStatus.EXCUSED;

  String get formattedDate {
    final months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  String get formattedCheckInTime {
    if (checkInTime == null) return '--:--';
    return '${checkInTime!.hour.toString().padLeft(2, '0')}:${checkInTime!.minute.toString().padLeft(2, '0')}';
  }

  String get formattedCheckOutTime {
    if (checkOutTime == null) return '--:--';
    return '${checkOutTime!.hour.toString().padLeft(2, '0')}:${checkOutTime!.minute.toString().padLeft(2, '0')}';
  }

  Duration? get duration {
    if (checkInTime == null || checkOutTime == null) return null;
    return checkOutTime!.difference(checkInTime!);
  }

  String get formattedDuration {
    final dur = duration;
    if (dur == null) return '--';
    
    final hours = dur.inHours;
    final minutes = dur.inMinutes % 60;
    
    if (hours > 0) {
      return '${hours}h ${minutes}min';
    } else {
      return '${minutes}min';
    }
  }

  AttendanceModel copyWith({
    String? id,
    String? childId,
    String? menuId,
    AttendanceStatus? status,
    DateTime? date,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return AttendanceModel(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      menuId: menuId ?? this.menuId,
      status: status ?? this.status,
      date: date ?? this.date,
      checkInTime: checkInTime ?? this.checkInTime,
      checkOutTime: checkOutTime ?? this.checkOutTime,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AttendanceModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'AttendanceModel(id: $id, childId: $childId, status: $status, date: $date)';
  }
}
