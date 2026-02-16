import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/api_constants.dart';
import '../../../data/services/api_service.dart';

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool read;
  final DateTime createdAt;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.read,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'INFO',
      read: json['read'] == true,
      createdAt: (json['createdAt'] ?? json['created_at']) != null
          ? DateTime.parse((json['createdAt'] ?? json['created_at']).toString())
          : DateTime.now(),
    );
  }
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ApiService _apiService = ApiService();
  List<NotificationItem> _notifications = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiService.get(ApiConstants.notifications);
      final data = response.data;
      if (data is Map<String, dynamic> && data['success'] == true) {
        final list = (data['data'] as List<dynamic>? ?? [])
            .map((item) => NotificationItem.fromJson(item as Map<String, dynamic>))
            .toList();
        if (!mounted) return;
        setState(() {
          _notifications = list;
        });
      } else {
        if (!mounted) return;
        setState(() {
          _notifications = [];
          _errorMessage = 'Impossible de charger les notifications';
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _notifications = [];
        _errorMessage = 'Impossible de charger les notifications';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<bool> _confirmAndDeleteNotification(NotificationItem item) async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Supprimer la notification'),
            content: const Text('Cette action est irreversible. Continuer ?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Annuler'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Supprimer'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) return false;

    if (item.id.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Suppression impossible pour cette notification')),
      );
      return false;
    }

    try {
      await _apiService.delete('${ApiConstants.notifications}/${item.id}');
      if (!mounted) return false;
      setState(() {
        _notifications.removeWhere((n) => n.id == item.id);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Notification supprimee')),
      );
      return true;
    } catch (_) {
      if (!mounted) return false;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Echec de la suppression')),
      );
      return false;
    }
  }

  String _formatRelative(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    if (difference.inDays == 0) return 'Aujourd\'hui';
    if (difference.inDays == 1) return 'Hier';
    if (difference.inDays < 7) return 'Il y a ${difference.inDays} jours';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'WEEK_MENU_AVAILABLE':
        return Icons.restaurant_menu;
      case 'MENU_AVAILABLE':
        return Icons.restaurant_menu;
      case 'PAYMENT':
        return Icons.payment;
      case 'MEAL_MISSED':
      case 'ABSENCE':
        return Icons.person_off;
      case 'MEAL_TAKEN':
        return Icons.check_circle;
      case 'INFO':
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String type) {
    switch (type) {
      case 'WEEK_MENU_AVAILABLE':
        return AppColors.info;
      case 'MENU_AVAILABLE':
        return AppColors.info;
      case 'PAYMENT':
        return AppColors.warning;
      case 'MEAL_MISSED':
      case 'ABSENCE':
        return Colors.redAccent;
      case 'MEAL_TAKEN':
        return AppColors.success;
      case 'INFO':
      default:
        return AppColors.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _isLoading ? null : _fetchNotifications,
            icon: const Icon(Icons.refresh),
            tooltip: 'Rafraichir',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _errorMessage != null
              ? Center(
                  child: Text(
                    _errorMessage!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                )
              : _notifications.isEmpty
                  ? Center(
                      child: Text(
                        'Aucune notification pour le moment',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(AppTheme.lg),
                      itemCount: _notifications.length,
                      separatorBuilder: (_, __) => const SizedBox(height: AppTheme.md),
                      itemBuilder: (context, index) {
                        final notification = _notifications[index];
                        return Dismissible(
                          key: ValueKey('${notification.id}_$index'),
                          direction: DismissDirection.endToStart,
                          background: Container(
                            decoration: BoxDecoration(
                              color: Colors.redAccent,
                              borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                            ),
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.symmetric(horizontal: AppTheme.lg),
                            child: const Icon(
                              Icons.delete_outline,
                              color: Colors.white,
                            ),
                          ),
                          confirmDismiss: (_) => _confirmAndDeleteNotification(notification),
                          child: _NotificationCard(
                            title: notification.title,
                            message: notification.message,
                            time: _formatRelative(notification.createdAt),
                            icon: _iconForType(notification.type),
                            color: _colorForType(notification.type),
                            isRead: notification.read,
                          ),
                        );
                      },
                    ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final String title;
  final String message;
  final String time;
  final IconData icon;
  final Color color;
  final bool isRead;

  const _NotificationCard({
    required this.title,
    required this.message,
    required this.time,
    required this.icon,
    required this.color,
    required this.isRead,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: isRead ? AppColors.surface : AppColors.surface.withOpacity(0.95),
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppColors.cardShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            ),
            child: Icon(
              icon,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(width: AppTheme.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppTheme.xs),
                Text(
                  message,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppTheme.xs),
                Text(
                  time,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
