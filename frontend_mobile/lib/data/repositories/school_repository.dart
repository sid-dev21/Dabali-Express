import 'package:dio/dio.dart';
import '../../core/constants/api_constants.dart';
import '../models/school_model.dart';
import '../services/api_service.dart';

class SchoolRepository {
  final ApiService _apiService = ApiService();

  Future<List<SchoolModel>> getSchools() async {
    try {
      final response = await _apiService.get(ApiConstants.schools);
      if (response.data['success'] == true) {
        final List data = response.data['data'] ?? [];
        return data.map((json) => SchoolModel.fromJson(json)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  String extractErrorMessage(Object error, String fallback) {
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
