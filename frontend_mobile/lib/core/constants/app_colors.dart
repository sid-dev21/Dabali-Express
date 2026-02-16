import 'package:flutter/material.dart';

class AppColors {
  // Brand colors aligned with web palette
  static const Color primary = Color(0xFF2B2A27);
  static const Color primaryDark = Color(0xFF1F1E1B);
  static const Color secondary = Color(0xFFC9A227);
  static const Color secondaryDark = Color(0xFFB08B1B);

  // Semantic colors
  static const Color danger = Color(0xFFDC2626);
  static const Color info = Color(0xFF0F766E);
  static const Color success = secondary;
  static const Color warning = Color(0xFFF2901C);
  static const Color error = danger;

  // Neutral colors
  static const Color background = Color(0xFFF7F4EF);
  static const Color surface = Color(0xFFFFFDFA);
  static const Color surfaceAlt = Color(0xFFF4EFE7);
  static const Color card = surface;
  static const Color border = Color(0xFFE3DDD3);

  // Text colors
  static const Color textPrimary = Color(0xFF2B2A27);
  static const Color textStrong = Color(0xFF1D1B18);
  static const Color textSecondary = Color(0xFF7B746D);
  static const Color textTertiary = Color(0xFFA39C94);

  // Payment method colors
  static const Color orangeMoney = Color(0xFFFF6600);
  static const Color moovMoney = Color(0xFF00A8E1);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient secondaryGradient = LinearGradient(
    colors: [secondary, secondaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Shadows
  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: const Color(0xFF1D1B18).withOpacity(0.14),
          blurRadius: 26,
          spreadRadius: -18,
          offset: const Offset(0, 12),
        ),
      ];

  static List<BoxShadow> get buttonShadow => [
        BoxShadow(
          color: secondary.withOpacity(0.32),
          blurRadius: 24,
          spreadRadius: -12,
          offset: const Offset(0, 10),
        ),
      ];
}
