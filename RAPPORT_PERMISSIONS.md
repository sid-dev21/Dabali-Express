# Rapport d'Analyse des Permissions - Application Dabali Express

## Résumé Exécutif

L'application **ne respecte pas complètement** les permissions définies dans le tableau de rôles. Plusieurs problèmes critiques ont été identifiés concernant l'accès aux ressources selon les rôles.

---

## Tableau de Référence des Permissions

| Rôle | Accès autorisés | Accès restreints |
|------|----------------|------------------|
| **PARENT** | Élèves, Abonnements, Paiements | Écoles, Menus, Présences |
| **SCHOOL_ADMIN** | Tout sauf Utilisateurs | Utilisateurs (SUPER_ADMIN) |
| **CANTEEN_MANAGER** | Menus, Présences, Élèves | Écoles, Paiements |
| **SUPER_ADMIN** | Tout | Rien |

---

## Analyse Détaillée par Rôle

### 🔴 PARENT

#### ❌ Problèmes Identifiés

1. **Frontend Web - Accès Bloqué**
   - Le rôle PARENT n'est **pas inclus** dans `NAV_ITEMS` (constants.tsx)
   - Les parents n'ont **aucun accès** à l'interface web
   - **Impact** : Les parents ne peuvent pas utiliser l'application web

2. **Backend - Accès Non Restreints**
   - ✅ **Élèves** : Accès autorisé (route `/api/students/parent/:parentId` existe)
   - ✅ **Abonnements** : Accès autorisé (pas de restriction, mais filtrage possible par `student_id`)
   - ✅ **Paiements** : Accès autorisé (pas de restriction, mais filtrage possible par `parent_id`)
   - ❌ **Écoles** : Accès **NON RESTREINT** - Route GET `/api/schools` accessible à tous les utilisateurs authentifiés
   - ❌ **Menus** : Accès **NON RESTREINT** - Route GET `/api/menus` accessible à tous les utilisateurs authentifiés
   - ❌ **Présences** : Accès **NON RESTREINT** - Route GET `/api/attendance` accessible à tous les utilisateurs authentifiés

#### ✅ Points Positifs
- Les routes pour les élèves, abonnements et paiements permettent un filtrage par parent_id/student_id

---

### 🟡 SCHOOL_ADMIN

#### ❌ Problèmes Identifiés

1. **Utilisateurs - Accès Non Bloqué**
   - ❌ **Pas de route `/api/users`** dans le backend
   - Le frontend a un composant `Users.tsx` mais utilise `mockApi`
   - **Impact** : Pas de contrôle d'accès réel pour la gestion des utilisateurs

2. **Écoles - Accès Non Restreint**
   - ✅ GET `/api/schools` : Accessible (conforme)
   - ✅ POST `/api/schools` : Restreint à SUPER_ADMIN (conforme)
   - ✅ DELETE `/api/schools/:id` : Restreint à SUPER_ADMIN (conforme)
   - ⚠️ PUT `/api/schools/:id` : **Accessible à tous** (devrait être restreint à SUPER_ADMIN ou SCHOOL_ADMIN pour leur propre école)

3. **Autres Ressources**
   - ✅ Élèves : Accès autorisé (conforme)
   - ✅ Menus : Accès autorisé (conforme)
   - ✅ Présences : Accès autorisé (conforme)
   - ✅ Abonnements : Accès autorisé (conforme)
   - ✅ Paiements : Accès autorisé (conforme)

---

### 🟡 CANTEEN_MANAGER

#### ❌ Problèmes Identifiés

1. **Paiements - Accès Non Restreint**
   - ❌ **Toutes les routes de paiements** sont accessibles à tous les utilisateurs authentifiés
   - GET `/api/payments` : Accessible (devrait être restreint)
   - POST `/api/payments` : Accessible (devrait être restreint)
   - **Impact** : Le CANTEEN_MANAGER peut voir et créer des paiements alors qu'il ne devrait pas

2. **Écoles - Accès Non Restreint**
   - ❌ GET `/api/schools` : Accessible à tous (devrait être restreint pour CANTEEN_MANAGER)

3. **Autres Ressources**
   - ✅ Menus : Accès autorisé (conforme)
   - ✅ Présences : Accès autorisé (conforme)
   - ✅ Élèves : Accès autorisé (conforme)

---

### 🟢 SUPER_ADMIN

