import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/menu_provider.dart';
import '../../../providers/student_provider.dart';
import '../../../core/constants/app_colors.dart';

class MenuWeekScreen extends StatefulWidget {
  const MenuWeekScreen({super.key});

  @override
  State<MenuWeekScreen> createState() => _MenuWeekScreenState();
}

class _MenuWeekScreenState extends State<MenuWeekScreen> {
  static const List<String> _dayNames = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
  ];

  DateTime _currentWeekStart = DateTime.now();

  @override
  void initState() {
    super.initState();
    _currentWeekStart = _startOfWeek(DateTime.now());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadMenus();
    });
  }

  Future<void> _loadMenus() async {
    final studentProvider = context.read<StudentProvider>();
    final menuProvider = context.read<MenuProvider>();

    // Charger les menus de la première école trouvée
    if (studentProvider.students.isNotEmpty) {
      final schoolId = studentProvider.students.first.schoolId;
      await menuProvider.loadWeekMenu(
        schoolId,
        startDate: _toIsoDate(_currentWeekStart),
      );
    }
  }

  DateTime _startOfWeek(DateTime date) {
    return date.subtract(Duration(days: date.weekday - 1));
  }

  String _toIsoDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _goToPreviousWeek() {
    setState(() {
      _currentWeekStart = _currentWeekStart.subtract(const Duration(days: 7));
    });
    _loadMenus();
  }

  void _goToNextWeek() {
    setState(() {
      _currentWeekStart = _currentWeekStart.add(const Duration(days: 7));
    });
    _loadMenus();
  }

  @override
  Widget build(BuildContext context) {
    final menuProvider = context.watch<MenuProvider>();
    final studentProvider = context.watch<StudentProvider>();
    final weekDays =
        List.generate(5, (index) => _currentWeekStart.add(Duration(days: index)));
    final menuByDate = {
      for (final menu in menuProvider.menus) menu.date: menu,
    };

    return Scaffold(
      appBar: AppBar(
        title: const Text('Menus de la semaine'),
      ),
      body: studentProvider.students.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.info_outline, size: 60, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Ajoutez d\'abord un enfant\npour voir les menus',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : menuProvider.isLoading
              ? const Center(child: CircularProgressIndicator())
              : menuProvider.errorMessage != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline,
                              size: 60, color: AppColors.error),
                          const SizedBox(height: 16),
                          Text(
                            menuProvider.errorMessage!,
                            style: const TextStyle(color: AppColors.error),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadMenus,
                            child: const Text('Réessayer'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                          onRefresh: _loadMenus,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: weekDays.length + 1,
                            itemBuilder: (context, index) {
                              if (index == 0) {
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 16),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        IconButton(
                                          onPressed: _goToPreviousWeek,
                                          icon: const Icon(Icons.chevron_left),
                                          tooltip: 'Semaine précédente',
                                        ),
                                        Text(
                                          '${_formatDate(weekDays.first)} - ${_formatDate(weekDays.last)}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        IconButton(
                                          onPressed: _goToNextWeek,
                                          icon: const Icon(Icons.chevron_right),
                                          tooltip: 'Semaine suivante',
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }
                              final dayIndex = index - 1;
                              final day = weekDays[dayIndex];
                              final dateKey = _toIsoDate(day);
                              final menu = menuByDate[dateKey];

                              return Card(
                                margin: const EdgeInsets.only(bottom: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // En-tête (jour + date)
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            _dayNames[dayIndex],
                                            style: const TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                          Text(
                                            _formatDate(day),
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),

                                      // Type de repas
                                      if (menu != null) ...[
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 6,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppColors.secondary
                                                .withOpacity(0.1),
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            menu.mealTypeLabel,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.secondary,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                      ],

                                      // Description
                                      if (menu == null) ...[
                                        Text(
                                          'Menu non publié pour ce jour.',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.grey[700],
                                          ),
                                        ),
                                      ] else if (menu.description != null) ...[
                                        Text(
                                          menu.description!,
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.grey[700],
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                      ],

                                      // Plats
                                      if (menu != null && menu.items.isNotEmpty) ...[
                                        const Text(
                                          'Plats :',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        ...menu.items.map((item) {
                                          return Padding(
                                            padding: const EdgeInsets.only(
                                                bottom: 6),
                                            child: Row(
                                              children: [
                                                const Icon(
                                                  Icons.check_circle,
                                                  size: 16,
                                                  color: AppColors.success,
                                                ),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                  child: Text(
                                                    item,
                                                    style: const TextStyle(
                                                        fontSize: 14),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          );
                                        }).toList(),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
    );
  }
}
