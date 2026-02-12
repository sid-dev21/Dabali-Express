class MenuModel {
  final String id;
  final String schoolId;
  final String date;
  final List<MealItem> meals;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  MenuModel({
    required this.id,
    required this.schoolId,
    required this.date,
    required this.meals,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    final mealsList = <MealItem>[];
    if (json['meals'] != null) {
      final mealsData = json['meals'] as List;
      mealsList.addAll(mealsData.map((meal) => MealItem.fromJson(meal)));
    }

    return MenuModel(
      id: json['id']?.toString() ?? '',
      schoolId: json['school_id']?.toString() ?? json['schoolId'] ?? '',
      date: json['date'] ?? '',
      meals: mealsList,
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
      'school_id': schoolId,
      'date': date,
      'meals': meals.map((meal) => meal.toJson()).toList(),
      'notes': notes,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  DateTime? get parsedDate {
    try {
      return DateTime.parse(date);
    } catch (e) {
      return null;
    }
  }

  String get formattedDate {
    final dt = parsedDate;
    if (dt == null) return date;
    
    final months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  MenuModel copyWith({
    String? id,
    String? schoolId,
    String? date,
    List<MealItem>? meals,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return MenuModel(
      id: id ?? this.id,
      schoolId: schoolId ?? this.schoolId,
      date: date ?? this.date,
      meals: meals ?? this.meals,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is MenuModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'MenuModel(id: $id, schoolId: $schoolId, date: $date, meals: ${meals.length})';
  }
}

class MealItem {
  final String id;
  final String name;
  final String description;
  final String category; // ENTREE, PLAT, DESSERT, BOISSON
  final List<String> ingredients;
  final String? imageUrl;
  final bool isAvailable;
  final double? price;

  MealItem({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.ingredients,
    this.imageUrl,
    required this.isAvailable,
    this.price,
  });

  factory MealItem.fromJson(Map<String, dynamic> json) {
    final ingredientsList = <String>[];
    if (json['ingredients'] != null) {
      final ingredientsData = json['ingredients'] as List;
      ingredientsList.addAll(ingredientsData.map((ing) => ing.toString()));
    }

    return MealItem(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'PLAT',
      ingredients: ingredientsList,
      imageUrl: json['image_url']?.toString() ?? json['imageUrl'],
      isAvailable: json['is_available'] ?? json['isAvailable'] ?? true,
      price: json['price']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'category': category,
      'ingredients': ingredients,
      'image_url': imageUrl,
      'is_available': isAvailable,
      'price': price,
    };
  }

  String get categoryDisplayName {
    switch (category) {
      case 'ENTREE':
        return 'Entrée';
      case 'PLAT':
        return 'Plat principal';
      case 'DESSERT':
        return 'Dessert';
      case 'BOISSON':
        return 'Boisson';
      default:
        return category;
    }
  }

  MealItem copyWith({
    String? id,
    String? name,
    String? description,
    String? category,
    List<String>? ingredients,
    String? imageUrl,
    bool? isAvailable,
    double? price,
  }) {
    return MealItem(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      category: category ?? this.category,
      ingredients: ingredients ?? this.ingredients,
      imageUrl: imageUrl ?? this.imageUrl,
      isAvailable: isAvailable ?? this.isAvailable,
      price: price ?? this.price,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is MealItem && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'MealItem(id: $id, name: $name, category: $category, isAvailable: $isAvailable)';
  }
}
