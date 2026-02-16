import '../services/api_service.dart';
import '../models/subscription_model.dart';
import '../../core/constants/api_constants.dart';

class SubscriptionRepository {
  final ApiService _apiService = ApiService();

  String _toBackendSubscriptionType(SubscriptionType type) {
    switch (type) {
      case SubscriptionType.monthly:
        return 'MONTHLY';
      case SubscriptionType.quarterly:
        return 'QUARTERLY';
      case SubscriptionType.yearly:
        return 'YEARLY';
    }
  }

  DateTime _computeEndDate(DateTime startDate, SubscriptionType type) {
    switch (type) {
      case SubscriptionType.monthly:
        return DateTime(startDate.year, startDate.month + 1, startDate.day);
      case SubscriptionType.quarterly:
        return DateTime(startDate.year, startDate.month + 3, startDate.day);
      case SubscriptionType.yearly:
        return DateTime(startDate.year + 1, startDate.month, startDate.day);
    }
  }

  String _toBackendPaymentMethod(String paymentMethod) {
    final normalized = paymentMethod.trim().toUpperCase();
    if (normalized == 'CASH' || normalized == 'ESPECES') {
      return 'CASH';
    }
    if (normalized == 'ORANGE_MONEY') {
      return 'ORANGE_MONEY';
    }
    if (normalized == 'MOOV_MONEY') {
      return 'MOOV_MONEY';
    }
    if (normalized == 'WAVE') {
      return 'WAVE';
    }
    return normalized;
  }

