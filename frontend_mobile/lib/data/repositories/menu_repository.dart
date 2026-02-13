import '../services/api_service.dart';
import '../models/menu_model.dart';
import '../../core/constants/api_constants.dart';

class MenuRepository {
  final ApiService _apiService = ApiService();

  // ===== GET WEEK MENU =====
  Future<List<MenuModel>> getWeekMenu(String schoolId, {String? startDate}) async {
    try {
      final response = await _apiService.get(
        ApiConstants.weekMenu(schoolId),
        queryParameters: {
          if (startDate != null) 'start_date': startDate,
        },
      );

      if (response.data['success'] == true) {
        final dynamic payload = response.data['data'];
        final List menus = payload is List
            ? payload
            : (payload is Map<String, dynamic> ? (payload['menus'] ?? []) : []);
        return menus.map((json) => MenuModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      // Fallback when weekly route is unavailable: fetch by school and filter client-side by week.
      return getMenus(schoolId: schoolId);
    }
  }

  // ===== GET MENUS BY DATE =====
  Future<List<MenuModel>> getMenus({
    required String schoolId,
    String? startDate,
    String? endDate,
  }) async {
    try {
      final response = await _apiService.get(
        ApiConstants.menus,
        queryParameters: {
          'school_id': schoolId,
          if (startDate != null) 'start_date': startDate,
          if (endDate != null) 'end_date': endDate,
        },
      );

      if (response.data['success'] == true) {
        final List data = response.data['data'];
        return data.map((json) => MenuModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
