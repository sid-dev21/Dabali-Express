import 'package:flutter/foundation.dart';

class ApiConstants {
  // URL de base de l'API
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kDebugMode 
      ? 'http://localhost:5000/api' 
      : 'https://api.dabali-express.com/api',
  );
  
  static String get baseUrl => _baseUrl;
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
  
  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String profile = '/auth/me';
  static const String updateCredentials = '/auth/update-credentials';
  static const String refresh = '/auth/refresh-token';
  
  // Children Endpoints
  static const String children = '/students';
  static const String addChild = '/students';
  static String childDetails(String childId) => '/students/$childId';
  static String childrenByParent(String parentId) => '/students/parent/$parentId';
  
  // Schools Endpoints
  static const String schools = '/schools';
  static const String publicSchools = '/schools/public';
  
  // Subscriptions Endpoints
  static const String subscriptions = '/subscriptions';
  static const String createSubscription = '/subscriptions';
  static String subscriptionDetails(String subscriptionId) => '/subscriptions/$subscriptionId';
  static String studentSubscriptions(String studentId) => '/subscriptions/student/$studentId';
  
  // Payments Endpoints
  static const String payments = '/payments';
  static String initiatePayment(String subscriptionId) => '/subscriptions/$subscriptionId/payment';
  static String confirmSubscriptionPayment(String subscriptionId) => '/subscriptions/$subscriptionId/payment/confirm';
  static String paymentStatus(String paymentId) => '/payments/$paymentId';
  static String verifyPayment(String paymentId) => '/payments/$paymentId/verify';
  
  // Menus Endpoints
  static const String menus = '/menus';
  static String weekMenu(String schoolId) => '/menus/week/$schoolId';
  static String dailyMenu(String schoolId, String date) => '/menus/daily/$schoolId/$date';
  
  // Attendance Endpoints
  static const String attendance = '/attendance';
  static String studentAttendance(String studentId) => '/attendance/student/$studentId';
  
  // Notifications Endpoints
  static const String notifications = '/notifications';
  
  // Headers
  static Map<String, String> get defaultHeaders => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}
