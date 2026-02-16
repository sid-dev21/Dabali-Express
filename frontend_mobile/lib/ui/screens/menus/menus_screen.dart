import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/services/modern_api_service.dart';
import '../../../providers/child_provider.dart';

class WeekDayReport {
  final String day;
  final String date;
  final String? mainDish;
  final List<String> items;

  const WeekDayReport({
    required this.day,
    required this.date,
    required this.mainDish,
    required this.items,
  });

  factory WeekDayReport.fromJson(Map<String, dynamic> json) {
    return WeekDayReport(
      day: json['day']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      mainDish: json['mainDish']?.toString(),
      items: (json['items'] as List<dynamic>? ?? []).map((item) => item.toString()).toList(),
    );
  }
}

class WeekReport {
  final String? schoolName;
  final String weekStart;
  final String weekEnd;
  final List<WeekDayReport> days;
  final List<String> missingDays;

  const WeekReport({
    required this.schoolName,
    required this.weekStart,
    required this.weekEnd,
    required this.days,
    required this.missingDays,
  });

  factory WeekReport.fromJson(Map<String, dynamic> json) {
    return WeekReport(
      schoolName: json['schoolName']?.toString(),
      weekStart: json['weekStart']?.toString() ?? '',
      weekEnd: json['weekEnd']?.toString() ?? '',
      days: (json['days'] as List<dynamic>? ?? [])
          .map((item) => WeekDayReport.fromJson(item as Map<String, dynamic>))
          .toList(),
      missingDays: (json['missingDays'] as List<dynamic>? ?? []).map((item) => item.toString()).toList(),
    );
  }
}

class MenusScreen extends StatefulWidget {
  const MenusScreen({super.key});

  @override
  State<MenusScreen> createState() => _MenusScreenState();
}

class _MenusScreenState extends State<MenusScreen> {
  static final RegExp _objectIdPattern = RegExp(r'^[a-fA-F0-9]{24}$');
  late Future<WeekReport?> _reportFuture;
  final ModernApiService _apiService = ModernApiService();

  @override
  void initState() {
    super.initState();
    _reportFuture = _loadWeekReport();
  }

  Future<WeekReport?> _loadWeekReport() async {
    final children = context.read<ChildProvider>().children;
    String? schoolId;
    if (children.isNotEmpty) {
      final preferredChild = children.firstWhere(
        (child) => child.isApproved,
        orElse: () => children.first,
      );
      schoolId = preferredChild.schoolId;
    }

    final normalizedSchoolId = schoolId?.trim();
    final isValidSchoolId = normalizedSchoolId != null && _objectIdPattern.hasMatch(normalizedSchoolId);

    try {
      final response = await _fetchWeekReport(
        schoolId: isValidSchoolId ? normalizedSchoolId : null,
      );
      if (response.success && response.data != null) {
        return WeekReport.fromJson(response.data!);
      }
      return null;
    } on ValidationException catch (error) {
      final shouldRetryWithoutSchoolId = isValidSchoolId &&
          error.message.toLowerCase().contains('school not found');

      if (!shouldRetryWithoutSchoolId) {
        rethrow;
      }

      final fallbackResponse = await _fetchWeekReport();
      if (fallbackResponse.success && fallbackResponse.data != null) {
        return WeekReport.fromJson(fallbackResponse.data!);
      }
      return null;
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> _fetchWeekReport({String? schoolId}) {
    return _apiService.get<Map<String, dynamic>>(
      '/menus/week-report',
      queryParameters: {
        if (schoolId != null && schoolId.isNotEmpty) 'schoolId': schoolId,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Rapport hebdomadaire'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: SafeArea(
        child: FutureBuilder<WeekReport?>(
          future: _reportFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              );
            }

            if (snapshot.hasError || snapshot.data == null) {
              return Center(
                child: Text(
                  'Aucun rapport disponible pour cette semaine.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              );
            }

            final report = snapshot.data!;
            final header = report.schoolName != null
                ? '${report.schoolName} ? ${report.weekStart} ? ${report.weekEnd}'
                : '${report.weekStart} ? ${report.weekEnd}';

            return ListView(
              padding: const EdgeInsets.all(AppTheme.lg),
              children: [
                Text(
                  'Menus de la semaine',
                  style: GoogleFonts.poppins(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: AppTheme.sm),
                Text(
                  header,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                if (report.missingDays.isNotEmpty) ...[
                  const SizedBox(height: AppTheme.md),
                  Container(
                    padding: const EdgeInsets.all(AppTheme.md),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                      border: Border.all(color: AppColors.warning.withOpacity(0.3)),
                    ),
                    child: Text(
                      'Menus manquants : ${report.missingDays.join(', ')}',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.warning,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: AppTheme.lg),
                ...report.days.map((day) => _WeekDayCard(day: day)),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _WeekDayCard extends StatelessWidget {
  final WeekDayReport day;

  const _WeekDayCard({required this.day});

  @override
  Widget build(BuildContext context) {
    final hasMenu = day.mainDish != null && day.mainDish!.isNotEmpty;
    final itemsText = day.items.isNotEmpty ? day.items.join(', ') : 'Aucun accompagnement';

    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.md),
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppColors.cardShadow,
        border: Border.all(
          color: hasMenu ? AppColors.primary.withOpacity(0.15) : AppColors.textTertiary.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: hasMenu ? AppColors.primary.withOpacity(0.1) : AppColors.textTertiary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.restaurant_menu,
                  color: hasMenu ? AppColors.primary : AppColors.textTertiary,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppTheme.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      day.day,
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      day.date,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.md),
          Text(
            hasMenu ? day.mainDish! : 'Menu non valid?',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: hasMenu ? AppColors.textPrimary : AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: AppTheme.xs),
          Text(
            hasMenu ? itemsText : 'Aucun menu disponible',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
