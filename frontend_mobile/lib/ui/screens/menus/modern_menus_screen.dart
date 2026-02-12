import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../data/models/menu.dart';
import '../../../data/models/child.dart';
import '../../../providers/modern_child_provider.dart';
import '../../../providers/modern_menu_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../widgets/modern_button.dart';

class ModernMenusScreen extends StatefulWidget {
  const ModernMenusScreen({super.key});

  @override
  State<ModernMenusScreen> createState() => _ModernMenusScreenState();
}

class _ModernMenusScreenState extends State<ModernMenusScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _slideController;
  DateTime? _selectedDate;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _selectedDate = DateTime.now();
    _fadeController.forward();
    _slideController.forward();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Menus de la cantine',
          style: GoogleFonts.poppins(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(
          color: AppColors.textPrimary,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today, color: AppColors.textPrimary),
            onPressed: _selectDate,
          ),
        ],
      ),
      body: Consumer<ModernMenuProvider>(
        builder: (context, menuProvider, _) {
          final todayMenu = menuProvider.getMenuForDate(_selectedDate!);
          final upcomingMenus = menuProvider.getUpcomingMenus();

          return RefreshIndicator(
            onRefresh: _loadData,
            color: AppColors.primary,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppTheme.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header avec date sélectionnée
                  FadeTransition(
                    opacity: _fadeController,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, -0.3),
                        end: Offset.zero,
                      ).animate(CurvedAnimation(
                        parent: _slideController,
                        curve: Curves.easeOutCubic,
                      )),
                      child: _buildDateHeader(),
                    ),
                  ),

                  const SizedBox(height: AppTheme.xl),

                  // Menu du jour
                  FadeTransition(
                    opacity: _fadeController,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(-0.3, 0),
                        end: Offset.zero,
                      ).animate(CurvedAnimation(
                        parent: _slideController,
                        curve: Curves.easeOutCubic,
                      )),
                      child: _buildTodayMenu(todayMenu),
                    ),
                  ),

                  const SizedBox(height: AppTheme.xl),

                  // Menu à venir
                  if (upcomingMenus.isNotEmpty) ...[
                    FadeTransition(
                      opacity: _fadeController,
                      child: SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0.3, 0),
                          end: Offset.zero,
                        ).animate(CurvedAnimation(
                          parent: _slideController,
                          curve: Curves.easeOutCubic,
                        )),
                        child: _buildUpcomingMenus(upcomingMenus),
                      ),
                    ),
                  ],

                  const SizedBox(height: AppTheme.xl),

                  // Actions rapides
                  FadeTransition(
                    opacity: _fadeController,
                    child: _buildQuickActions(),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDateHeader() {
    return Container(
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.2),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.restaurant_menu,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: AppTheme.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Menu du',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
                Text(
                  _formatFullDate(_selectedDate!),
                  style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _isToday(_selectedDate!) ? 'Aujourd\'hui' : _getDayName(_selectedDate!),
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayMenu(Menu? menu) {
    if (menu == null) {
      return _buildNoMenuCard();
    }

    return Container(
      padding: const EdgeInsets.all(AppTheme.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppColors.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header du menu
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.lunch_dining,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: AppTheme.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Menu du jour',
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      menu.isAvailable ? 'Disponible' : 'Indisponible',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: menu.isAvailable ? AppColors.success : AppColors.error,
                      ),
                    ),
                  ],
                ),
              ),
              if (menu.isAvailable)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.check_circle,
                    color: AppColors.success,
                    size: 16,
                  ),
                ),
            ],
          ),

          const SizedBox(height: AppTheme.lg),

          // Plat principal
          _buildMenuItem(
            'Plat principal',
            menu.mainDish,
            Icons.restaurant,
            AppColors.primary,
          ),

          const SizedBox(height: AppTheme.md),

          // Accompagnements
          if (menu.sideDishes.isNotEmpty) ...[
            Text(
              'Accompagnements',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppTheme.sm),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: menu.sideDishes.map((sideDish) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.textTertiary.withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    sideDish,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: AppTheme.md),
          ],

          // Fruits
          if (menu.fruits.isNotEmpty) ...[
            _buildMenuItem(
              'Fruits',
              menu.fruits.join(', '),
              Icons.apple,
              AppColors.success,
            ),
            const SizedBox(height: AppTheme.md),
          ],

          // Boissons
          if (menu.drinks.isNotEmpty) ...[
            _buildMenuItem(
              'Boissons',
              menu.drinks.join(', '),
              Icons.local_cafe,
              AppColors.info,
            ),
          ],

          // Notes
          if (menu.notes != null && menu.notes!.isNotEmpty) ...[
            const SizedBox(height: AppTheme.md),
            Container(
              padding: const EdgeInsets.all(AppTheme.md),
              decoration: BoxDecoration(
                color: AppColors.info.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.info.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: AppColors.info,
                    size: 20,
                  ),
                  const SizedBox(width: AppTheme.sm),
                  Expanded(
                    child: Text(
                      menu.notes!,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.info,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuItem(String title, String content, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: color,
            size: 20,
          ),
        ),
        const SizedBox(width: AppTheme.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                content,
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNoMenuCard() {
    return Container(
      padding: const EdgeInsets.all(AppTheme.xl),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppColors.cardShadow,
      ),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.textTertiary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(40),
            ),
            child: Icon(
              Icons.no_food,
              color: AppColors.textTertiary,
              size: 40,
            ),
          ),
          const SizedBox(height: AppTheme.lg),
          Text(
            'Aucun menu prévu',
            style: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppTheme.sm),
          Text(
            'Pas de menu programmé pour cette date',
            style: GoogleFonts.inter(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingMenus(List<Menu> menus) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Menus à venir',
          style: GoogleFonts.poppins(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: AppTheme.lg),
        ...menus.take(3).map((menu) => Padding(
          padding: const EdgeInsets.only(bottom: AppTheme.md),
          child: _buildUpcomingMenuCard(menu),
        )),
        if (menus.length > 3) ...[
          const SizedBox(height: AppTheme.md),
          ModernButton(
            text: 'Voir tous les menus',
            onPressed: _viewAllMenus,
            backgroundColor: AppColors.secondary,
            fullWidth: true,
          ),
        ],
      ],
    );
  }

  Widget _buildUpcomingMenuCard(Menu menu) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppColors.cardShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.lunch_dining,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: AppTheme.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  menu.formattedDate,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  menu.mainDish,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSecondary,
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
    );
  }

  Widget _buildQuickActions() {
    return Consumer<ModernChildProvider>(
      builder: (context, childProvider, _) {
        final approvedChildren = childProvider.approvedChildren;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Actions rapides',
              style: GoogleFonts.poppins(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppTheme.lg),

            if (approvedChildren.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(AppTheme.lg),
                decoration: BoxDecoration(
                  color: AppColors.info.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.info.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: AppColors.info,
                      size: 20,
                    ),
                    const SizedBox(width: AppTheme.sm),
                    Expanded(
                      child: Text(
                        'Ajoutez des enfants pour voir leurs menus et gérer leurs repas',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppColors.info,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              Row(
                children: [
                  Expanded(
                    child: ModernButton(
                      text: 'Présences',
                      onPressed: _viewAttendance,
                      height: 56,
                    ),
                  ),
                  const SizedBox(width: AppTheme.md),
                  Expanded(
                    child: ModernButton(
                      text: 'Historique',
                      onPressed: _viewHistory,
                      height: 56,
                      backgroundColor: AppColors.secondary,
                    ),
                  ),
                ],
              ),
            ],
          ],
        );
      },
    );
  }

  // Méthodes utilitaires
  String _formatFullDate(DateTime date) {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    
    return '${days[date.weekday - 1]} ${date.day} ${months[date.month - 1]} ${date.year}';
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  String _getDayName(DateTime date) {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return days[date.weekday - 1];
  }

  // Actions
  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      final menuProvider = context.read<ModernMenuProvider>();
      await menuProvider.loadMenus();
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _selectDate() {
    showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    ).then((date) {
      if (date != null) {
        setState(() {
          _selectedDate = date;
        });
        _loadData();
      }
    });
  }

  void _viewAllMenus() {
    // TODO: Naviguer vers l'écran de tous les menus
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Tous les menus bientôt disponibles',
          style: GoogleFonts.inter(),
        ),
        backgroundColor: AppColors.info,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  void _viewAttendance() {
    // TODO: Naviger vers l'écran des présences
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Gestion des présences bientôt disponible',
          style: GoogleFonts.inter(),
        ),
        backgroundColor: AppColors.info,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  void _viewHistory() {
    // TODO: Naviger vers l'historique
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Historique des repas bientôt disponible',
          style: GoogleFonts.inter(),
        ),
        backgroundColor: AppColors.info,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
