class ApiConstants {
  // URL de base pour le web (Chrome)
  static const String baseUrl = 'http://localhost:5000/api';
  
  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  
  // Students Endpoints
  static const String students = '/students';
  static String studentsByParent(int parentId) => '/students/parent/$parentId';
  
  // Menus Endpoints
  static const String menus = '/menus';
  static String weekMenu(int schoolId) => '/menus/week/$schoolId';
  
  // Subscriptions Endpoints
  static const String subscriptions = '/subscriptions';
  static String studentSubscriptions(int studentId) => 
      '/subscriptions/student/$studentId';
  
  // Payments Endpoints
  static const String payments = '/payments';
  static String verifyPayment(int paymentId) => '/payments/$paymentId/verify';
  
  // Attendance Endpoints
  static const String attendance = '/attendance';
}