import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/child_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
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
                  ),
                ],

                const SizedBox(height: AppTheme.xl),

                // Actions
                if (child.status == 'APPROVED') ...[
                  CustomButton(
                    text: 'Voir les menus',
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité bientôt disponible'),
                        ),
                      );
                    },
                    fullWidth: true,
                  ),
                  const SizedBox(height: AppTheme.md),
                  CustomButton(
                    text: 'Historique des repas',
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité bientôt disponible'),
                        ),
                      );
                    },
                    backgroundColor: AppColors.secondary,
                    fullWidth: true,
                  ),
                ],
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
              Text(
                '✅ Abonnement actif',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.md),
          Text(
            '${subscription.typeDisplayName ?? 'Mensuel'}',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppTheme.xs),
          Text(
            'Actif jusqu\'au ${subscription.calculatedEndDate != null ? _formatDate(subscription.calculatedEndDate) : 'Date non définie'}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day}/${date.month}/${date.year}';
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
              Text(
                '⏳ En attente de paiement',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.md),
          Text(
            'Abonnement ${subscription.typeDisplayName ?? 'Mensuel'} - ${subscription.amount ?? 0} FCFA',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoSubscriptionCard extends StatelessWidget {
  final String childId;
  final String? childName;

  const _NoSubscriptionCard({
    required this.childId,
    this.childName,
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
                  builder: (context) => CreateSubscriptionScreen(childId: childId),
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
