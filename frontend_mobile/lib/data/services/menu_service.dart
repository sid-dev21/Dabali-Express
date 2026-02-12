import 'modern_api_service.dart';
import '../models/menu.dart';

class MenuService {
  final ModernApiService _apiService;

  MenuService(this._apiService);

  // Obtenir le menu du jour
  Future<ApiResponse<Menu>> getTodayMenu({String? schoolId}) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (schoolId != null) queryParams['schoolId'] = schoolId;

      final response = await _apiService.get<Map<String, dynamic>>(
        '/menus/today',
        queryParameters: queryParams,
      );

      if (response.success && response.data != null) {
        final menu = Menu.fromJson(response.data!);
        return ApiResponse.createSuccess<Menu>(menu, message: response.message);
      }

      return ApiResponse.createError<Menu>(
        response.message ?? 'Erreur lors de la récupération du menu du jour',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les menus pour une période
  Future<ApiResponse<List<Menu>>> getMenus({
    String? schoolId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (schoolId != null) queryParams['schoolId'] = schoolId;
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();
      if (limit != null) queryParams['limit'] = limit;

      final response = await _apiService.get<List<dynamic>>(
        '/menus',
        queryParameters: queryParams,
      );

      if (response.success && response.data != null) {
        final menus = (response.data! as List)
            .map((menu) => Menu.fromJson(menu as Map<String, dynamic>))
            .toList();
        return ApiResponse.createSuccess<List<Menu>>(menus, message: response.message);
      }

      return ApiResponse.createError<List<Menu>>(
        response.message ?? 'Erreur lors de la récupération des menus',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir un menu par sa date
  Future<ApiResponse<Menu>> getMenuByDate(String date, {String? schoolId}) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (schoolId != null) queryParams['schoolId'] = schoolId;

      final response = await _apiService.get<Map<String, dynamic>>(
        '/menus/date/$date',
        queryParameters: queryParams,
      );

      if (response.success && response.data != null) {
        final menu = Menu.fromJson(response.data!);
        return ApiResponse.createSuccess<Menu>(menu, message: response.message);
      }

      return ApiResponse.createError<Menu>(
        response.message ?? 'Erreur lors de la récupération du menu',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir un menu par son ID
  Future<ApiResponse<Menu>> getMenuById(String menuId) async {
    try {
      final response = await _apiService.get<Map<String, dynamic>>('/menus/$menuId');

      if (response.success && response.data != null) {
        final menu = Menu.fromJson(response.data!);
        return ApiResponse.createSuccess<Menu>(menu, message: response.message);
      }

      return ApiResponse.createError<Menu>(
        response.message ?? 'Erreur lors de la récupération du menu',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Marquer la présence d'un enfant pour un menu
  Future<ApiResponse<MenuAttendance>> markAttendance({
    required String menuId,
    required String childId,
    required bool wasPresent,
    String? notes,
  }) async {
    try {
      final response = await _apiService.post<Map<String, dynamic>>(
        '/menus/$menuId/attendance',
        data: {
          'childId': childId,
          'wasPresent': wasPresent,
          if (notes != null) 'notes': notes,
        },
      );

      if (response.success && response.data != null) {
        final attendance = MenuAttendance.fromJson(response.data!);
        return ApiResponse.createSuccess<MenuAttendance>(attendance, message: response.message);
      }

      return ApiResponse.createError<MenuAttendance>(
        response.message ?? 'Erreur lors du marquage de la présence',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les présences pour un menu
  Future<ApiResponse<List<MenuAttendance>>> getMenuAttendance(String menuId) async {
    try {
      final response = await _apiService.get<List<dynamic>>('/menus/$menuId/attendance');

      if (response.success && response.data != null) {
        final attendance = (response.data! as List)
            .map((att) => MenuAttendance.fromJson(att as Map<String, dynamic>))
            .toList();
        return ApiResponse.createSuccess<List<MenuAttendance>>(attendance, message: response.message);
      }

      return ApiResponse.createError<List<MenuAttendance>>(
        response.message ?? 'Erreur lors de la récupération des présences',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les présences d'un enfant
  Future<ApiResponse<List<MenuAttendance>>> getChildAttendance(
    String childId, {
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();
      if (limit != null) queryParams['limit'] = limit;

      final response = await _apiService.get<List<dynamic>>(
        '/menus/attendance/child/$childId',
        queryParameters: queryParams,
      );

      if (response.success && response.data != null) {
        final attendance = (response.data! as List)
            .map((att) => MenuAttendance.fromJson(att as Map<String, dynamic>))
            .toList();
        return ApiResponse.createSuccess<List<MenuAttendance>>(attendance, message: response.message);
      }

      return ApiResponse.createError<List<MenuAttendance>>(
        response.message ?? 'Erreur lors de la récupération des présences',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les statistiques de présence pour un enfant
  Future<ApiResponse<Map<String, dynamic>>> getChildAttendanceStats(
    String childId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

      final response = await _apiService.get<Map<String, dynamic>>(
        '/menus/attendance/child/$childId/stats',
        queryParameters: queryParams,
      );
      return response;
    } catch (e) {
      throw e;
    }
  }

  // Obtenir les menus à venir (pour notifications)
  Future<ApiResponse<List<Menu>>> getUpcomingMenus({
    String? schoolId,
    int days = 7,
  }) async {
    try {
      final Map<String, dynamic> queryParams = {};
      if (schoolId != null) queryParams['schoolId'] = schoolId;
      queryParams['days'] = days;

      final response = await _apiService.get<List<dynamic>>(
        '/menus/upcoming',
        queryParameters: queryParams,
      );

      if (response.success && response.data != null) {
        final menus = (response.data! as List)
            .map((menu) => Menu.fromJson(menu as Map<String, dynamic>))
            .toList();
        return ApiResponse.createSuccess<List<Menu>>(menus, message: response.message);
      }

      return ApiResponse.createError<List<Menu>>(
        response.message ?? 'Erreur lors de la récupération des menus à venir',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // S'abonner aux notifications de menu (WebSocket/SSE)
  // Cette méthode pourrait être implémentée avec WebSocket ou Server-Sent Events
  Stream<Menu> subscribeToMenuUpdates({String? schoolId}) {
    // Implémentation WebSocket ou SSE à faire
    // Pour l'instant, retourne un stream vide
    return Stream.empty();
  }
}
