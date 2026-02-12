import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import '../data/repositories/menu_repository.dart';
import '../data/models/menu_model.dart';

class MenuProvider with ChangeNotifier {
  final MenuRepository _repository = MenuRepository();

  List<MenuModel> _menus = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  List<MenuModel> get menus => _menus;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasMenus => _menus.isNotEmpty;

  void _notifySafely() {
    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.persistentCallbacks ||
        phase == SchedulerPhase.transientCallbacks ||
        phase == SchedulerPhase.midFrameMicrotasks) {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return;
    }
    notifyListeners();
  }

  // ===== LOAD WEEK MENU =====
  Future<void> loadWeekMenu(String schoolId) async {
    _isLoading = true;
    _errorMessage = null;
    _notifySafely();

    try {
      _menus = await _repository.getWeekMenu(schoolId);
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Erreur lors du chargement des menus';
      _notifySafely();
    }
  }

  // ===== LOAD MENUS BY DATE RANGE =====
  Future<void> loadMenus({
    required String schoolId,
    String? startDate,
    String? endDate,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    _notifySafely();

    try {
      _menus = await _repository.getMenus(
        schoolId: schoolId,
        startDate: startDate,
        endDate: endDate,
      );
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Erreur lors du chargement des menus';
      _notifySafely();
    }
  }

  // ===== GET MENU BY DATE =====
  MenuModel? getMenuByDate(String date) {
    try {
      return _menus.firstWhere((menu) => menu.date == date);
    } catch (e) {
      return null;
    }
  }

  // ===== CLEAR ERROR =====
  void clearError() {
    _errorMessage = null;
    _notifySafely();
  }
}
