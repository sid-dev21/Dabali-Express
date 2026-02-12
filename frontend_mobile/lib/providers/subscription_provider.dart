import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import '../data/repositories/subscription_repository.dart';
import '../data/models/subscription_model.dart';

class SubscriptionProvider with ChangeNotifier {
  final SubscriptionRepository _repository = SubscriptionRepository();

  List<SubscriptionModel> _subscriptions = [];
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  // Getters
  List<SubscriptionModel> get subscriptions => _subscriptions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get successMessage => _successMessage;
  bool get hasSubscriptions => _subscriptions.isNotEmpty;

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

  // ===== LOAD SUBSCRIPTIONS BY STUDENT =====
  Future<void> loadSubscriptions(String studentId) async {
    _isLoading = true;
    _errorMessage = null;
    _notifySafely();

    try {
      _subscriptions = await _repository.getSubscriptionsByStudent(studentId);
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Erreur lors du chargement des abonnements';
      _notifySafely();
    }
  }

  // ===== CREATE SUBSCRIPTION =====
  Future<bool> createSubscription({
    required String studentId,
    required String mealPlan,
    required String startDate,
    required double price,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    _successMessage = null;
    _notifySafely();

    final result = await _repository.createSubscription(
      studentId: studentId,
      mealPlan: mealPlan,
      startDate: startDate,
      price: price,
    );

    _isLoading = false;

    if (result['success'] == true) {
      _successMessage = 'Abonnement créé avec succès';
      // Recharger les abonnements
      await loadSubscriptions(studentId);
      _notifySafely();
      return true;
    } else {
      _errorMessage = result['message'];
      _notifySafely();
      return false;
    }
  }

  // ===== GET ACTIVE SUBSCRIPTION =====
  SubscriptionModel? getActiveSubscription() {
    try {
      return _subscriptions.firstWhere((sub) => sub.isActive);
    } catch (e) {
      return null;
    }
  }

  // ===== CLEAR MESSAGES =====
  void clearMessages() {
    _errorMessage = null;
    _successMessage = null;
    _notifySafely();
  }
}
