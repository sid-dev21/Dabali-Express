class Menu {
  final String id;
  final String date;
  final String mainDish;
  final List<String> sideDishes;
  final List<String> fruits;
  final List<String> drinks;
  final String schoolId;
  final String? notes;
  final bool isAvailable;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Menu({
    required this.id,
    required this.date,
    required this.mainDish,
    required this.sideDishes,
    required this.fruits,
    required this.drinks,
    required this.schoolId,
    this.notes,
    required this.isAvailable,
    this.createdAt,
    this.updatedAt,
  });

  factory Menu.fromJson(Map<String, dynamic> json) {
    return Menu(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      date: json['date'] as String? ?? '',
      mainDish: json['mainDish'] as String? ?? '',
      sideDishes: (json['sideDishes'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList() ?? [],
      fruits: (json['fruits'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList() ?? [],
      drinks: (json['drinks'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList() ?? [],
      schoolId: json['schoolId'] as String? ?? '',
      notes: json['notes'] as String?,
      isAvailable: json['isAvailable'] as bool? ?? true,
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
      'date': date,
      'mainDish': mainDish,
      'sideDishes': sideDishes,
      'fruits': fruits,
      'drinks': drinks,
      'schoolId': schoolId,
      'notes': notes,
      'isAvailable': isAvailable,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Menu copyWith({
    String? id,
    String? date,
    String? mainDish,
    List<String>? sideDishes,
    List<String>? fruits,
    List<String>? drinks,
    String? schoolId,
    String? notes,
    bool? isAvailable,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Menu(
      id: id ?? this.id,
      date: date ?? this.date,
      mainDish: mainDish ?? this.mainDish,
      sideDishes: sideDishes ?? this.sideDishes,
      fruits: fruits ?? this.fruits,
      drinks: drinks ?? this.drinks,
      schoolId: schoolId ?? this.schoolId,
      notes: notes ?? this.notes,
      isAvailable: isAvailable ?? this.isAvailable,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  String get formattedDate {
    try {
      final dateTime = DateTime.parse(date);
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      return '${days[dateTime.weekday - 1]} ${dateTime.day} ${months[dateTime.month - 1]}';
    } catch (e) {
      return date;
    }
  }

  bool get isToday {
    try {
      final today = DateTime.now();
      final menuDate = DateTime.parse(date);
      return menuDate.year == today.year &&
             menuDate.month == today.month &&
             menuDate.day == today.day;
    } catch (e) {
      return false;
    }
  }

  bool get isPast {
    try {
      final today = DateTime.now();
      final menuDate = DateTime.parse(date);
      return menuDate.isBefore(today);
    } catch (e) {
      return false;
    }
  }

  bool get isFuture {
    try {
      final today = DateTime.now();
      final menuDate = DateTime.parse(date);
      return menuDate.isAfter(today);
    } catch (e) {
      return false;
    }
  }

  List<String> get allItems {
    return [mainDish, ...sideDishes, ...fruits, ...drinks];
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Menu && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'Menu(id: $id, date: $date, mainDish: $mainDish)';
  }
}

class MenuAttendance {
  final String id;
  final String menuId;
  final String childId;
  final bool wasPresent;
  final String? notes;
  final DateTime? createdAt;

  const MenuAttendance({
    required this.id,
    required this.menuId,
    required this.childId,
    required this.wasPresent,
    this.notes,
    this.createdAt,
  });

  factory MenuAttendance.fromJson(Map<String, dynamic> json) {
    return MenuAttendance(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      menuId: json['menuId'] as String? ?? '',
      childId: json['childId'] as String? ?? '',
      wasPresent: json['wasPresent'] as bool? ?? false,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'menuId': menuId,
      'childId': childId,
      'wasPresent': wasPresent,
      'notes': notes,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is MenuAttendance && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'MenuAttendance(id: $id, wasPresent: $wasPresent)';
  }
}
