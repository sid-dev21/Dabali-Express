import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/child_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/custom_button.dart';
import '../subscriptions/create_subscription_screen.dart';

class ChildDetailsScreen extends StatelessWidget {
  final dynamic child;

  const ChildDetailsScreen({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(child.fullName ?? 'Détails de l\'enfant'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: Consumer2<ChildProvider, SubscriptionProvider>(
        builder: (context, childProvider, subscriptionProvider, _) {
          final activeSubscription = subscriptionProvider.getActiveSubscriptionForChild(child.id);
          final pendingSubscription = subscriptionProvider.getPendingSubscriptionForChild(child.id);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppTheme.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Photo et informations de base
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    boxShadow: AppColors.cardShadow,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                        ),
                        child: Icon(
                          Icons.child_care,
                          color: AppColors.primary,
                          size: 40,
                        ),
                      ),
                      const SizedBox(width: AppTheme.lg),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              child.fullName ?? 'Nom Enfant',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppTheme.sm),
                            Text(
                              child.className ?? 'Classe',
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: AppTheme.xs),
                            Text(
                              'Né(e) le ${child.dateOfBirth ?? ''}',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppColors.textTertiary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppTheme.lg),

                // Statut de l'enfant
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: _getStatusColor(child.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    border: Border.all(color: _getStatusColor(child.status).withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _getStatusIcon(child.status),
                        color: _getStatusColor(child.status),
                        size: 24,
                      ),
                      const SizedBox(width: AppTheme.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Statut',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                            Text(
                              _getStatusText(child.status),
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: _getStatusColor(child.status),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppTheme.lg),

                _SchoolAndMenuSection(
                  schoolId: _extractSchoolId(child),
                  childId: (child.id ?? '').toString(),
                  initialSchoolName: _extractSchoolName(child),
                ),

                const SizedBox(height: AppTheme.lg),

                // Section Abonnement
                Text(
                  'Abonnement',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppTheme.md),

                if (activeSubscription != null) ...[
                  _ActiveSubscriptionCard(subscription: activeSubscription),
                ] else if (pendingSubscription != null) ...[
                  _PendingSubscriptionCard(subscription: pendingSubscription),
                ] else ...[
                  _NoSubscriptionCard(
                    childId: child.id,
                    childName: child.fullName,
                    schoolId: _extractSchoolId(child),
                  ),
                ],

                const SizedBox(height: AppTheme.xl),

                // Actions supprimées
              ],
            ),
          );
        },
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'PENDING':
        return AppColors.warning;
      case 'APPROVED':
        return AppColors.success;
      case 'REJECTED':
        return AppColors.error;
      default:
        return AppColors.textTertiary;
    }
  }

  IconData _getStatusIcon(String? status) {
    switch (status) {
      case 'PENDING':
        return Icons.pending_outlined;
      case 'APPROVED':
        return Icons.check_circle_outline;
      case 'REJECTED':
        return Icons.cancel_outlined;
      default:
        return Icons.help_outline;
    }
  }

  String _getStatusText(String? status) {
    switch (status) {
      case 'PENDING':
        return 'En attente de validation';
      case 'APPROVED':
        return 'Validé';
      case 'REJECTED':
        return 'Rejeté';
      default:
        return 'Statut inconnu';
    }
  }

  String _extractSchoolId(dynamic value) {
    try {
      final rawSchoolId = value.schoolId ?? value.school_id;
      if (rawSchoolId == null) return '';
      if (rawSchoolId is Map<String, dynamic>) {
        return (rawSchoolId['_id'] ?? rawSchoolId['id'] ?? '').toString();
      }
      return rawSchoolId.toString();
    } catch (_) {
      return '';
    }
  }

  String _extractSchoolName(dynamic value) {
    try {
      final directName = (value.schoolName ?? value.school_name ?? '').toString().trim();
      if (directName.isNotEmpty) return directName;

      final rawSchool = value.school ?? value.school_id ?? value.schoolId;
      if (rawSchool is Map<String, dynamic>) {
        final nestedName = (rawSchool['name'] ?? '').toString().trim();
        if (nestedName.isNotEmpty) return nestedName;
      }

      return '';
    } catch (_) {
      return '';
    }
  }
}

