import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../models/child_model.dart';
import '../../core/constants/api_constants.dart';
import 'package:dio/dio.dart';

class ChildRepository {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  Future<String?> _resolveParentId() async {
    final storedUserId = _storageService.getUserId();
    if (storedUserId != null && storedUserId.trim().isNotEmpty) {
      return storedUserId.trim();
    }

    final profileResponse = await _apiService.get(ApiConstants.profile);
    final data = profileResponse.data;
    if (data is Map<String, dynamic> && data['success'] == true) {
      final userData = data['data'] as Map<String, dynamic>?;
      final resolvedId = (userData?['id'] ?? userData?['_id'] ?? '').toString().trim();
      if (resolvedId.isNotEmpty) {
        await _storageService.saveUserId(resolvedId);
        return resolvedId;
      }
    }

    return null;
  }

  String _sanitizeAddChildErrorMessage(String message) {
    final trimmed = message.trim();
    if (trimmed.isEmpty) {
      return 'Erreur lors de l\'ajout de l\'enfant';
    }

    final lower = trimmed.toLowerCase();
    final isInvalidCredentials = lower.contains('identifiant') &&
        (lower.contains('incorrect') || lower.contains('invalide'));
    if (lower.contains('pdf') || isInvalidCredentials) {
      return 'Identifiants de l\'enfant incorrects.';
    }

    return trimmed;
  }

