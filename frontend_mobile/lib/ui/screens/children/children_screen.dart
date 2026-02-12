import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/child_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import 'add_child_screen.dart';
import 'child_details_screen.dart';

class ChildrenScreen extends StatefulWidget {
  const ChildrenScreen({super.key});

  @override
  State<ChildrenScreen> createState() => _ChildrenScreenState();
}

class _ChildrenScreenState extends State<ChildrenScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ChildProvider>(context, listen: false).fetchChildren();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mes Enfants'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const AddChildScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: Consumer<ChildProvider>(
        builder: (context, childProvider, _) {
          if (childProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (childProvider.errorMessage != null) {
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
                    childProvider.errorMessage!,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.error,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppTheme.md),
                  CustomButton(
                    text: 'Réessayer',
                    onPressed: () {
                      childProvider.clearError();
                      childProvider.fetchChildren();
                    },
                  ),
                ],
              ),
            );
          }

          final children = childProvider.children;
          final pendingChildren = childProvider.pendingChildren;
          final approvedChildren = childProvider.approvedChildren;

          if (children.isEmpty) {
            return _EmptyState(
              onAddChild: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const AddChildScreen(),
                  ),
                );
              },
            );
          }

          return RefreshIndicator(
            onRefresh: () => childProvider.refreshChildren(),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppTheme.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Enfants en attente
                  if (pendingChildren.isNotEmpty) ...[
                    Text(
                      'En attente de validation',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppTheme.md),
                    ...pendingChildren.map((child) => _ChildCard(
                      child: child,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => ChildDetailsScreen(child: child),
                          ),
                        );
                      },
                    )),
                    const SizedBox(height: AppTheme.xl),
                  ],

                  // Enfants approuvés
                  if (approvedChildren.isNotEmpty) ...[
                    Text(
                      'Enfants approuvés',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppTheme.md),
                    ...approvedChildren.map((child) => _ChildCard(
                      child: child,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => ChildDetailsScreen(child: child),
                          ),
                        );
                      },
                    )),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  final dynamic child;
  final VoidCallback onTap;

  const _ChildCard({
    required this.child,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isPending = child.status == 'PENDING';
    final isApproved = child.status == 'APPROVED';
    
    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.md),
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        boxShadow: AppColors.cardShadow,
        border: isPending 
            ? Border.all(color: AppColors.warning.withOpacity(0.3))
            : null,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: isPending 
                        ? AppColors.warning.withOpacity(0.1)
                        : AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  ),
                  child: Icon(
                    Icons.child_care,
                    color: isPending ? AppColors.warning : AppColors.primary,
                    size: 30,
                  ),
                ),
                const SizedBox(width: AppTheme.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              child.fullName ?? 'Nom Enfant',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          _StatusBadge(status: child.status),
                        ],
                      ),
                      const SizedBox(height: AppTheme.xs),
                      Text(
                        child.className ?? 'Classe',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppTheme.xs),
                      Text(
                        'Né(e) le ${child.dateOfBirth ?? ''}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: AppColors.textTertiary,
                  size: 16,
                ),
              ],
            ),
            if (isPending) ...[
              const SizedBox(height: AppTheme.md),
              Container(
                padding: const EdgeInsets.all(AppTheme.sm),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.pending_outlined,
                      color: AppColors.warning,
                      size: 16,
                    ),
                    const SizedBox(width: AppTheme.xs),
                    Text(
                      'En attente de validation par l\'administrateur',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.warning,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;
    String text;

    switch (status) {
      case 'PENDING':
        color = AppColors.warning;
        icon = Icons.pending_outlined;
        text = 'En attente';
        break;
      case 'APPROVED':
        color = AppColors.success;
        icon = Icons.check_circle_outline;
        text = 'Approuvé';
        break;
      case 'REJECTED':
        color = AppColors.error;
        icon = Icons.cancel_outlined;
        text = 'Rejeté';
        break;
      default:
        color = AppColors.textTertiary;
        icon = Icons.help_outline;
        text = 'Inconnu';
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.sm,
        vertical: AppTheme.xs,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: color,
            size: 12,
          ),
          const SizedBox(width: AppTheme.xs),
          Text(
            text,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAddChild;

  const _EmptyState({required this.onAddChild});

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
                Icons.child_care_outlined,
                color: AppColors.primary,
                size: 60,
              ),
            ),
            const SizedBox(height: AppTheme.xl),
            Text(
              'Aucun enfant ajouté',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppTheme.md),
            Text(
              'Ajoutez votre premier enfant pour commencer à utiliser l\'application',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppTheme.xl),
            CustomButton(
              text: 'Ajouter un enfant',
              onPressed: onAddChild,
              fullWidth: true,
            ),
          ],
        ),
      ),
    );
  }
}