class _SchoolAndMenuSection extends StatefulWidget {
  final String schoolId;
  final String childId;
  final String initialSchoolName;

  const _SchoolAndMenuSection({
    required this.schoolId,
    required this.childId,
    required this.initialSchoolName,
  });

  @override
  State<_SchoolAndMenuSection> createState() => _SchoolAndMenuSectionState();
}

class _SchoolAndMenuSectionState extends State<_SchoolAndMenuSection> {
  bool _isLoading = true;
  String _schoolName = '--';
  List<_SchoolMenuEntry> _menus = const [];

  @override
  void initState() {
    super.initState();
    _loadSchoolAndMenu();
  }

  Future<void> _loadSchoolAndMenu() async {
    String nextSchoolName = widget.initialSchoolName.trim();
    final weekStart = _startOfWeek(DateTime.now());

    if (widget.schoolId.trim().isEmpty) {
      if (!mounted) return;
      setState(() {
        _schoolName = nextSchoolName.isNotEmpty ? nextSchoolName : 'Ecole non renseignee';
        _menus = const [];
        _isLoading = false;
      });
      return;
    }

    final api = ApiService();

    try {
      if (nextSchoolName.isEmpty && widget.childId.trim().isNotEmpty) {
        final childResponse = await api.get('/students/${widget.childId}');
        final childBody = childResponse.data;
        if (childBody is Map<String, dynamic>) {
          final childData = childBody['data'];
          if (childData is Map<String, dynamic>) {
            final school = childData['school_id'] ?? childData['schoolId'];
            if (school is Map<String, dynamic>) {
              final resolved = (school['name'] ?? '').toString().trim();
              if (resolved.isNotEmpty) {
                nextSchoolName = resolved;
              }
            }
          }
        }
      }
    } catch (_) {
      // Keep fallback values.
    }

    List<_SchoolMenuEntry> parsedMenus = const [];
    try {
      final weeklyResponse = await api.get(
        '/menus/week/${widget.schoolId}',
        queryParameters: {
          'school_id': widget.schoolId,
          'start_date': _formatApiDate(weekStart),
        },
      );
      parsedMenus = _extractMenusFromPayload(weeklyResponse.data);
    } catch (_) {
      // Fallback for backends where weekly endpoint is unavailable.
      try {
        final menuListResponse = await api.get(
          '/menus',
          queryParameters: {'school_id': widget.schoolId},
        );
        parsedMenus = _extractMenusFromPayload(menuListResponse.data)
            .where((menu) => _isDateInWeek(menu.dateValue, weekStart))
            .toList();
      } catch (_) {
        // Keep empty list.
      }
    }

    if (parsedMenus.isNotEmpty) {
      parsedMenus.sort((a, b) {
        final left = a.dateValue;
        final right = b.dateValue;
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return left.compareTo(right);
      });
    }

    if (nextSchoolName.isEmpty) {
      for (final menu in parsedMenus) {
        if (menu.schoolName.isNotEmpty) {
          nextSchoolName = menu.schoolName;
          break;
        }
      }
    }
    
    if (!mounted) return;
    setState(() {
      _schoolName = nextSchoolName.isNotEmpty ? nextSchoolName : '--';
      _menus = parsedMenus;
      _isLoading = false;
    });
  }

  DateTime _startOfWeek(DateTime value) {
    final normalized = DateTime(value.year, value.month, value.day);
    return normalized.subtract(Duration(days: normalized.weekday - 1));
  }

  bool _isDateInWeek(DateTime? value, DateTime weekStart) {
    if (value == null) return false;
    final normalized = DateTime(value.year, value.month, value.day);
    final weekEndExclusive = weekStart.add(const Duration(days: 7));
    return !normalized.isBefore(weekStart) && normalized.isBefore(weekEndExclusive);
  }

  String _formatApiDate(DateTime value) {
    String two(int number) => number.toString().padLeft(2, '0');
    return '${value.year}-${two(value.month)}-${two(value.day)}';
  }