  bool _isValidDateParts(int year, int month, int day) {
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1) return false;
    final lastDayOfMonth = DateTime(year, month + 1, 0).day;
    return day <= lastDayOfMonth;
  }

  String _formatDateParts(int year, int month, int day) {
    final yyyy = year.toString().padLeft(4, '0');
    final mm = month.toString().padLeft(2, '0');
    final dd = day.toString().padLeft(2, '0');
    return '$yyyy-$mm-$dd';
  }

  String? _normalizeBirthDateInput(String input) {
    final raw = input.trim();
    if (raw.isEmpty) return null;

    final isoMatch = RegExp(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$').firstMatch(raw);
    if (isoMatch != null) {
      final year = int.tryParse(isoMatch.group(1) ?? '');
      final month = int.tryParse(isoMatch.group(2) ?? '');
      final day = int.tryParse(isoMatch.group(3) ?? '');
      if (year != null && month != null && day != null && _isValidDateParts(year, month, day)) {
        return _formatDateParts(year, month, day);
      }
      return null;
    }

    final frMatch = RegExp(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$').firstMatch(raw);
    if (frMatch != null) {
      final day = int.tryParse(frMatch.group(1) ?? '');
      final month = int.tryParse(frMatch.group(2) ?? '');
      final year = int.tryParse(frMatch.group(3) ?? '');
      if (year != null && month != null && day != null && _isValidDateParts(year, month, day)) {
        return _formatDateParts(year, month, day);
      }
      return null;
    }

    final parsed = DateTime.tryParse(raw);
    if (parsed != null) {
      return _formatDateParts(parsed.year, parsed.month, parsed.day);
    }

    return null;
  }

  // ===== GET CHILDREN =====
  Future<List<ChildModel>> getChildren() async {
    try {
      Response response;
      try {
        // Preferred route for the current backend implementation.
        response = await _apiService.get('/children');
      } on DioException catch (error) {
        // Fallback for legacy backend shape.
        final status = error.response?.statusCode ?? 0;
        if (status != 404) rethrow;

        final parentId = await _resolveParentId();
        if (parentId == null || parentId.isEmpty) {
          throw Exception('Impossible d\'identifier le parent connecte.');
        }
        response = await _apiService.get(ApiConstants.childrenByParent(parentId));
      }
      
      if (response.data['success'] == true) {
        final List<dynamic> childrenData = response.data['data'] ?? [];
        return childrenData.map((child) => ChildModel.fromJson(child)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Erreur lors de la récupération des enfants: $e');
    }
  }

  // ===== GET CHILDREN BY PARENT =====
  Future<List<ChildModel>> getChildrenByParent(String parentId) async {
    try {
      Response response;
      try {
        response = await _apiService.get(
          '/children',
          queryParameters: {'parent_id': parentId},
        );
      } on DioException catch (error) {
        final status = error.response?.statusCode ?? 0;
        if (status != 404) rethrow;
        response = await _apiService.get(ApiConstants.childrenByParent(parentId));
      }
      
      if (response.data['success'] == true) {
        final List<dynamic> childrenData = response.data['data'] ?? [];
        return childrenData.map((child) => ChildModel.fromJson(child)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Erreur lors de la récupération des enfants du parent: $e');
    }
  }

  // ===== ADD CHILD =====
  Future<Map<String, dynamic>> addChild({
    required String firstName,
    required String lastName,
    required String dateOfBirth,
    required String className,
    String? studentCode,
    String? schoolId,
  }) async {
    try {
      final trimmedFirstName = firstName.trim();
      final trimmedLastName = lastName.trim();
      final trimmedDateOfBirth = dateOfBirth.trim();
      final trimmedClassName = className.trim();
      final trimmedStudentCode = studentCode?.trim();
      final trimmedSchoolId = schoolId?.trim();
      final normalizedBirthDate = _normalizeBirthDateInput(trimmedDateOfBirth);

      if (normalizedBirthDate == null) {
        return {
          'success': false,
          'message': 'Date de naissance invalide. Utilisez JJ/MM/AAAA ou AAAA-MM-JJ.',
        };
      }

      final payload = <String, dynamic>{
        'first_name': trimmedFirstName,
        'last_name': trimmedLastName,
        'date_of_birth': normalizedBirthDate,
        'birth_date': normalizedBirthDate,
        'class_name': trimmedClassName,
        'grade': trimmedClassName,
      };

      if (trimmedStudentCode != null && trimmedStudentCode.isNotEmpty) {
        payload['student_code'] = trimmedStudentCode;
      }
      if (trimmedSchoolId != null && trimmedSchoolId.isNotEmpty) {
        payload['school_id'] = trimmedSchoolId;
      }

      Response response;
      try {
        response = await _apiService.post(
          '/children',
          data: payload,
        );
      } on DioException catch (error) {
        final status = error.response?.statusCode ?? 0;
        if (status != 404) rethrow;
        response = await _apiService.post(
          ApiConstants.addChild,
          data: payload,
        );
      }

      if (response.data['success'] == true) {
        final child = ChildModel.fromJson(response.data['data']);
        return {
          'success': true,
          'child': child,
          'message': 'Enfant ajouté avec succès',
        };
      }

      return {
        'success': false,
        'message': _sanitizeAddChildErrorMessage(
          (response.data['message'] ?? 'Erreur lors de l\'ajout de l\'enfant').toString(),
        ),
      };
    } on DioException catch (e) {
      final responseData = e.response?.data;
      String message = 'Erreur de connexion au serveur';

      if (responseData is Map<String, dynamic>) {
        final backendMessage = responseData['message'];
        if (backendMessage is String && backendMessage.trim().isNotEmpty) {
          message = backendMessage.trim();
        }
      } else if (e.message != null && e.message!.trim().isNotEmpty) {
        message = e.message!.trim();
      }

      return {
        'success': false,
        'message': _sanitizeAddChildErrorMessage(message),
      };
    } catch (e) {
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  // ===== GET CHILD DETAILS =====
  Future<ChildModel> getChildDetails(String childId) async {
    try {
      final response = await _apiService.get(ApiConstants.childDetails(childId));
      
      if (response.data['success'] == true) {
        return ChildModel.fromJson(response.data['data']);
      }
      throw Exception('Enfant non trouvé');
    } catch (e) {
      throw Exception('Erreur lors de la récupération des détails: $e');
    }
  }

  // ===== UPDATE CHILD =====
  Future<Map<String, dynamic>> updateChild(
    String childId, {
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? className,
    String? schoolId,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (firstName != null) data['first_name'] = firstName;
      if (lastName != null) data['last_name'] = lastName;
      if (dateOfBirth != null) data['date_of_birth'] = dateOfBirth;
      if (className != null) data['class_name'] = className;
      if (schoolId != null) data['school_id'] = schoolId;

      final response = await _apiService.put(
        ApiConstants.childDetails(childId),
        data: data,
      );

      if (response.data['success'] == true) {
        final child = ChildModel.fromJson(response.data['data']);
        return {
          'success': true,
          'child': child,
          'message': 'Enfant mis à jour avec succès',
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

  // ===== DELETE CHILD =====
  Future<Map<String, dynamic>> deleteChild(String childId) async {
    try {
      final response = await _apiService.delete(ApiConstants.childDetails(childId));

      if (response.data['success'] == true) {
        return {
          'success': true,
          'message': 'Enfant supprimé avec succès',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de la suppression',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== APPROVE CHILD =====
  Future<Map<String, dynamic>> approveChild(String childId) async {
    try {
      final response = await _apiService.put(
        '${ApiConstants.childDetails(childId)}/approve',
      );

      if (response.data['success'] == true) {
        final child = ChildModel.fromJson(response.data['data']);
        return {
          'success': true,
          'child': child,
          'message': 'Enfant approuvé avec succès',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors de l\'approbation',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== REJECT CHILD =====
  Future<Map<String, dynamic>> rejectChild(String childId, {String? reason}) async {
    try {
      final response = await _apiService.put(
        '${ApiConstants.childDetails(childId)}/reject',
        data: {'reason': reason},
      );

      if (response.data['success'] == true) {
        final child = ChildModel.fromJson(response.data['data']);
        return {
          'success': true,
          'child': child,
          'message': 'Enfant rejeté avec succès',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur lors du rejet',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }
}
