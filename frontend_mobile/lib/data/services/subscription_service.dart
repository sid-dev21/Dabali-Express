import 'modern_api_service.dart';
import '../models/subscription.dart';

class SubscriptionService {
  final ModernApiService _apiService;

  SubscriptionService(this._apiService);

  // Créer un abonnement
  Future<ApiResponse<Subscription>> createSubscription({
    required String childId,
    required String planId,
  }) async {
    try {
      final response = await _apiService.post<Map<String, dynamic>>(
        '/subscriptions',
        data: {
          'childId': childId,
          'planId': planId,
        },
      );

      if (response.success && response.data != null) {
        final subscription = Subscription.fromJson(response.data!);
        return ApiResponse.createSuccess<Subscription>(subscription, message: response.message);
      }

      return ApiResponse.createError<Subscription>(
        response.message ?? 'Erreur lors de la création de l\'abonnement',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir tous les abonnements du parent
  Future<ApiResponse<List<Subscription>>> getSubscriptions() async {
    try {
      final response = await _apiService.get<List<dynamic>>('/subscriptions');

      if (response.success && response.data != null) {
        final subscriptions = (response.data! as List)
            .map((sub) => Subscription.fromJson(sub as Map<String, dynamic>))
            .toList();
        return ApiResponse.createSuccess<List<Subscription>>(subscriptions, message: response.message);
      }

      return ApiResponse.createError<List<Subscription>>(
        response.message ?? 'Erreur lors de la récupération des abonnements',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les abonnements pour un enfant spécifique
  Future<ApiResponse<List<Subscription>>> getChildSubscriptions(String childId) async {
    try {
      final response = await _apiService.get<List<dynamic>>('/subscriptions/child/$childId');

      if (response.success && response.data != null) {
        final subscriptions = (response.data! as List)
            .map((sub) => Subscription.fromJson(sub as Map<String, dynamic>))
            .toList();
        return ApiResponse.createSuccess<List<Subscription>>(subscriptions, message: response.message);
      }

      return ApiResponse.createError<List<Subscription>>(
        response.message ?? 'Erreur lors de la récupération des abonnements de l\'enfant',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir un abonnement par son ID
  Future<ApiResponse<Subscription>> getSubscriptionById(String subscriptionId) async {
    try {
      final response = await _apiService.get<Map<String, dynamic>>('/subscriptions/$subscriptionId');

      if (response.success && response.data != null) {
        final subscription = Subscription.fromJson(response.data!);
        return ApiResponse.createSuccess<Subscription>(subscription, message: response.message);
      }

      return ApiResponse.createError<Subscription>(
        response.message ?? 'Erreur lors de la récupération de l\'abonnement',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Mettre à jour un abonnement
  Future<ApiResponse<Subscription>> updateSubscription({
    required String subscriptionId,
    String? planId,
  }) async {
    try {
      final Map<String, dynamic> data = {};
      if (planId != null) data['planId'] = planId;

      final response = await _apiService.put<Map<String, dynamic>>(
        '/subscriptions/$subscriptionId',
        data: data,
      );

      if (response.success && response.data != null) {
        final subscription = Subscription.fromJson(response.data!);
        return ApiResponse.createSuccess<Subscription>(subscription, message: response.message);
      }

      return ApiResponse.createError<Subscription>(
        response.message ?? 'Erreur lors de la mise à jour de l\'abonnement',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Annuler un abonnement
  Future<ApiResponse<Subscription>> cancelSubscription(String subscriptionId) async {
    try {
      final response = await _apiService.patch<Map<String, dynamic>>(
        '/subscriptions/$subscriptionId/cancel',
      );

      if (response.success && response.data != null) {
        final subscription = Subscription.fromJson(response.data!);
        return ApiResponse.createSuccess<Subscription>(subscription, message: response.message);
      }

      return ApiResponse.createError<Subscription>(
        response.message ?? 'Erreur lors de l\'annulation de l\'abonnement',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Initier un paiement
  Future<ApiResponse<Map<String, dynamic>>> initiatePayment({
    required String subscriptionId,
    required String paymentMethod, // 'orange_money', 'moov_money', 'cash'
  }) async {
    try {
      final response = await _apiService.post<Map<String, dynamic>>(
        '/subscriptions/$subscriptionId/payment',
        data: {
          'paymentMethod': paymentMethod,
        },
      );
      return response;
    } catch (e) {
      throw e;
    }
  }

  // Confirmer un paiement
  Future<ApiResponse<Subscription>> confirmPayment({
    required String subscriptionId,
    required String transactionId,
    required String paymentMethod,
  }) async {
    try {
      final response = await _apiService.post<Map<String, dynamic>>(
        '/subscriptions/$subscriptionId/payment/confirm',
        data: {
          'transactionId': transactionId,
          'paymentMethod': paymentMethod,
        },
      );

      if (response.success && response.data != null) {
        final subscription = Subscription.fromJson(response.data!);
        return ApiResponse.createSuccess<Subscription>(subscription, message: response.message);
      }

      return ApiResponse.createError<Subscription>(
        response.message ?? 'Erreur lors de la confirmation du paiement',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les plans d'abonnement disponibles
  Future<ApiResponse<List<Map<String, dynamic>>>> getSubscriptionPlans() async {
    try {
      final response = await _apiService.get<List<dynamic>>('/subscriptions/plans');

      if (response.success && response.data != null) {
        final plans = (response.data! as List)
            .map((plan) => plan as Map<String, dynamic>)
            .toList();
        return ApiResponse.createSuccess<List<Map<String, dynamic>>>(
          plans,
          message: response.message,
        );
      }

      return ApiResponse.createError<List<Map<String, dynamic>>>(
        response.message ?? 'Erreur lors de la récupération des plans',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir l'historique des paiements
  Future<ApiResponse<List<Map<String, dynamic>>>> getPaymentHistory({
    String? childId,
    String? subscriptionId,
    int? limit,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (childId != null) queryParams['childId'] = childId;
      if (subscriptionId != null) queryParams['subscriptionId'] = subscriptionId;
      if (limit != null) queryParams['limit'] = limit;

      final response = await _apiService.get<List<dynamic>>(
        '/subscriptions/payments/history',
        queryParameters: queryParams,
      );

      if (response.success && response.data != null) {
        final history = (response.data! as List)
            .map((record) => record as Map<String, dynamic>)
            .toList();
        return ApiResponse.createSuccess<List<Map<String, dynamic>>>(
          history,
          message: response.message,
        );
      }

      return ApiResponse.createError<List<Map<String, dynamic>>>(
        response.message ?? 'Erreur lors de la récupération de l\'historique',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }
}