  List<_SchoolMenuEntry> _extractMenusFromPayload(dynamic payload) {
    final rawMenus = <dynamic>[];

    if (payload is Map<String, dynamic>) {
      final data = payload['data'];
      if (data is List) {
        rawMenus.addAll(data);
      } else if (data is Map<String, dynamic>) {
        rawMenus.add(data);
      } else if (payload['success'] == true && data != null) {
        rawMenus.add(data);
      }
    } else if (payload is List) {
      rawMenus.addAll(payload);
    }

    final parsed = <_SchoolMenuEntry>[];
    for (final rawMenu in rawMenus) {
      final menu = _parseMenu(rawMenu);
      if (menu != null) {
        parsed.add(menu);
      }
    }
    return parsed;
  }

  _SchoolMenuEntry? _parseMenu(dynamic rawMenu) {
    if (rawMenu is! Map<String, dynamic>) {
      return null;
    }

    String read(dynamic value) => (value ?? '').toString().trim();

    List<String> parseItems(dynamic value) {
      if (value is! List) return const <String>[];
      final items = <String>[];
      for (final item in value) {
        if (item is String && item.trim().isNotEmpty) {
          items.add(item.trim());
        } else if (item is Map<String, dynamic>) {
          final name = read(item['name']);
          if (name.isNotEmpty) items.add(name);
        }
      }
      return items;
    }

    final date = read(rawMenu['date']);
    final mealType = read(rawMenu['meal_type']).isNotEmpty
        ? read(rawMenu['meal_type'])
        : read(rawMenu['mealType']);
    final status = read(rawMenu['status']);
    final description = read(rawMenu['description']);
    final notes = read(rawMenu['notes']);
    final items = parseItems(rawMenu['items']);

    String schoolName = '';
    final schoolData = rawMenu['school_id'] ?? rawMenu['schoolId'];
    if (schoolData is Map<String, dynamic>) {
      schoolName = read(schoolData['name']);
    }

    final titleCandidates = <String>[
      read(rawMenu['meal_name']),
      read(rawMenu['mealName']),
      read(rawMenu['name']),
      if (description.isNotEmpty) description,
      if (items.isNotEmpty) items.first,
      'Menu',
    ];

    final title = titleCandidates.firstWhere((value) => value.isNotEmpty);
    final itemList = <String>[
      if (items.isNotEmpty) ...items,
      if (items.isEmpty && description.isNotEmpty) description,
      if (notes.isNotEmpty) notes,
    ];

    DateTime? dateValue;
    if (date.isNotEmpty) {
      dateValue = DateTime.tryParse(date);
    }
    final dayLabel = _formatDayLabel(dateValue, rawDate: date);

    final metaParts = <String>[
      if (dayLabel.isNotEmpty) dayLabel,
      if (mealType.isNotEmpty) mealType,
      if (status.isNotEmpty) status,
    ];

    return _SchoolMenuEntry(
      title: title,
      meta: metaParts.join(' - '),
      items: itemList,
      schoolName: schoolName,
      dateValue: dateValue,
    );
  }

  String _formatDayLabel(DateTime? value, {required String rawDate}) {
    if (value == null) {
      return rawDate.isNotEmpty ? rawDate.split('T').first : '';
    }

    const dayNames = <String>[
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
      'Dimanche',
    ];

    final normalized = value.toLocal();
    final weekday = dayNames[normalized.weekday - 1];
    final day = normalized.day.toString().padLeft(2, '0');
    final month = normalized.month.toString().padLeft(2, '0');
    return '$weekday $day/$month';
  }

  Widget _buildMenuCard(BuildContext context, _SchoolMenuEntry menu) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.sm),
      padding: const EdgeInsets.all(AppTheme.md),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            menu.title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
          ),
          if (menu.meta.isNotEmpty) ...[
            const SizedBox(height: AppTheme.xs),
            Text(
              menu.meta,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textTertiary,
                  ),
            ),
          ],
          if (menu.items.isNotEmpty) ...[
            const SizedBox(height: AppTheme.sm),
            ...menu.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text(
                  '- $item',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppColors.cardShadow,
      ),
      child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ecole',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
                const SizedBox(height: AppTheme.xs),
                Text(
                  _schoolName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: AppTheme.lg),
                Text(
                  'Menu de la semaine',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
                const SizedBox(height: AppTheme.xs),
                if (_menus.isEmpty)
                  Text(
                    'Aucun menu programme cette semaine.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  )
                else
                  ..._menus.map((menu) => _buildMenuCard(context, menu)),
              ],
            ),
    );
  }
}

