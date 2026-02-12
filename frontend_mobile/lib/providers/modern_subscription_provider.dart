import 'package:flutter/foundation.dart';
import '../data/services/subscription_service.dart';
import '../data/models/subscription.dart';
import '../data/services/modern_api_service.dart';

class ModernSubscriptionProvider extends ChangeNotifier {
  final SubscriptionService _subscriptionService;
  List<Subscription> _subscriptions = [];
  bool _isLoading = false;
  String? _errorMessage;

  ModernSubscriptionProvider(this._subscriptionService);

  // Getters
  List<Subscription> get subscriptions => List.unmodifiable(_subscriptions);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasSubscriptions => _subscriptions.isNotEmpty;
  List<Subscription> get activeSubscriptions => _subscriptions.where((sub) => sub.isActive).toList();
  List<Subscription> get pendingSubscriptions => _subscriptions.where((sub) => sub.isPendingPayment).toList();
  List<Subscription> get expiredSubscriptions => _subscriptions.where((sub) => sub.isExpired).toList();

  // Obtenir les abonnements pour un enfant spécifique
  Subscription? getActiveSubscriptionForChild(String childId) {
    try {
      return _subscriptions.firstWhere(
        (sub) => sub.childId == childId && sub.isActive,
      );
    } catch (e) {
      return null;
    }
  }

  Subscription? getPendingSubscriptionForChild(String childId) {
    try {
      return _subscriptions.firstWhere(
        (sub) => sub.childId == childId && sub.isPendingPayment,
      );
    } catch (e) {
      return null;
    }
  }

  List<Subscription> getSubscriptionsForChild(String childId) {
    return _subscriptions.where((sub) => sub.childId == childId).toList();
  }

  // Charger tous les abonnements
  Future<bool> loadSubscriptions() async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _subscriptionService.getSubscriptions();

      if (response.success && response.data != null) {
        _subscriptions = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du chargement des abonnements');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Créer un abonnement
  Future<bool> createSubscription({
    required String childId,
    required String planId,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _subscriptionService.createSubscription(
        childId: childId,
        planId: planId,
      );

      if (response.success && response.data != null) {
        _subscriptions.add(response.data!);
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la création de l\'abonnement');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mettre à jour un abonnement
  Future<bool> updateSubscription({
    required String subscriptionId,
    String? planId,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _subscriptionService.updateSubscription(
        subscriptionId: subscriptionId,
        planId: planId,
      );

      if (response.success && response.data != null) {
        final index = _subscriptions.indexWhere((sub) => sub.id == subscriptionId);
        if (index != -1) {
          _subscriptions[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la mise à jour');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Annuler un abonnement
  Future<bool> cancelSubscription(String subscriptionId) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _subscriptionService.cancelSubscription(subscriptionId);

      if (response.success && response.data != null) {
        final index = _subscriptions.indexWhere((sub) => sub.id == subscriptionId);
        if (index != -1) {
          _subscriptions[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de l\'annulation');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Initier un paiement
  Future<Map<String, dynamic>?> initiatePayment({
    required String subscriptionId,
    required String paymentMethod,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _subscriptionService.initiatePayment(
        subscriptionId: subscriptionId,
        paymentMethod: paymentMethod,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        _setError(response.message ?? 'Erreur lors de l\'initialisation du paiement');
        return null;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return null;
    } finally {
      _setLoading(false);
    }
  }

  // Confirmer un paiement
  Future<bool> confirmPayment({
    required String subscriptionId,
    required String transactionId,
    required String paymentMethod,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _subscriptionService.confirmPayment(
        subscriptionId: subscriptionId,
        transactionId: transactionId,
        paymentMethod: paymentMethod,
      );

      if (response.success && response.data != null) {
        final index = _subscriptions.indexWhere((sub) => sub.id == subscriptionId);
        if (index != -1) {
          _subscriptions[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la confirmation du paiement');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Obtenir les plans d'abonnement disponibles
  Future<List<Map<String, dynamic>>?> getSubscriptionPlans() async {
    try {
      final response = await _subscriptionService.getSubscriptionPlans();
      if (response.success && response.data != null) {
        return response.data!;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Obtenir l'historique des paiements
  Future<List<Map<String, dynamic>>?> getPaymentHistory({
    String? childId,
    String? subscriptionId,
    int? limit,
  }) async {
    try {
      final response = await _subscriptionService.getPaymentHistory(
        childId: childId,
        subscriptionId: subscriptionId,
        limit: limit,
      );
      if (response.success && response.data != null) {
        return response.data!;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Rafraîchir la liste des abonnements
  Future<bool> refreshSubscriptions() async {
    return await loadSubscriptions();
  }

  // Vider la liste des abonnements (pour la déconnexion)
  void clearSubscriptions() {
    _subscriptions.clear();
    notifyListeners();
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
