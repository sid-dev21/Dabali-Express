import 'package:dio/dio.dart';
import '../models/attendance_model.dart';
import '../services/api_service.dart';
import '../../core/constants/api_constants.dart';

class AttendanceRepository {
  final ApiService _apiService = ApiService();

  Future<List<AttendanceModel>> getAttendanceByStudent(String studentId) async {
    try {
      final response = await _apiService.get(
        ApiConstants.attendanceByStudent(studentId),
      );

      if (response.data['success'] == true) {
        final List data = response.data['data'] ?? [];
        return data
            .whereType<Map<String, dynamic>>()
            .map(AttendanceModel.fromJson)
            .toList();
      }
      return [];
    } catch (e) {
      throw Exception(_extractErrorMessage(e, 'Erreur lors du chargement des présences'));
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