class _SchoolMenuEntry {
  final String title;
  final String meta;
  final List<String> items;
  final String schoolName;
  final DateTime? dateValue;

  const _SchoolMenuEntry({
    required this.title,
    required this.meta,
    required this.items,
    required this.schoolName,
    required this.dateValue,
  });
}

class _ActiveSubscriptionCard extends StatelessWidget {
  final dynamic subscription;

  const _ActiveSubscriptionCard({required this.subscription});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: AppColors.success.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        border: Border.all(color: AppColors.success.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.check_circle,
                color: AppColors.success,
                size: 20,
              ),
              const SizedBox(width: AppTheme.sm),
              Expanded(
                child: Text(
                  '✅ Abonnement actif',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.md),
          
          // Informations détaillées de l'abonnement
          Container(
            padding: const EdgeInsets.all(AppTheme.md),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(color: AppColors.success.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Type d'abonnement
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Forfait',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        subscription.typeDisplayName ?? 'Mensuel',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.sm),
                
                // Date de début
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Début',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        subscription.startDate != null ? _formatDate(subscription.startDate) : 'Non définie',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.sm),
                
                // Date d'expiration
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Expiration',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        subscription.endDate != null ? _formatDate(subscription.endDate) : 'Non définie',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.sm),
                
                // Montant payé
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Montant',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        '${subscription.amount ?? 0} FCFA',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}

class _PendingSubscriptionCard extends StatelessWidget {
  final dynamic subscription;

  const _PendingSubscriptionCard({required this.subscription});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        border: Border.all(color: AppColors.warning.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.pending,
                color: AppColors.warning,
                size: 20,
              ),
              const SizedBox(width: AppTheme.sm),
              Expanded(
                child: Text(
                  '⏳ En attente de validation',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.warning,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.md),
          
          // Informations détaillées de l'abonnement
          Container(
            padding: const EdgeInsets.all(AppTheme.md),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(color: AppColors.warning.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Type d'abonnement
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Forfait',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        subscription.typeDisplayName ?? 'Mensuel',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.sm),
                
                // Date de début
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Début',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        subscription.startDate != null ? _formatDate(subscription.startDate) : 'Non définie',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.sm),
                
                // Date d'expiration
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Expiration',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        subscription.endDate != null ? _formatDate(subscription.endDate) : 'Non définie',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.sm),
                
                // Montant en attente
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Montant',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        '${subscription.amount ?? 0} FCFA',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.warning,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppTheme.sm),
                
                // Méthode de paiement
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        'Paiement',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: Text(
                        subscription.paymentMethod ?? 'Non défini',
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const SizedBox(height: AppTheme.md),
          
          // Message d'information
          Container(
            padding: const EdgeInsets.all(AppTheme.md),
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: AppColors.warning,
                  size: 16,
                ),
                const SizedBox(width: AppTheme.sm),
                Expanded(
                  child: Text(
                    'Le paiement est en attente de validation par l\'administration. L\'abonnement sera activé dès que le paiement sera confirmé.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.warning,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}

class _NoSubscriptionCard extends StatelessWidget {
  final String childId;
  final String? childName;
  final String? schoolId;

  const _NoSubscriptionCard({
    required this.childId,
    this.childName,
    this.schoolId,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppColors.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: AppColors.info,
                size: 20,
              ),
              const SizedBox(width: AppTheme.sm),
              Text(
                'Aucun abonnement actif',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.info,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.md),
          Text(
            'Créez un abonnement pour que ${childName ?? 'votre enfant'} puisse bénéficier des repas de la cantine.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppTheme.lg),
          CustomButton(
            text: 'Créer un abonnement',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => CreateSubscriptionScreen(
                    childId: childId,
                    schoolId: schoolId,
                  ),
                ),
              );
            },
            fullWidth: true,
          ),
        ],
      ),
    );
  }
}

