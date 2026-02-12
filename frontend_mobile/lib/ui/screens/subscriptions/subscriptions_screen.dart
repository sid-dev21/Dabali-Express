import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../widgets/custom_button.dart';
import 'create_subscription_screen.dart';

class SubscriptionsScreen extends StatefulWidget {
  const SubscriptionsScreen({super.key});

  @override
  State<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends State<SubscriptionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<SubscriptionProvider>(context, listen: false).fetchSubscriptions();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Abonnements'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Veuillez d\'abord sélectionner un enfant'),
                ),
              );
            },
          ),
        ],
      ),
      body: Consumer<SubscriptionProvider>(
        builder: (context, subscriptionProvider, _) {
          if (subscriptionProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (subscriptionProvider.errorMessage != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppColors.error,
                  ),
                  const SizedBox(height: AppTheme.md),
                  Text(
                    subscriptionProvider.errorMessage!,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.error,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppTheme.md),
                  CustomButton(
                    text: 'Réessayer',
                    onPressed: () {
                      subscriptionProvider.clearError();
                      subscriptionProvider.fetchSubscriptions();
                    },
                  ),
                ],
              ),
            );
          }

          final subscriptions = subscriptionProvider.subscriptions;

          if (subscriptions.isEmpty) {
            return _EmptyState();
          }

          return RefreshIndicator(
            onRefresh: () => subscriptionProvider.refreshSubscriptions(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppTheme.lg),
              itemCount: subscriptions.length,
              separatorBuilder: (context, index) => const SizedBox(height: AppTheme.md),
              itemBuilder: (context, index) {
                final subscription = subscriptions[index];
                return _SubscriptionCard(subscription: subscription);
              },
            ),
          );
        },
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  final dynamic subscription;

  const _SubscriptionCard({required this.subscription});

  @override
  Widget build(BuildContext context) {
    final isActive = subscription.status == 'ACTIVE';
    final isPending = subscription.status == 'PENDING_PAYMENT';
    final isExpired = subscription.status == 'EXPIRED';

    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (subscription.status) {
      case 'ACTIVE':
        statusColor = AppColors.success;
        statusIcon = Icons.check_circle;
        statusText = 'Actif';
        break;
      case 'PENDING_PAYMENT':
        statusColor = AppColors.warning;
        statusIcon = Icons.pending;
        statusText = 'En attente';
        break;
      case 'EXPIRED':
        statusColor = AppColors.error;
        statusIcon = Icons.cancel;
        statusText = 'Expiré';
        break;
      default:
        statusColor = AppColors.textTertiary;
        statusIcon = Icons.help;
        statusText = 'Inconnu';
    }

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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.sm,
                            vertical: AppTheme.xs,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                statusIcon,
                                color: statusColor,
                                size: 16,
                              ),
                              const SizedBox(width: AppTheme.xs),
                              Text(
                                statusText,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: statusColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${subscription.amount ?? 0} FCFA',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.sm),
                    Text(
                      subscription.typeDisplayName ?? 'Mensuel',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppTheme.xs),
                    Text(
                      'Du ${_formatDate(subscription.startDate)} au ${_formatDate(subscription.calculatedEndDate)}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (isPending) ...[
            const SizedBox(height: AppTheme.md),
            CustomButton(
              text: 'Procéder au paiement',
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Fonctionnalité bientôt disponible'),
                  ),
                );
              },
              fullWidth: true,
            ),
          ] else if (isActive) ...[
            const SizedBox(height: AppTheme.md),
            Row(
              children: [
                Expanded(
                  child: CustomButton(
                    text: 'Voir les menus',
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité bientôt disponible'),
                        ),
                      );
                    },
                    backgroundColor: AppColors.secondary,
                  ),
                ),
                const SizedBox(width: AppTheme.md),
                Expanded(
                  child: CustomButton(
                    text: 'Historique',
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité bientôt disponible'),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ] else if (isExpired) ...[
            const SizedBox(height: AppTheme.md),
            CustomButton(
              text: 'Renouveler',
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Fonctionnalité bientôt disponible'),
                  ),
                );
              },
              fullWidth: true,
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'Date non définie';
    if (date is String) {
      try {
        final parsedDate = DateTime.parse(date);
        return '${parsedDate.day}/${parsedDate.month}/${parsedDate.year}';
      } catch (e) {
        return date;
      }
    }
    if (date is DateTime) {
      return '${date.day}/${date.month}/${date.year}';
    }
    return 'Date invalide';
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
              ),
              child: Icon(
                Icons.card_membership_outlined,
                color: AppColors.primary,
                size: 60,
              ),
            ),
            const SizedBox(height: AppTheme.xl),
            Text(
              'Aucun abonnement',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppTheme.md),
            Text(
              'Créez un abonnement pour que vos enfants puissent bénéficier des repas de la cantine.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
