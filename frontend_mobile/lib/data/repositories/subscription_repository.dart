import '../services/api_service.dart';
import '../models/subscription_model.dart';
import '../../core/constants/api_constants.dart';

class SubscriptionRepository {
  final ApiService _apiService = ApiService();

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
      throw Exception('Erreur lors de la récupération des abonnements: $e');
    }
  }

  // ===== GET SUBSCRIPTIONS BY CHILD =====
  Future<List<SubscriptionModel>> getSubscriptionsByChild(String childId) async {
    try {
      final response = await _apiService.get(ApiConstants.studentSubscriptions(childId));
      
      if (response.data['success'] == true) {
        final List<dynamic> subscriptionsData = response.data['data'] ?? [];
        return subscriptionsData.map((sub) => SubscriptionModel.fromJson(sub)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Erreur lors de la récupération des abonnements de l\'enfant: $e');
    }
  }

  // ===== CREATE SUBSCRIPTION =====
  Future<Map<String, dynamic>> createSubscription({
    required String childId,
    required SubscriptionType type,
    required double amount,
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.createSubscription,
        data: {
          'child_id': childId,
          'subscription_type': type.name,
          'amount': amount,
        },
      );

      if (response.data['success'] == true) {
        final subscription = SubscriptionModel.fromJson(response.data['data']);
        return {
          'success': true,
          'subscription': subscription,
          'message': 'Abonnement créé avec succès',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de la création de l\'abonnement',
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
      throw Exception('Abonnement non trouvé');
    } catch (e) {
      throw Exception('Erreur lors de la récupération des détails: $e');
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
          'message': 'Abonnement mis à jour avec succès',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de la mise à jour',
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
          'message': 'Abonnement annulé avec succès',
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
          'message': 'Abonnement renouvelé avec succès',
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
          'message': 'Abonnement activé avec succès',
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
        'message': 'Erreur lors de la récupération des statistiques',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }
}