#### ✅ Statut
- Accès complet à toutes les ressources
- Restrictions correctement implémentées pour les autres rôles

---

## Problèmes Généraux

### 1. **Absence de Middleware de Contrôle d'Accès Granulaire**
- Le middleware `requireRole` existe mais n'est pas utilisé partout
- Beaucoup de routes n'ont que `authMiddleware` sans vérification de rôle

### 2. **Routes Sans Restrictions**
Les routes suivantes sont accessibles à **tous les utilisateurs authentifiés** sans distinction de rôle :

| Route | Problème | Rôles Affectés |
|-------|----------|----------------|
| `GET /api/schools` | Accessible à tous | PARENT, CANTEEN_MANAGER ne devraient pas y avoir accès |
| `GET /api/menus` | Accessible à tous | PARENT ne devrait pas y avoir accès |
| `GET /api/attendance` | Accessible à tous | PARENT ne devrait pas y avoir accès |
| `GET /api/payments` | Accessible à tous | CANTEEN_MANAGER ne devrait pas y avoir accès |
| `POST /api/payments` | Accessible à tous | CANTEEN_MANAGER ne devrait pas y avoir accès |
| `GET /api/students` | Accessible à tous | Devrait être restreint selon le rôle |
| `GET /api/subscriptions` | Accessible à tous | Devrait être restreint selon le rôle |

### 3. **Frontend - Filtrage par Rôle**
- Le frontend filtre correctement les éléments de navigation (`Sidebar.tsx`)
- Mais le backend ne bloque pas les requêtes directes aux API
- **Risque** : Un utilisateur peut contourner les restrictions frontend en appelant directement les API

---

## Recommandations

### 🔴 Priorité Haute

1. **Ajouter des restrictions de rôle sur les routes backend**
   ```javascript
   // Exemple pour les écoles
   router.get('/', requireRole(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN), getAllSchools);
   
   // Exemple pour les menus
   router.get('/', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), getAllMenus);
   
   // Exemple pour les paiements
   router.get('/', requireRole(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT), getAllPayments);
   ```

2. **Créer une route Utilisateurs avec restriction SUPER_ADMIN**
   ```javascript
   router.use('/api/users', authMiddleware);
   router.get('/', requireRole(UserRole.SUPER_ADMIN), getAllUsers);
   ```

3. **Ajouter le rôle PARENT au frontend**
   - Inclure PARENT dans `NAV_ITEMS` avec les sections appropriées
   - Créer une interface adaptée pour les parents

### 🟡 Priorité Moyenne

4. **Restreindre l'accès aux élèves selon le rôle**
   - PARENT : Seulement ses propres enfants
   - SCHOOL_ADMIN : Élèves de son école
   - CANTEEN_MANAGER : Élèves de son école
   - SUPER_ADMIN : Tous les élèves

5. **Restreindre l'accès aux abonnements selon le rôle**
   - PARENT : Abonnements de ses enfants
   - SCHOOL_ADMIN : Abonnements de son école
   - CANTEEN_MANAGER : Abonnements de son école
   - SUPER_ADMIN : Tous les abonnements

6. **Restreindre l'accès aux paiements selon le rôle**
   - PARENT : Paiements de ses enfants
   - SCHOOL_ADMIN : Paiements de son école
   - SUPER_ADMIN : Tous les paiements
   - CANTEEN_MANAGER : **Aucun accès**

### 🟢 Priorité Basse

7. **Améliorer le contrôle d'accès dans les contrôleurs**
   - Ajouter des vérifications supplémentaires dans les contrôleurs
   - Vérifier que SCHOOL_ADMIN ne peut modifier que son école
   - Vérifier que PARENT ne peut voir que ses enfants

---

## Conclusion

L'application nécessite des **corrections importantes** pour respecter le tableau de permissions défini. Les principaux problèmes sont :

1. ❌ Absence de restrictions de rôle sur plusieurs routes backend
2. ❌ PARENT n'a pas accès au frontend web
3. ❌ CANTEEN_MANAGER a accès aux paiements alors qu'il ne devrait pas
4. ❌ PARENT a accès aux écoles, menus et présences alors qu'il ne devrait pas
5. ❌ Pas de route Utilisateurs dans le backend

**Note** : Le filtrage frontend existe mais ne suffit pas car les API backend sont accessibles directement sans restrictions appropriées.