  // ===== GET SUBSCRIPTIONS =====
  Future<List<SubscriptionModel>> getSubscriptions() async {
    try {
      final response = await _apiService.get(ApiConstants.subscriptions);
      
      if (response.data['success'] == true) {
        final List<dynamic> subscriptionsData = response.data['data'] ?? [];
        return subscriptionsData.map((sub) => SubscriptionModel.fromJson(sub)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Erreur lors de la rÃ©cupÃ©ration des abonnements: $e');
    }
  }

  // ===== GET SUBSCRIPTIONS BY CHILD =====
  Future<List<SubscriptionModel>> getSubscriptionsByChild(String childId) async {
    try {
      final response = await _apiService.get(
        ApiConstants.subscriptions,
        queryParameters: {
          'child_id': childId,
          'student_id': childId,
        },
      );
      
      if (response.data['success'] == true) {
        final List<dynamic> subscriptionsData = response.data['data'] ?? [];
        return subscriptionsData.map((sub) => SubscriptionModel.fromJson(sub)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Erreur lors de la rÃ©cupÃ©ration des abonnements de l\'enfant: $e');
    }
  }

  // ===== CREATE SUBSCRIPTION =====
  Future<Map<String, dynamic>> createSubscription({
    required String childId,
    required SubscriptionType type,
    required double amount,
  }) async {
    try {
      final startDate = DateTime.now();
      final endDate = _computeEndDate(startDate, type);
      final response = await _apiService.post(
        ApiConstants.createSubscription,
        data: {
          'student_id': childId,
          'child_id': childId,
          'start_date': startDate.toIso8601String(),
          'end_date': endDate.toIso8601String(),
          'type': _toBackendSubscriptionType(type),
          'plan_type': _toBackendSubscriptionType(type),
          'meal_plan': 'STANDARD',
          'amount': amount,
          'price': amount,
        },
      );

      if (response.data['success'] == true) {
        final subscription = SubscriptionModel.fromJson(response.data['data']);
        return {
          'success': true,
          'subscription': subscription,
          'message': 'Abonnement crÃ©Ã© avec succÃ¨s',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de la crÃ©ation de l\'abonnement',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== GET SUBSCRIPTION DETAILS =====
  Future<SubscriptionModel> getSubscriptionDetails(String subscriptionId) async {
    try {
      final response = await _apiService.get(ApiConstants.subscriptionDetails(subscriptionId));
      
      if (response.data['success'] == true) {
        return SubscriptionModel.fromJson(response.data['data']);
      }
      throw Exception('Abonnement non trouvÃ©');
    } catch (e) {
      throw Exception('Erreur lors de la rÃ©cupÃ©ration des dÃ©tails: $e');
    }
  }

  // ===== UPDATE SUBSCRIPTION =====
  Future<Map<String, dynamic>> updateSubscription(
    String subscriptionId, {
    SubscriptionType? type,
    SubscriptionStatus? status,
    double? amount,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (type != null) data['subscription_type'] = type.name;
      if (status != null) data['status'] = status.name;
      if (amount != null) data['amount'] = amount;
      if (startDate != null) data['start_date'] = startDate.toIso8601String();
      if (endDate != null) data['end_date'] = endDate.toIso8601String();

      final response = await _apiService.put(
        ApiConstants.subscriptionDetails(subscriptionId),
        data: data,
      );

      if (response.data['success'] == true) {
        final subscription = SubscriptionModel.fromJson(response.data['data']);
        return {
          'success': true,
          'subscription': subscription,
          'message': 'Abonnement mis Ã  jour avec succÃ¨s',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de la mise Ã  jour',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== CANCEL SUBSCRIPTION =====
  Future<Map<String, dynamic>> cancelSubscription(String subscriptionId) async {
    try {
      final response = await _apiService.put(
        '${ApiConstants.subscriptionDetails(subscriptionId)}/cancel',
      );

      if (response.data['success'] == true) {
        final subscription = SubscriptionModel.fromJson(response.data['data']);
        return {
          'success': true,
          'subscription': subscription,
          'message': 'Abonnement annulÃ© avec succÃ¨s',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de l\'annulation',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== RENEW SUBSCRIPTION =====
  Future<Map<String, dynamic>> renewSubscription(String subscriptionId) async {
    try {
      final response = await _apiService.post(
        '${ApiConstants.subscriptionDetails(subscriptionId)}/renew',
      );

      if (response.data['success'] == true) {
        final subscription = SubscriptionModel.fromJson(response.data['data']);
        return {
          'success': true,
          'subscription': subscription,
          'message': 'Abonnement renouvelÃ© avec succÃ¨s',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors du renouvellement',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== ACTIVATE SUBSCRIPTION =====
  Future<Map<String, dynamic>> activateSubscription(String subscriptionId) async {
    try {
      final response = await _apiService.put(
        '${ApiConstants.subscriptionDetails(subscriptionId)}/activate',
      );

      if (response.data['success'] == true) {
        final subscription = SubscriptionModel.fromJson(response.data['data']);
        return {
          'success': true,
          'subscription': subscription,
          'message': 'Abonnement activÃ© avec succÃ¨s',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de l\'activation',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== INITIATE PAYMENT =====
  Future<Map<String, dynamic>> initiatePayment({
    required String subscriptionId,
    required double amount,
    required String paymentMethod,
  }) async {
    try {
      final backendMethod = _toBackendPaymentMethod(paymentMethod);
      final response = await _apiService.post(
        ApiConstants.initiatePayment(subscriptionId),
        data: {
          'paymentMethod': backendMethod,
        },
      );

      if (response.data['success'] == true) {
        final payload = response.data['data'] ?? {};
        final payloadMap = payload is Map<String, dynamic> ? payload : <String, dynamic>{};
        final paymentPayload = payloadMap['payment'] is Map<String, dynamic>
            ? payloadMap['payment'] as Map<String, dynamic>
            : <String, dynamic>{};
        final subscriptionPayload = payloadMap['subscription'] is Map<String, dynamic>
            ? payloadMap['subscription'] as Map<String, dynamic>
            : null;

        return {
          'success': true,
          'message': response.data['message'] ?? 'Paiement enregistre',
          'subscription': subscriptionPayload != null
              ? SubscriptionModel.fromJson(subscriptionPayload)
              : null,
          'payment': paymentPayload,
          'paymentId': (paymentPayload['_id'] ?? paymentPayload['id'] ?? '').toString(),
          'codeRequired': payloadMap['codeRequired'] == true,
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de l initiation du paiement',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== CONFIRM PAYMENT =====
  Future<Map<String, dynamic>> confirmPayment({
    required String paymentId,
    required String paymentMethod,
    required String code,
  }) async {
    try {
      final backendMethod = _toBackendPaymentMethod(paymentMethod);
      final response = await _apiService.post(
        ApiConstants.confirmSubscriptionPayment(paymentId),
        data: {
          'paymentMethod': backendMethod,
          'code': code,
        },
      );

      if (response.data['success'] == true) {
        final payload = response.data['data'] ?? {};
        final payloadMap = payload is Map<String, dynamic> ? payload : <String, dynamic>{};
        final subscriptionPayload = payloadMap['subscription'] ?? payloadMap['subscription_id'];
        return {
          'success': true,
          'message': response.data['message'] ?? 'Paiement confirme',
          'subscription': subscriptionPayload is Map<String, dynamic>
              ? SubscriptionModel.fromJson(subscriptionPayload)
              : null,
          'payment': payloadMap,
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de la confirmation du paiement',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== GET SUBSCRIPTION STATISTICS =====
  Future<Map<String, dynamic>> getSubscriptionStatistics() async {
    try {
      final response = await _apiService.get('${ApiConstants.subscriptions}/statistics');
      
      if (response.data['success'] == true) {
        return {
          'success': true,
          'data': response.data['data'],
        };
      }
      
      return {
        'success': false,
        'message': 'Erreur lors de la rÃ©cupÃ©ration des statistiques',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }
}

