import 'package:dio/dio.dart';

import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../models/user_model.dart';
import '../../core/constants/api_constants.dart';

class AuthRepository {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  String _extractErrorMessage(dynamic error, String fallback) {
    if (error is DioException) {
      final responseData = error.response?.data;
      if (responseData is Map<String, dynamic>) {
        final message = responseData['message'];
        if (message is String && message.isNotEmpty) {
          return message;
        }
      }
    }
    return fallback;
  }

  Future<void> _persistAuthData({
    String? token,
    required Map<String, dynamic> userData,
  }) async {
    if (token != null && token.isNotEmpty) {
      await _storageService.saveToken(token);
    }
    await _storageService.saveUserId((userData['id'] ?? userData['_id'] ?? '').toString());
    await _storageService.saveUserEmail((userData['email'] ?? '').toString());
  }

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
        final token = (response.data['token'] ?? '').toString();
        final userData = response.data['data'];
        await _persistAuthData(token: token, userData: userData);

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
        'message': _extractErrorMessage(e, 'Erreur de connexion au serveur'),
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
      final response = await _apiService.get(ApiConstants.profile);

      if (response.data['success'] == true) {
        final userData = response.data['data'] as Map<String, dynamic>;
        final user = UserModel.fromJson(userData);
        await _persistAuthData(userData: userData);
        return user;
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
        final token = (response.data['token'] ?? '').toString();
        final userData = response.data['data'];
        await _persistAuthData(token: token, userData: userData);

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
        'message': _extractErrorMessage(e, 'Erreur de connexion au serveur'),
      };
    }
  }

  // ===== UPDATE EMAIL / PASSWORD =====
  Future<Map<String, dynamic>> updateCredentials({
    required String currentPassword,
    String? newEmail,
    String? newPassword,
    String? confirmNewPassword,
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.updateCredentials,
        data: {
          'current_password': currentPassword,
          if (newEmail != null) 'new_email': newEmail,
          if (newPassword != null) 'new_password': newPassword,
          if (confirmNewPassword != null) 'confirm_new_password': confirmNewPassword,
        },
      );

      if (response.data['success'] == true) {
        final token = (response.data['token'] ?? '').toString();
        final userData = response.data['data'] as Map<String, dynamic>;
        await _persistAuthData(token: token, userData: userData);

        return {
          'success': true,
          'message': response.data['message'] ?? 'Identifiants mis a jour',
          'user': UserModel.fromJson(userData),
        };
      }

      return {
        'success': false,
        'message': response.data['message'] ?? 'Erreur de mise a jour des identifiants',
      };
    } catch (e) {
      return {
        'success': false,
        'message': _extractErrorMessage(e, 'Erreur de connexion au serveur'),
      };
    }
  }
}
