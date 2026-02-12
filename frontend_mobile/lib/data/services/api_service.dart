import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import '../../core/constants/api_constants.dart';
import 'storage_service.dart';
import 'mock_api_service.dart';

class ApiService {
  late final Dio _dio;
  final StorageService _storage = StorageService();
  final Logger _logger = Logger();
  
  // Active uniquement pour tests locaux sans backend.
  final bool useMockData = false;
  late final MockApiService _mockApi;

  ApiService() {
    _mockApi = MockApiService();
    
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
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
          _logger.d('📦 Data: ${options.data}');
          
          return handler.next(options);
        },
        
        onResponse: (response, handler) {
          _logger.d('✅ RESPONSE [${response.statusCode}] => ${response.requestOptions.path}');
          return handler.next(response);
        },
        
        onError: (error, handler) {
          _logger.e('❌ ERROR [${error.response?.statusCode}] => ${error.requestOptions.path}');
          _logger.e('Message: ${error.message}');
          _logger.e('Response: ${error.response?.data}');
          return handler.next(error);
        },
      ),
    );
  }

  // ===== GET REQUEST =====
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    // 🎭 Si mode mock activé, utiliser les données mockées
    if (useMockData) {
      return await _mockApi.get(path, queryParameters: queryParameters);
    }
    
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  // ===== POST REQUEST =====
  Future<Response> post(String path, {dynamic data}) async {
    // 🎭 Si mode mock activé, utiliser les données mockées
    if (useMockData) {
      return await _mockApi.post(path, data: data);
    }
    
    try {
      return await _dio.post(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  // ===== PUT REQUEST =====
  Future<Response> put(String path, {dynamic data}) async {
    // 🎭 Si mode mock activé, utiliser les données mockées
    if (useMockData) {
      return await _mockApi.put(path, data: data);
    }
    
    try {
      return await _dio.put(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  // ===== DELETE REQUEST =====
  Future<Response> delete(String path) async {
    // 🎭 Si mode mock activé, utiliser les données mockées
    if (useMockData) {
      return await _mockApi.delete(path);
    }
    
    try {
      return await _dio.delete(path);
    } catch (e) {
      rethrow;
    }
  }
}
