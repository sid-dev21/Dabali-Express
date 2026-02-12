import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../models/payment_model.dart';
import '../../core/constants/api_constants.dart';

class PaymentRepository {
  final ApiService _apiService = ApiService();

  // ===== GET PAYMENTS BY PARENT =====
  Future<List<PaymentModel>> getPaymentsByParent(String parentId) async {
    try {
      final response = await _apiService.get(
        ApiConstants.payments,
        queryParameters: {'parent_id': parentId},
      );

      if (response.data['success'] == true) {
        final List data = response.data['data'];
        return data
            .map((json) => PaymentModel.fromJson(json))
            .toList();
      }
      throw Exception(response.data['message'] ?? 'Erreur chargement paiements');
    } catch (e) {
      throw Exception(_extractErrorMessage(e, 'Erreur lors du chargement des paiements'));
    }
  }

  // ===== CREATE PAYMENT =====
  Future<Map<String, dynamic>> createPayment({
    required String subscriptionId,
    required double amount,
    required String method,
    required String phone,
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.payments,
        data: {
          'subscription_id': subscriptionId,
          'amount': amount,
          'method': _toBackendMethod(method),
          'phone': phone,
        },
      );

      if (response.data['success'] == true) {
        return {
          'success': true,
          'payment': PaymentModel.fromJson(response.data['data']),
          'message': 'Paiement initié avec succès',
        };
      }

      return {
        'success': false,
        'message': response.data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'message': _extractErrorMessage(e, 'Erreur lors du paiement'),
      };
    }
  }

  // ===== VERIFY PAYMENT =====
  Future<Map<String, dynamic>> verifyPayment(String paymentId) async {
    try {
      final response = await _apiService.get(
        ApiConstants.verifyPayment(paymentId),
      );

      if (response.data['success'] == true) {
        return {
          'success': true,
          'payment': PaymentModel.fromJson(response.data['data']),
        };
      }

      return {
        'success': false,
        'message': response.data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'message': _extractErrorMessage(e, 'Erreur lors de la vérification'),
      };
    }
  }

  String _toBackendMethod(String appMethod) {
    switch (appMethod) {
      case 'ORANGE_MONEY':
      case 'MOOV_MONEY':
        return 'MOBILE_MONEY';
      default:
        return appMethod;
    }
  }

  String _extractErrorMessage(Object error, String fallback) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['message'] != null) {
        return data['message'].toString();
      }
      return error.message ?? fallback;
    }
    return fallback;
  }
}
