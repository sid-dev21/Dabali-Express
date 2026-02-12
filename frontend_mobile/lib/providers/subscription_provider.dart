import 'package:flutter/foundation.dart';
import '../data/repositories/subscription_repository.dart';
import '../data/models/subscription_model.dart';

class SubscriptionProvider with ChangeNotifier {
  final SubscriptionRepository _subscriptionRepository = SubscriptionRepository();

  List<SubscriptionModel> _subscriptions = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  List<SubscriptionModel> get subscriptions => _subscriptions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  List<SubscriptionModel> get activeSubscriptions => _subscriptions
      .where((subscription) => subscription.isActive)
      .toList();
  
  List<SubscriptionModel> get pendingSubscriptions => _subscriptions
      .where((subscription) => subscription.isPendingPayment)
      .toList();
  
  List<SubscriptionModel> get expiredSubscriptions => _subscriptions
      .where((subscription) => subscription.isExpired)
      .toList();

  // ===== FETCH SUBSCRIPTIONS =====
  Future<void> fetchSubscriptions() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _subscriptions = await _subscriptionRepository.getSubscriptions();
    } catch (e) {
      _errorMessage = 'Erreur lors de la récupération des abonnements: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  // ===== FETCH SUBSCRIPTIONS BY CHILD =====
  Future<void> fetchSubscriptionsByChild(String childId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _subscriptions = await _subscriptionRepository.getSubscriptionsByChild(childId);
    } catch (e) {
      _errorMessage = 'Erreur lors de la récupération des abonnements: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  // ===== CREATE SUBSCRIPTION =====
  Future<bool> createSubscription({
    required String childId,
    required SubscriptionType type,
    required double amount,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _subscriptionRepository.createSubscription(
        childId: childId,
        type: type,
        amount: amount,
      );

      if (result['success'] == true) {
        _subscriptions.add(result['subscription']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Erreur lors de la création de l\'abonnement';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Erreur lors de la création de l\'abonnement: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ===== GET SUBSCRIPTION DETAILS =====
  Future<SubscriptionModel?> getSubscriptionDetails(String subscriptionId) async {
    try {
      return await _subscriptionRepository.getSubscriptionDetails(subscriptionId);
    } catch (e) {
      _errorMessage = 'Erreur lors de la récupération des détails: $e';
      notifyListeners();
      return null;
    }
  }

  // ===== UPDATE SUBSCRIPTION =====
  Future<bool> updateSubscription(String subscriptionId, {
    SubscriptionType? type,
    SubscriptionStatus? status,
    double? amount,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _subscriptionRepository.updateSubscription(
        subscriptionId,
        type: type,
        status: status,
        amount: amount,
        startDate: startDate,
        endDate: endDate,
      );

      if (result['success'] == true) {
        final index = _subscriptions.indexWhere((sub) => sub.id == subscriptionId);
        if (index != -1) {
          _subscriptions[index] = result['subscription'];
        }
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Erreur lors de la mise à jour';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Erreur lors de la mise à jour: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ===== CANCEL SUBSCRIPTION =====
  Future<bool> cancelSubscription(String subscriptionId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _subscriptionRepository.cancelSubscription(subscriptionId);

      if (result['success'] == true) {
        final index = _subscriptions.indexWhere((sub) => sub.id == subscriptionId);
        if (index != -1) {
          _subscriptions[index] = result['subscription'];
        }
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Erreur lors de l\'annulation';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Erreur lors de l\'annulation: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ===== RENEW SUBSCRIPTION =====
  Future<bool> renewSubscription(String subscriptionId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _subscriptionRepository.renewSubscription(subscriptionId);

      if (result['success'] == true) {
        _subscriptions.add(result['subscription']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Erreur lors du renouvellement';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Erreur lors du renouvellement: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ===== REFRESH SUBSCRIPTIONS =====
  Future<void> refreshSubscriptions() async {
    await fetchSubscriptions();
  }

  // ===== CLEAR ERROR =====
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // ===== GET SUBSCRIPTION BY ID =====
  SubscriptionModel? getSubscriptionById(String subscriptionId) {
    try {
      return _subscriptions.firstWhere((sub) => sub.id == subscriptionId);
    } catch (e) {
      return null;
    }
  }

  // ===== GET ACTIVE SUBSCRIPTION FOR CHILD =====
  SubscriptionModel? getActiveSubscriptionForChild(String childId) {
    try {
      return _subscriptions.firstWhere(
        (sub) => sub.childId == childId && sub.isActive,
      );
    } catch (e) {
      return null;
    }
  }

  // ===== GET PENDING SUBSCRIPTION FOR CHILD =====
  SubscriptionModel? getPendingSubscriptionForChild(String childId) {
    try {
      return _subscriptions.firstWhere(
        (sub) => sub.childId == childId && sub.isPendingPayment,
      );
    } catch (e) {
      return null;
    }
  }

  // ===== CALCULATE SUBSCRIPTION PRICE =====
  double calculateSubscriptionPrice(SubscriptionType type, {double basePrice = 5000}) {
    switch (type) {
      case SubscriptionType.monthly:
        return basePrice;
      case SubscriptionType.quarterly:
        return basePrice * 3 * 0.9; // 10% de réduction
      case SubscriptionType.yearly:
        return basePrice * 12 * 0.8; // 20% de réduction
    }
  }

  // ===== SEARCH SUBSCRIPTIONS =====
  List<SubscriptionModel> searchSubscriptions(String query) {
    if (query.isEmpty) return _subscriptions;
    
    final lowerQuery = query.toLowerCase();
    return _subscriptions.where((sub) =>
      sub.typeDisplayName.toLowerCase().contains(lowerQuery) ||
      sub.statusDisplayName.toLowerCase().contains(lowerQuery) ||
      sub.childId.toLowerCase().contains(lowerQuery)
    ).toList();
  }
}
