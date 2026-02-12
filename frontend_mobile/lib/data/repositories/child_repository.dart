import '../services/api_service.dart';
import '../models/child_model.dart';
import '../../core/constants/api_constants.dart';

class ChildRepository {
  final ApiService _apiService = ApiService();

  // ===== GET CHILDREN =====
  Future<List<ChildModel>> getChildren() async {
    try {
      final response = await _apiService.get(ApiConstants.children);
      
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
      final response = await _apiService.get(ApiConstants.childrenByParent(parentId));
      
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
    String? schoolId,
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.addChild,
        data: {
          'first_name': firstName,
          'last_name': lastName,
          'date_of_birth': dateOfBirth,
          'class_name': className,
          'school_id': schoolId,
        },
      );

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
        'message': response.data['message'] ?? 'Erreur lors de l\'ajout de l\'enfant',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
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
