import 'package:flutter/material.dart';
import '../../data/models/child_model.dart';
import '../../data/models/subscription_model.dart';

class ChildCard extends StatelessWidget {
  final ChildModel child;
  final SubscriptionModel? subscription;
  final VoidCallback onTap;

  const ChildCard({
    super.key,
    required this.child,
    this.subscription,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      height: 200,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header avec dégradé
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF4CAF50), Color(0xFF66BB6A)],
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Column(
              children: [
                // Photo enfant
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    color: Colors.white.withOpacity(0.2),
                  ),
                  child: const Icon(
                    Icons.child_care,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 6),
                // Nom enfant
                Text(
                  child.fullName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                // Classe et école
                Text(
                  '${child.className}',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.white.withOpacity(0.9),
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Badge abonnement
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                _buildSubscriptionBadge(),
                const SizedBox(height: 8),
                // Stats rapides
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildQuickStat(Icons.restaurant_menu, 'Repas', '12'),
                    _buildQuickStat(Icons.calendar_today, 'Présence', '95%'),
                  ],
                ),
                const SizedBox(height: 8),
                // Bouton voir détails
                SizedBox(
                  width: double.infinity,
                  child: TextButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.arrow_forward, size: 14),
                    label: const Text('Voir détails', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFFF6F00),
                      padding: const EdgeInsets.symmetric(vertical: 4),
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

  Widget _buildSubscriptionBadge() {
    Color backgroundColor;
    Color textColor;
    String text;
    IconData icon;

    if (subscription == null) {
      backgroundColor = const Color(0xFFFFF8E1);
      textColor = const Color(0xFFF57C00);
      text = 'Aucun abonnement';
      icon = Icons.warning_amber_outlined;
    } else if (subscription!.isActive) {
      backgroundColor = const Color(0xFFE8F5E9);
      textColor = const Color(0xFF2E7D32);
      text = 'Abonnement actif';
      icon = Icons.check_circle;
    } else if (subscription!.isExpired) {
      backgroundColor = const Color(0xFFFFEBEE);
      textColor = const Color(0xFFC62828);
      text = 'Abonnement expiré';
      icon = Icons.cancel;
    } else {
      backgroundColor = const Color(0xFFFFF8E1);
      textColor = const Color(0xFFF57C00);
      text = 'En attente';
      icon = Icons.pending;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStat(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: Color(0xFF424242),
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}
