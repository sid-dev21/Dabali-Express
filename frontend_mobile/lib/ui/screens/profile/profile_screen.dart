import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../widgets/custom_button.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          final user = authProvider.currentUser;
          
          if (user == null) {
            return const Center(
              child: Text('Utilisateur non trouvé'),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppTheme.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppTheme.md),
                
                // Photo de profil
                Center(
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
                    ),
                    child: Icon(
                      Icons.person,
                      color: AppColors.primary,
                      size: 60,
                    ),
                  ),
                ),
                
                const SizedBox(height: AppTheme.xl),
                
                // Informations personnelles
                Text(
                  'Informations personnelles',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                
                const SizedBox(height: AppTheme.lg),
                
                // Carte d'informations
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    boxShadow: AppColors.cardShadow,
                  ),
                  child: Column(
                    children: [
                      _ProfileItem(
                        icon: Icons.person_outline,
                        label: 'Nom complet',
                        value: user.fullName ?? 'Non renseigné',
                      ),
                      const Divider(),
                      _ProfileItem(
                        icon: Icons.email_outlined,
                        label: 'Email',
                        value: user.email ?? '',
                      ),
                      const Divider(),
                      _ProfileItem(
                        icon: Icons.phone_outlined,
                        label: 'Téléphone',
                        value: user.phone ?? '',
                      ),
                      const Divider(),
                      _ProfileItem(
                        icon: Icons.school_outlined,
                        label: 'Rôle',
                        value: user.role ?? '',
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: AppTheme.xl),
                
                // Actions
                Text(
                  'Actions',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                
                const SizedBox(height: AppTheme.lg),
                
                CustomButton(
                  text: 'Modifier le profil',
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
                  text: 'Changer le mot de passe',
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
                
                const SizedBox(height: AppTheme.xl),
                
                // Bouton de déconnexion
                CustomButton(
                  text: 'Se déconnecter',
                  onPressed: () async {
                    await authProvider.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                        (route) => false,
                      );
                    }
                  },
                  backgroundColor: AppColors.error,
                  fullWidth: true,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ProfileItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.sm),
      child: Row(
        children: [
          Icon(
            icon,
            color: AppColors.textSecondary,
            size: 20,
          ),
          const SizedBox(width: AppTheme.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: AppTheme.xs),
                Text(
                  value,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
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
