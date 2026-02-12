import 'modern_api_service.dart';
import '../models/user.dart';

class AuthService {
  final ModernApiService _apiService;

  AuthService(this._apiService);

  // Inscription parent
  Future<ApiResponse<User>> registerParent({
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String password,
    required String schoolId,
  }) async {
    try {
      final response = await _apiService.post<Map<String, dynamic>>(
        '/auth/register',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
          'phone': phone,
          'password': password,
          'schoolId': schoolId,
          'role': 'parent',
        },
      );

      if (response.success && response.data != null) {
        final user = User.fromJson(response.data!);
        // Sauvegarder le token
        await _apiService.setAuthToken(user.token!);
        return ApiResponse.createSuccess<User>(user, message: response.message);
      }

      return ApiResponse.createError<User>(
        response.message ?? 'Erreur lors de l\'inscription',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Connexion
  Future<ApiResponse<User>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiService.post<Map<String, dynamic>>(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.success && response.data != null) {
        final user = User.fromJson(response.data!);
        // Sauvegarder le token
        await _apiService.setAuthToken(user.token!);
        return ApiResponse.createSuccess<User>(user, message: response.message);
      }

      return ApiResponse.createError<User>(
        response.message ?? 'Erreur lors de la connexion',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Déconnexion
  Future<void> logout() async {
    try {
      await _apiService.post('/auth/logout');
    } catch (e) {
      // Même si la requête échoue, on efface le token localement
    }
    await _apiService.clearAuthToken();
  }

  // Vérifier si l'utilisateur est connecté
  Future<bool> isLoggedIn() async {
    return await _apiService.hasValidToken();
  }

  // Obtenir le profil utilisateur
  Future<ApiResponse<User>> getProfile() async {
    try {
      final response = await _apiService.get<Map<String, dynamic>>(
        '/auth/profile',
      );

      if (response.success && response.data != null) {
        final user = User.fromJson(response.data!);
        return ApiResponse.createSuccess<User>(user, message: response.message);
      }

      return ApiResponse.createError<User>(
        response.message ?? 'Erreur lors de la récupération du profil',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Mettre à jour le profil
  Future<ApiResponse<User>> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
  }) async {
    try {
      final Map<String, dynamic> data = {};
      if (firstName != null) data['firstName'] = firstName;
      if (lastName != null) data['lastName'] = lastName;
      if (phone != null) data['phone'] = phone;

      final response = await _apiService.put<Map<String, dynamic>>(
        '/auth/profile',
        data: data,
      );

      if (response.success && response.data != null) {
        final user = User.fromJson(response.data!);
        return ApiResponse.createSuccess<User>(user, message: response.message);
      }

      return ApiResponse.createError<User>(
        response.message ?? 'Erreur lors de la mise à jour du profil',
        statusCode: response.statusCode,
      );
    } catch (e) {
      throw e;
    }
  }

  // Changer le mot de passe
  Future<ApiResponse<void>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _apiService.post<void>(
        '/auth/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      return response;
    } catch (e) {
      throw e;
    }
  }

  // Demander la réinitialisation du mot de passe
  Future<ApiResponse<void>> forgotPassword(String email) async {
    try {
      final response = await _apiService.post<void>(
        '/auth/forgot-password',
        data: {'email': email},
      );
      return response;
    } catch (e) {
      throw e;
    }
  }

  // Réinitialiser le mot de passe
  Future<ApiResponse<void>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await _apiService.post<void>(
        '/auth/reset-password',
        data: {
          'token': token,
          'newPassword': newPassword,
        },
      );
      return response;
    } catch (e) {
      throw e;
    }
  }
}
