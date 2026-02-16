import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

class NetworkConfig {
  static final Logger _logger = Logger();
  
  // Configuration de l'API
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kDebugMode 
      ? 'http://localhost:3001/api' 
      : 'https://api.dabali-express.com/api',
  );

  static String get baseUrl => _baseUrl;
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
  
  // Endpoints
  static const String auth = '/auth';
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String profile = '/auth/me';
  static const String refresh = '/auth/refresh-token';
  
  static const String children = '/children';
  static const String addChild = '/children';
  static const String childDetails = '/children';
  
  static const String subscriptions = '/subscriptions';
  static const String createSubscription = '/subscriptions';
  static const String subscriptionDetails = '/subscriptions';
  
  static const String payments = '/payments';
  static const String initiatePayment = '/payments/initiate';
  static const String paymentStatus = '/payments';
  
  static const String menus = '/menus';
  static const String attendance = '/attendance';
  
  // Headers
  static Map<String, String> get defaultHeaders => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  static Map<String, String> get authHeaders => {
    ...defaultHeaders,
    'Authorization': 'Bearer ${_getToken()}',
  };
  
  static String? _getToken() {
    // Cette méthode sera implémentée avec le service de stockage
    return null;
  }
  
  // Pour le débogage
  static void printNetworkInfo() {
    _logger.d('=== Configuration réseau ===');
    _logger.d('Environment: ${kDebugMode ? "Development" : "Production"}');
    _logger.d('Base URL: $baseUrl');
    _logger.d('Connect Timeout: ${connectTimeout.inSeconds}s');
    _logger.d('Receive Timeout: ${receiveTimeout.inSeconds}s');
    _logger.d('==========================');
  }
}
