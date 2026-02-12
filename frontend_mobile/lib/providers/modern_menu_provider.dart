import 'package:flutter/foundation.dart';
import '../data/services/menu_service.dart';
import '../data/models/menu.dart';
import '../data/services/modern_api_service.dart';

class ModernMenuProvider extends ChangeNotifier {
  final MenuService _menuService;
  List<Menu> _menus = [];
  List<MenuAttendance> _attendanceHistory = [];
  bool _isLoading = false;
  String? _errorMessage;

  ModernMenuProvider(this._menuService);

  // Getters
  List<Menu> get menus => List.unmodifiable(_menus);
  List<MenuAttendance> get attendanceHistory => List.unmodifiable(_attendanceHistory);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasMenus => _menus.isNotEmpty;

  // Obtenir le menu pour une date spécifique
  Menu? getMenuForDate(DateTime date) {
    try {
      return _menus.firstWhere((menu) => menu.date == date.toIso8601String().split('T')[0]);
    } catch (e) {
      return null;
    }
  }

  // Obtenir les menus à venir
  List<Menu> getUpcomingMenus({int days = 7}) {
    final now = DateTime.now();
    return _menus
        .where((menu) => menu.isFuture && menu.date != now.toIso8601String().split('T')[0])
        .take(days)
        .toList();
  }

  // Obtenir les menus passés
  List<Menu> getPastMenus({int days = 7}) {
    return _menus
        .where((menu) => menu.isPast)
        .take(days)
        .toList();
  }

  // Obtenir le menu du jour
  Menu? getTodayMenu({String? schoolId}) {
    final today = DateTime.now().toIso8601String().split('T')[0];
    try {
      return _menus.firstWhere((menu) => menu.date == today);
    } catch (e) {
      return null;
    }
  }

  // Charger tous les menus
  Future<bool> loadMenus({
    String? schoolId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _menuService.getMenus(
        schoolId: schoolId,
        startDate: startDate,
        endDate: endDate,
        limit: limit,
      );

      if (response.success && response.data != null) {
        _menus = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du chargement des menus');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Charger le menu du jour
  Future<bool> loadTodayMenu({String? schoolId}) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _menuService.getTodayMenu(schoolId: schoolId);

      if (response.success && response.data != null) {
        // Remplacer ou ajouter le menu du jour
        final today = DateTime.now().toIso8601String().split('T')[0];
        _menus.removeWhere((menu) => menu.date == today);
        _menus.add(response.data!);
        _menus.sort((a, b) => a.date.compareTo(b.date));
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du chargement du menu du jour');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Marquer la présence d'un enfant
  Future<bool> markAttendance({
    required String menuId,
    required String childId,
    required bool wasPresent,
    String? notes,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _menuService.markAttendance(
        menuId: menuId,
        childId: childId,
        wasPresent: wasPresent,
        notes: notes,
      );

      if (response.success && response.data != null) {
        // Ajouter à l'historique
        _attendanceHistory.insert(0, response.data!);
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du marquage de la présence');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Obtenir les présences pour un menu
  Future<bool> loadMenuAttendance(String menuId) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _menuService.getMenuAttendance(menuId);

      if (response.success && response.data != null) {
        _attendanceHistory = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du chargement des présences');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Obtenir l'historique de présence d'un enfant
  Future<bool> loadChildAttendanceHistory(
    String childId, {
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _menuService.getChildAttendance(
        childId,
        startDate: startDate,
        endDate: endDate,
        limit: limit,
      );

      if (response.success && response.data != null) {
        _attendanceHistory = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du chargement de l\'historique');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Obtenir les statistiques de présence d'un enfant
  Future<Map<String, dynamic>?> getChildAttendanceStats(
    String childId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final response = await _menuService.getChildAttendanceStats(
        childId,
        startDate: startDate,
        endDate: endDate,
      );
      
      if (response.success && response.data != null) {
        return response.data!;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Obtenir les menus à venir pour notifications
  Future<bool> loadUpcomingMenus({String? schoolId, int days = 7}) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _menuService.getUpcomingMenus(
        schoolId: schoolId,
        days: days,
      );

      if (response.success && response.data != null) {
        _menus = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du chargement des menus à venir');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Rafraîchir les menus
  Future<bool> refreshMenus({String? schoolId}) async {
    return await loadMenus(schoolId: schoolId);
  }

  // Rafraîchir le menu du jour
  Future<bool> refreshTodayMenu({String? schoolId}) async {
    return await loadTodayMenu(schoolId: schoolId);
  }

  // Vider les données (pour la déconnexion)
  void clearMenus() {
    _menus.clear();
    _attendanceHistory.clear();
    notifyListeners();
  }

  // Obtenir les présences pour un enfant spécifique
  List<MenuAttendance> getChildAttendance(String childId) {
    return _attendanceHistory.where((attendance) => attendance.childId == childId).toList();
  }

  // Calculer les statistiques de présence
  Map<String, int> calculateAttendanceStats(String childId) {
    final childAttendance = getChildAttendance(childId);
    final total = childAttendance.length;
    final present = childAttendance.where((a) => a.wasPresent).length;
    final absent = total - present;
    
    return {
      'total': total,
      'present': present,
      'absent': absent,
      'percentage': total > 0 ? ((present / total) * 100).round() : 0,
    };
  }

  // Méthodes privées
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _errorMessage = error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  String _getErrorMessage(dynamic error) {
    if (error is ApiException) {
      return error.message;
    } else if (error is NetworkException) {
      return 'Erreur de connexion. Vérifiez votre internet.';
    } else if (error is ServerException) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (error is ValidationException) {
      return error.errors?.join(', ') ?? error.message;
    } else {
      return 'Une erreur inattendue est survenue.';
    }
  }

  @override
  void dispose() {
    super.dispose();
  }
}
