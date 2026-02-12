import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../models/student_model.dart';
import '../../core/constants/api_constants.dart';

class StudentRepository {
  final ApiService _apiService = ApiService();

  // ===== GET STUDENTS BY PARENT =====
  Future<List<StudentModel>> getStudentsByParent(String parentId) async {
    try {
      final response = await _apiService.get(
        ApiConstants.studentsByParent(parentId),
      );

      if (response.data['success'] == true) {
        final List data = response.data['data'];
        return data.map((json) => StudentModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // ===== GET STUDENT BY ID =====
  Future<StudentModel?> getStudentById(String studentId) async {
    try {
      final response = await _apiService.get(
        '${ApiConstants.students}/$studentId',
      );

      if (response.data['success'] == true) {
        return StudentModel.fromJson(response.data['data']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ===== CREATE STUDENT =====
  Future<Map<String, dynamic>> createStudent({
    required String parentId,
    required String firstName,
    required String lastName,
    String? className,
    required String schoolId,
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.students,
        data: {
          'parent_id': parentId,
          'first_name': firstName,
          'last_name': lastName,
          'class_name': className,
          'school_id': schoolId,
        },
      );

      if (response.data['success'] == true) {
        return {
          'success': true,
          'student': StudentModel.fromJson(response.data['data']),
          'message': response.data['message'] ?? 'Enfant ajouté avec succès',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Impossible d\'ajouter l\'enfant',
      };
    } catch (e) {
      return {
        'success': false,
        'message': _extractErrorMessage(e, 'Erreur lors de l\'ajout de l\'enfant'),
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
