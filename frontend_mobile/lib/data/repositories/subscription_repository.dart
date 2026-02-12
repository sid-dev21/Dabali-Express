import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../models/subscription_model.dart';
import '../../core/constants/api_constants.dart';

class SubscriptionRepository {
  final ApiService _apiService = ApiService();

  // ===== GET SUBSCRIPTIONS BY STUDENT =====
  Future<List<SubscriptionModel>> getSubscriptionsByStudent(
      String studentId) async {
    try {
      final response = await _apiService.get(
        ApiConstants.studentSubscriptions(studentId),
      );

      if (response.data['success'] == true) {
        final List data = response.data['data'];
        return data
            .map((json) => SubscriptionModel.fromJson(json))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ===== CREATE SUBSCRIPTION =====
  Future<Map<String, dynamic>> createSubscription({
    required String studentId,
    required String mealPlan,
    required String startDate,
    required double price,
  }) async {
    try {
      final parsedStart = DateTime.tryParse(startDate) ?? DateTime.now();
      final endDate = parsedStart.add(const Duration(days: 30));
      final response = await _apiService.post(
        ApiConstants.subscriptions,
        data: {
          'student_id': studentId,
          'meal_plan': mealPlan,
          'start_date': startDate,
          'end_date': endDate.toIso8601String().split('T').first,
          'price': price,
        },
      );

      if (response.data['success'] == true) {
        return {
          'success': true,
          'subscription': SubscriptionModel.fromJson(
            response.data['data'],
          ),
        };
      }

      return {
        'success': false,
        'message': response.data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'message': _extractErrorMessage(
          e,
          'Erreur lors de la création de l\'abonnement',
        ),
      };
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
