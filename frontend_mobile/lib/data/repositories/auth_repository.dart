import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../models/user_model.dart';
import '../../core/constants/api_constants.dart';

class AuthRepository {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  // ===== LOGIN =====
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _apiService.post(
        ApiConstants.login,
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.data['success'] == true) {
        // Sauvegarder le token
        final token = response.data['token'];
        await _storageService.saveToken(token);

        // Sauvegarder les infos utilisateur
        final userData = response.data['data'];
        await _storageService.saveUserId(userData['id']);
        await _storageService.saveUserEmail(userData['email']);

        // Retourner l'utilisateur
        final user = UserModel.fromJson(userData);
        return {
          'success': true,
          'user': user,
          'message': 'Connexion réussie',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur de connexion',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }

  // ===== LOGOUT =====
  Future<void> logout() async {
    await _storageService.clearAll();
  }

  // ===== CHECK IF LOGGED IN =====
  Future<bool> isLoggedIn() async {
    final token = await _storageService.getToken();
    return token != null;
  }

  // ===== GET CURRENT USER =====
  Future<UserModel?> getCurrentUser() async {
    try {
      final response = await _apiService.get(ApiConstants.me);

      if (response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ===== REGISTER =====
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.register,
        data: {
          'email': email,
          'password': password,
          'role': 'PARENT',
          'first_name': firstName,
          'last_name': lastName,
          'phone': phone,
        },
      );

      if (response.data['success'] == true) {
        // Sauvegarder le token
        final token = response.data['token'];
        await _storageService.saveToken(token);

        // Sauvegarder les infos utilisateur
        final userData = response.data['data'];
        await _storageService.saveUserId(userData['id']);
        await _storageService.saveUserEmail(userData['email']);

        final user = UserModel.fromJson(userData);
        return {
          'success': true,
          'user': user,
          'message': 'Inscription réussie',
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur d\'inscription',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Erreur de connexion au serveur',
      };
    }
  }
}