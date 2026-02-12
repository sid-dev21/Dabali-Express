import 'modern_api_service.dart';
import '../models/child.dart';

class ChildService {
  final ModernApiService _apiService;

  ChildService(this._apiService);

  // Ajouter un enfant
  Future<ApiResponse<Child>> addChild({
    required String firstName,
    required String lastName,
    required String dateOfBirth,
    required String className,
    required String schoolId,
  }) async {
    try {
      final response = await _apiService.post<Map<String, dynamic>>(
        '/children',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'dateOfBirth': dateOfBirth,
          'className': className,
          'schoolId': schoolId,
        },
      );

      if (response.success && response.data != null) {
        final child = Child.fromJson(response.data!);
        return ApiResponse.createSuccess<Child>(child, message: response.message);
      }

      return ApiResponse.createError<Child>(
        response.message ?? 'Erreur lors de l\'ajout de l\'enfant',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir tous les enfants du parent
  Future<ApiResponse<List<Child>>> getChildren() async {
    try {
      final response = await _apiService.get<List<dynamic>>('/children');

      if (response.success && response.data != null) {
        final children = (response.data! as List)
            .map((child) => Child.fromJson(child as Map<String, dynamic>))
            .toList();
        return ApiResponse.createSuccess<List<Child>>(children, message: response.message);
      }

      return ApiResponse.createError<List<Child>>(
        response.message ?? 'Erreur lors de la récupération des enfants',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir un enfant par son ID
  Future<ApiResponse<Child>> getChildById(String childId) async {
    try {
      final response = await _apiService.get<Map<String, dynamic>>('/children/$childId');

      if (response.success && response.data != null) {
        final child = Child.fromJson(response.data!);
        return ApiResponse.createSuccess<Child>(child, message: response.message);
      }

      return ApiResponse.createError<Child>(
        response.message ?? 'Erreur lors de la récupération de l\'enfant',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Mettre à jour un enfant
  Future<ApiResponse<Child>> updateChild({
    required String childId,
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? className,
  }) async {
    try {
      final Map<String, dynamic> data = {};
      if (firstName != null) data['firstName'] = firstName;
      if (lastName != null) data['lastName'] = lastName;
      if (dateOfBirth != null) data['dateOfBirth'] = dateOfBirth;
      if (className != null) data['className'] = className;

      final response = await _apiService.put<Map<String, dynamic>>(
        '/children/$childId',
        data: data,
      );

      if (response.success && response.data != null) {
        final child = Child.fromJson(response.data!);
        return ApiResponse.createSuccess<Child>(child, message: response.message);
      }

      return ApiResponse.createError<Child>(
        response.message ?? 'Erreur lors de la mise à jour de l\'enfant',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Supprimer un enfant
  Future<ApiResponse<void>> deleteChild(String childId) async {
    try {
      final response = await _apiService.delete<void>('/children/$childId');
      return response;
    } catch (e) {
      throw e;
    }
  }

  // Mettre à jour la photo d'un enfant
  Future<ApiResponse<Child>> updateChildPhoto({
    required String childId,
    required String photoUrl,
  }) async {
    try {
      final response = await _apiService.patch<Map<String, dynamic>>(
        '/children/$childId/photo',
        data: {'photoUrl': photoUrl},
      );

      if (response.success && response.data != null) {
        final child = Child.fromJson(response.data!);
        return ApiResponse.createSuccess<Child>(child, message: response.message);
      }

      return ApiResponse.createError<Child>(
        response.message ?? 'Erreur lors de la mise à jour de la photo',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les statistiques d'un enfant
  Future<ApiResponse<Map<String, dynamic>>> getChildStats(String childId) async {
    try {
      final response = await _apiService.get<Map<String, dynamic>>('/children/$childId/stats');
      return response;
    } catch (e) {
      throw e;
    }
  }

  // Obtenir l'historique de présence d'un enfant
  Future<ApiResponse<List<Map<String, dynamic>>>> getChildAttendanceHistory(
    String childId, {
    int? limit,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (limit != null) queryParams['limit'] = limit;
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

      final response = await _apiService.get<List<dynamic>>(
        '/children/$childId/attendance',
        queryParameters: queryParams,
      );

      if (response.success && response.data != null) {
        final attendance = (response.data! as List)
            .map((record) => record as Map<String, dynamic>)
            .toList();
        return ApiResponse.createSuccess<List<Map<String, dynamic>>>(
          attendance,
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
