import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/child_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/menu.dart';
import '../../../data/models/child_model.dart';
import '../../../data/models/subscription_model.dart';
import '../../../data/services/menu_service.dart';
import '../../../data/services/modern_api_service.dart';
import '../children/add_child_screen.dart';
import '../payments/payment_screen.dart';
import '../profile/profile_screen.dart';
import '../notifications/notifications_screen.dart';
import '../menus/menus_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late final MenuService _menuService;
  bool _isLoading = true;
  bool _isLoadingMenu = false;
  String? _menuError;
  Menu? _todayMenu;
  String? _lastMenuNotifiedId;

  @override
  void initState() {
    super.initState();
    _menuService = MenuService(ModernApiService());
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _loadData();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    
    try {
      // Charger les données des enfants et abonnements
      await Future.wait([
        context.read<ChildProvider>().fetchChildren(),
        context.read<SubscriptionProvider>().fetchSubscriptions(),
      ]);

      final children = context.read<ChildProvider>().children;
      String? schoolId;
      if (children.isNotEmpty) {
        final preferredChild = children.firstWhere(
          (child) => child.isApproved,
          orElse: () => children.first,
        );
        schoolId = preferredChild.schoolId;
      }
      await _loadTodayMenu(schoolId);
    } catch (e) {
      // Gérer l'erreur silencieusement pour l'instant
      _menuError = 'Impossible de charger le menu du jour';
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _fadeController.forward();
        _slideController.forward();
      }
    }
  }

  Future<void> _refreshData() async {
    setState(() {
      _isLoading = true;
    });
    await _loadData();
  }

  Future<void> _loadTodayMenu(String? schoolId) async {
    if (!mounted) return;
    setState(() {
      _isLoadingMenu = true;
      _menuError = null;
    });

    try {
      final response = await _menuService.getTodayMenu(schoolId: schoolId);
      if (response.success && response.data != null) {
        setState(() {
          _todayMenu = response.data;
        });

        if (mounted && _todayMenu?.id.isNotEmpty == true && _todayMenu?.id != _lastMenuNotifiedId) {
          _lastMenuNotifiedId = _todayMenu?.id;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Le menu du jour est disponible.'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } else {
        setState(() {
          _todayMenu = null;
          _menuError = response.message ?? 'Aucun menu validé pour aujourd\'hui';
        });
      }
    } catch (_) {
      setState(() {
        _todayMenu = null;
        _menuError = 'Aucun menu validé pour aujourd\'hui';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingMenu = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final childProvider = context.watch<ChildProvider>();
    final subscriptionProvider = context.watch<SubscriptionProvider>();
    
    final user = authProvider.currentUser;
    final children = childProvider.children;
    final knownChildIds = children.map((child) => child.id).toSet();
    final subscriptions = subscriptionProvider.subscriptions
        .where((sub) => knownChildIds.contains(sub.childId))
        .toList();
    final activeSubscriptions = _groupActiveSubscriptionsByChild(
      subscriptions.where((s) => s.isActive).toList(),
    );
    final pendingSubscriptions = subscriptions.where((s) => s.isPendingPayment).toList();
    final expiredSubscriptions = subscriptions.where((s) => s.isExpired).toList();
    final monthlyEstimatedCost = subscriptions.fold<double>(
      0,
      (sum, sub) => sum + _estimateMonthlyCost(sub),
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _refreshData,
        color: AppColors.primary,
        child: _isLoading
            ? _buildLoadingState()
            : CustomScrollView(
                slivers: [
                  // Header moderne avec animation
                  SliverToBoxAdapter(
                    child: FadeTransition(
                      opacity: _fadeController,
                      child: SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0, -0.3),
                          end: Offset.zero,
                        ).animate(CurvedAnimation(
                          parent: _slideController,
                          curve: Curves.easeOutCubic,
                        )),
                        child: _buildModernHeader(
                          userName: user?.fullName ?? 'Parent',
                          activeChildren: activeSubscriptions.length,
                          pendingPayments: pendingSubscriptions.length,
                        ),
                      ),
                    ),
                  ),
                  
                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                  
                  // Section Menu du Jour
                  SliverToBoxAdapter(
                    child: FadeTransition(
                      opacity: _fadeController,
                      child: _buildModernSectionHeader(
                        'Menu du jour',
                        'Voir la semaine',
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const MenusScreen()),
                        ),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: FadeTransition(
                      opacity: _fadeController,
                      child: _buildModernMenuCard(),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 32)),

                  SliverToBoxAdapter(
                    child: FadeTransition(
                      opacity: _fadeController,
                      child: _buildModernSectionHeader('Abonnement', null, null),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: FadeTransition(
                      opacity: _fadeController,
                      child: _buildSubscriptionsOverviewCard(
                        children: children,
                        activeSubscriptions: activeSubscriptions,
                        pendingSubscriptions: pendingSubscriptions,
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                  
                  // Section Actions Rapides
                  SliverToBoxAdapter(
                    child: FadeTransition(
                      opacity: _fadeController,
                      child: _buildModernSectionHeader('Actions rapides', null, null),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: FadeTransition(
                      opacity: _fadeController,
                      child: _buildModernQuickActions(),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                  
                  // Section Statistiques
                  if (children.isNotEmpty) ...[
                    SliverToBoxAdapter(
                      child: FadeTransition(
                        opacity: _fadeController,
                        child: _buildModernSectionHeader('Statistiques', null, null),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: FadeTransition(
                        opacity: _fadeController,
                        child: _buildModernStats(
                          activeSubscriptions: activeSubscriptions.length,
                          expiredSubscriptions: expiredSubscriptions.length,
                          monthlyCost: monthlyEstimatedCost,
                        ),
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 32)),
                  ],
                ],
              ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: CircularProgressIndicator(
        color: AppColors.primary,
      ),
    );
  }

  Widget _buildModernHeader({
    required String userName,
    required int activeChildren,
    required int pendingPayments,
  }) {
    final headerDate =
        _todayMenu?.formattedDate ?? DateFormat('dd/MM/yyyy').format(DateTime.now());

    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withOpacity(0.45),
            blurRadius: 28,
            spreadRadius: -14,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.person,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bonjour,',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                    Text(
                      userName,
                      style: GoogleFonts.poppins(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                headerDate,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _buildHeaderStat(
                  'Enfants actifs',
                  activeChildren.toString(),
                  Icons.child_care,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildHeaderStat(
                  'Paiements en attente',
                  pendingPayments.toString(),
                  Icons.payment,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderStat(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: Colors.white.withOpacity(0.9),
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
                Text(
                  value,
                  style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernSectionHeader(String title, String? action, VoidCallback? onAction) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.textStrong,
            ),
          ),
          if (action != null && onAction != null)
            GestureDetector(
              onTap: onAction,
              child: Text(
                action,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondaryDark,
                ),
              ),
            ),
        ],
      ),
    );
  }

  BoxDecoration _surfaceDecoration({double radius = 20}) {
    return BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: AppColors.border),
      boxShadow: AppColors.cardShadow,
    );
  }

  Widget _buildModernMenuCard() {
    if (_isLoadingMenu) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.all(20),
        decoration: _surfaceDecoration(),
        child: Row(
          children: [
            const CircularProgressIndicator(color: AppColors.primary),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                'Chargement du menu du jour...',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (_todayMenu == null) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.all(20),
        decoration: _surfaceDecoration(),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.info_outline,
                color: AppColors.warning,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                _menuError ?? 'Aucun menu validé pour aujourd\'hui',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      );
    }

    final menu = _todayMenu!;
    final accompaniments = [
      ...menu.sideDishes,
      ...menu.fruits,
      ...menu.drinks,
    ].where((item) => item.trim().isNotEmpty).toList();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(20),
      decoration: _surfaceDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.restaurant_menu,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Menu du jour',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      menu.mainDish.isNotEmpty ? menu.mainDish : 'Menu validé',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Accompagnements',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  accompaniments.isNotEmpty ? accompaniments.join(', ') : 'Aucun accompagnement renseigné',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernQuickActions() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildQuickActionCard(
                  'Ajouter un enfant',
                  Icons.add_circle,
                  AppColors.secondaryDark,
                  () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AddChildScreen()),
                    );
                    if (mounted) {
                      await context.read<ChildProvider>().refreshChildren();
                    }
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildQuickActionCard(
                  'Paiements',
                  Icons.payment,
                  AppColors.primary,
                  () async {
                    final subscriptionProvider = context.read<SubscriptionProvider>();
                    final pending = subscriptionProvider.pendingSubscriptions;
                    if (pending.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Aucun paiement en attente pour le moment'),
                        ),
                      );
                      return;
                    }
                    final subscription = pending.first;
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PaymentScreen(
                          subscriptionId: subscription.id,
                          amount: subscription.amount,
                          childId: subscription.childId,
                          onPressed: () {
                            Navigator.of(context).pop();
                          },
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildQuickActionCard(
                  'Notifications',
                  Icons.notifications,
                  AppColors.warning,
                  () async {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                    );
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildQuickActionCard(
                  'Paramètres',
                  Icons.settings,
                  AppColors.info,
                  () async {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard(String title, IconData icon, Color color, Future<void> Function() onTap) {
    return GestureDetector(
      onTap: () {
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: _surfaceDecoration(radius: 16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                border: Border.all(color: color.withOpacity(0.2)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModernStats({
    required int activeSubscriptions,
    required int expiredSubscriptions,
    required double monthlyCost,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(20),
      decoration: _surfaceDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Apercu du mois',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _buildStatItem(
                  'Actifs',
                  activeSubscriptions.toString(),
                  Icons.restaurant,
                  AppColors.success,
                ),
              ),
              Expanded(
                child: _buildStatItem(
                  'Expires',
                  expiredSubscriptions.toString(),
                  Icons.check_circle,
                  AppColors.info,
                ),
              ),
              Expanded(
                child: _buildStatItem(
                  'Cout mensuel',
                  _formatAmount(monthlyCost),
                  Icons.attach_money,
                  AppColors.warning,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: color,
            size: 24,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  List<SubscriptionModel> _groupActiveSubscriptionsByChild(
    List<SubscriptionModel> activeSubscriptions,
  ) {
    if (activeSubscriptions.isEmpty) return [];

    final groupedByChild = <String, SubscriptionModel>{};
    for (final subscription in activeSubscriptions) {
      if (subscription.childId.isEmpty) continue;
      final current = groupedByChild[subscription.childId];
      if (current == null || subscription.endDate.isAfter(current.endDate)) {
        groupedByChild[subscription.childId] = subscription;
      }
    }

    final result = groupedByChild.values.toList()
      ..sort((a, b) => a.endDate.compareTo(b.endDate));
    return result;
  }

  double _estimateMonthlyCost(SubscriptionModel subscription) {
    switch (subscription.type) {
      case SubscriptionType.monthly:
        return subscription.amount;
      case SubscriptionType.quarterly:
        return subscription.amount / 3;
      case SubscriptionType.yearly:
        return subscription.amount / 12;
    }
  }

  String _formatAmount(double amount) {
    final formatter = NumberFormat.decimalPattern('fr_FR');
    return '${formatter.format(amount.round())} FCFA';
  }

  String _formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy').format(date);
  }

  Widget _buildSubscriptionsOverviewCard({
    required List<ChildModel> children,
    required List<SubscriptionModel> activeSubscriptions,
    required List<SubscriptionModel> pendingSubscriptions,
  }) {
    final childById = <String, ChildModel>{
      for (final child in children) child.id: child,
    };

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(20),
      decoration: _surfaceDecoration(),
      child: activeSubscriptions.isEmpty
          ? Text(
              pendingSubscriptions.isEmpty
                  ? 'Aucun abonnement actif pour le moment.'
                  : 'Aucun abonnement actif. ${pendingSubscriptions.length} paiement(s) en attente.',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...activeSubscriptions.asMap().entries.map((entry) {
                  final index = entry.key;
                  final subscription = entry.value;
                  final child = childById[subscription.childId];

                  return Padding(
                    padding: EdgeInsets.only(
                      bottom: index == activeSubscriptions.length - 1 ? 0 : 12,
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.info.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.badge_outlined,
                                color: AppColors.info,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                child?.fullName ?? 'Enfant non trouve',
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Expiration: ${_formatDate(subscription.endDate)}',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                            Text(
                              subscription.typeDisplayName,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        if (index < activeSubscriptions.length - 1)
                          const Padding(
                            padding: EdgeInsets.only(top: 12),
                            child: Divider(height: 1, color: AppColors.border),
                          ),
                      ],
                    ),
                  );
                }),
                if (pendingSubscriptions.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    '${pendingSubscriptions.length} paiement(s) en attente',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.warning,
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}
