import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import '../../core/constants/api_constants.dart';
import 'storage_service.dart';

// Modèles de réponse API
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final int? statusCode;
  final List<String>? errors;

  const ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.statusCode,
    this.errors,
  });

  static ApiResponse<T> createSuccess<T>(T data, {String? message, int? statusCode}) {
    return ApiResponse<T>(
      success: true,
      data: data,
      message: message,
      statusCode: statusCode,
    );
  }

  static ApiResponse<T> createError<T>(String message, {int? statusCode, List<String>? errors}) {
    return ApiResponse<T>(
      success: false,
      message: message,
      statusCode: statusCode,
      errors: errors,
    );
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final List<String>? errors;
  final dynamic originalError;

  const ApiException({
    required this.message,
    this.statusCode,
    this.errors,
    this.originalError,
  });

  @override
  String toString() {
    return 'ApiException: $message (Status: $statusCode)';
  }
}

class NetworkException extends ApiException {
  const NetworkException(String message, {dynamic originalError})
      : super(message: message, originalError: originalError);
}

class ServerException extends ApiException {
  const ServerException(String message, {int? statusCode, List<String>? errors})
      : super(message: message, statusCode: statusCode, errors: errors);
}

class AuthException extends ApiException {
  const AuthException(String message, {int? statusCode})
      : super(message: message, statusCode: statusCode);
}

class ValidationException extends ApiException {
  const ValidationException(String message, {List<String>? errors})
      : super(message: message, errors: errors);
}

class ModernApiService {
  late final Dio _dio;
  final StorageService _storage = StorageService();
  final Logger _logger = Logger();

  ModernApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Ajouter le token JWT si disponible
          final token = await _storage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          
          _logger.d('🔵 REQUEST [${options.method}] => ${options.path}');
          if (options.data != null) {
            _logger.d('📦 Data: ${options.data}');
          }
          
          return handler.next(options);
        },
        
        onResponse: (response, handler) {
          _logger.d('✅ RESPONSE [${response.statusCode}] => ${response.requestOptions.path}');
          return handler.next(response);
        },
        
        onError: (error, handler) {
          _logger.e('❌ ERROR [${error.response?.statusCode}] => ${error.requestOptions.path}');
          _logger.e('Message: ${error.message}');
          if (error.response?.data != null) {
            _logger.e('Response: ${error.response?.data}');
          }
          return handler.next(error);
        },
      ),
    );
  }

  // ===== METHODES PRINCIPALES =====
  
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return _handleResponse<T>(response, fromJson: fromJson);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.post(path, data: data);
      return _handleResponse<T>(response, fromJson: fromJson);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.put(path, data: data);
      return _handleResponse<T>(response, fromJson: fromJson);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<ApiResponse<T>> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.delete(path);
      return _handleResponse<T>(response, fromJson: fromJson);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<ApiResponse<T>> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.patch(path, data: data);
      return _handleResponse<T>(response, fromJson: fromJson);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ===== GESTION DES RÉPONSES =====
  
  ApiResponse<T> _handleResponse<T>(
    Response response, {
    T Function(dynamic)? fromJson,
  }) {
    final statusCode = response.statusCode ?? 200;
    final responseData = response.data;

    if (statusCode >= 200 && statusCode < 300) {
      try {
        // Si la réponse a un format standard {success, data, message}
        if (responseData is Map<String, dynamic> && 
            responseData.containsKey('success')) {
          
          final success = responseData['success'] ?? false;
          final message = responseData['message'] as String?;
          final data = responseData['data'];
          final errors = responseData['errors'] as List<String>?;
          
          if (success) {
            final parsedData = fromJson != null && data != null 
                ? fromJson(data) 
                : data;
            return ApiResponse.createSuccess<T>(
              parsedData,
              message: message,
              statusCode: statusCode,
            );
          } else {
            return ApiResponse.createError<T>(
              message ?? 'Erreur serveur',
              statusCode: statusCode,
              errors: errors,
            );
          }
        }
        
        // Si la réponse est directement les données
        final parsedData = fromJson != null ? fromJson(responseData) : responseData;
        return ApiResponse.createSuccess<T>(
          parsedData,
          statusCode: statusCode,
        );
        
      } catch (e) {
        _logger.e('Error parsing response: $e');
        return ApiResponse.createError<T>(
          'Erreur lors du traitement de la réponse',
          statusCode: statusCode,
        );
      }
    } else {
      return ApiResponse.createError<T>(
        'Erreur serveur (HTTP $statusCode)',
        statusCode: statusCode,
      );
    }
  }

  // ===== GESTION DES ERREURS =====
  
  ApiException _handleError(dynamic error) {
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return const NetworkException('Délai de connexion dépassé');
          
        case DioExceptionType.connectionError:
          return const NetworkException('Erreur de connexion');
          
        case DioExceptionType.badResponse:
          return _handleHttpError(error);
          
        case DioExceptionType.cancel:
          return const ApiException(message: 'Requête annulée');
          
        case DioExceptionType.unknown:
        default:
          return ApiException(
            message: 'Erreur inconnue: ${error.message}',
            originalError: error,
          );
      }
    }
    
    return ApiException(
      message: 'Erreur inattendue: ${error.toString()}',
      originalError: error,
    );
  }

  ApiException _handleHttpError(DioException error) {
    final statusCode = error.response?.statusCode;
    final responseData = error.response?.data;
    
    String message = 'Erreur serveur';
    List<String>? errors;
    
    // Extraire le message et les erreurs de la réponse
    if (responseData is Map<String, dynamic>) {
      message = responseData['message'] ?? responseData['error'] ?? message;
      if (responseData['errors'] is List) {
        errors = (responseData['errors'] as List)
            .map((e) => e.toString())
            .toList();
      }
    }
    
    switch (statusCode) {
      case 400:
        return ValidationException(message, errors: errors);
      case 401:
        return const AuthException('Non authentifié');
      case 403:
        return const AuthException('Accès refusé');
      case 404:
        return ServerException('Ressource non trouvée', statusCode: statusCode);
      case 422:
        return ValidationException(message, errors: errors);
      case 500:
        return ServerException('Erreur interne du serveur', statusCode: statusCode);
      case 502:
      case 503:
      case 504:
        return const NetworkException('Service temporairement indisponible');
      default:
        return ServerException(message, statusCode: statusCode, errors: errors);
    }
  }

  // ===== UTILITAIRES =====
  
  Future<void> setAuthToken(String token) async {
    await _storage.saveToken(token);
  }

  Future<void> clearAuthToken() async {
    await _storage.deleteToken();
  }

  Future<bool> hasValidToken() async {
    final token = await _storage.getToken();
    return token != null && token.isNotEmpty;
  }
}
