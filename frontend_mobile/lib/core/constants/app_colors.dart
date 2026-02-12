import 'package:flutter/material.dart';

class AppColors {
  // Couleurs principales basées sur le design moderne demandé
  static const Color primary = Color(0xFF059669); // Emerald 600 - CTA buttons (vert du web)
  static const Color secondary = Color(0xFF10B981); // Emerald 500 - actions secondaires
  static const Color danger = Color(0xFFEF4444); // Red 500
  static const Color info = Color(0xFF3B82F6); // Blue 500
  
  // Couleurs neutres
  static const Color background = Color(0xFFF9FAFB); // gray-50
  static const Color surface = Colors.white;
  static const Color card = Colors.white;
  
  // Couleurs de texte
  static const Color textPrimary = Color(0xFF111827); // gray-900
  static const Color textSecondary = Color(0xFF4B5563); // gray-600
  static const Color textTertiary = Color(0xFF9CA3AF); // gray-400
  
  // Couleurs de statut
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color error = Color(0xFFEF4444); // Red 500
  
  // Méthodes de paiement
  static const Color orangeMoney = Color(0xFFFF6600);
  static const Color moovMoney = Color(0xFF00A8E1);
  
  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, Color(0xFF047857)], // Emerald 600 à Emerald 700
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  // Ombres
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: Colors.black.withOpacity(0.05),
      blurRadius: 10,
      offset: const Offset(0, 2),
    ),
  ];
  
  static List<BoxShadow> get buttonShadow => [
    BoxShadow(
      color: primary.withOpacity(0.3),
      blurRadius: 8,
      offset: const Offset(0, 4),
    ),
  ];
}